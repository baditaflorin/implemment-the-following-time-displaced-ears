/// <reference lib="webworker" />

import { fft, ifft, makeSqrtHannWindow } from '../lib/fft';

// STFT-based spectral processor.
//
// Modes
//   0 — bypass: input passes through unchanged
//   1 — freeze: on receiving a `freeze` message, capture the current frame's
//       magnitudes and emit them indefinitely with phase advanced per frame
//       at the bin's natural frequency. Effectively sustains a chord of the
//       audio at the moment of capture.
//   2 — smear: low-pass filter magnitudes across frames (time-averaging
//       the spectrum). Phase is left as-is. Sounds like a slow reverb tail.
//
// FFT_SIZE chosen as a compromise between frequency resolution (better at
// large sizes) and latency (worse at large sizes). 1024 at 48 kHz = ~21 ms.
// HOP_SIZE = FFT_SIZE / 2 gives 50% overlap which is the COLA point for
// sqrt-Hann.

const FFT_SIZE = 1024;
const HOP_SIZE = 512;

const MODE_BYPASS = 0;
const MODE_FREEZE = 1;
const MODE_SMEAR = 2;

class SpectralProcessor extends AudioWorkletProcessor {
  private readonly window: Float32Array;
  private readonly inRing: Float32Array;
  private readonly outRing: Float32Array;
  private readonly frameRe: Float32Array;
  private readonly frameIm: Float32Array;

  private inWriteIdx = 0;
  private outReadIdx = 0;
  private hopCount = 0;
  private mode = MODE_BYPASS;

  private frozenMag: Float32Array | null = null;
  private freezePending = false;
  private samplesIn = 0;
  private framePhase: Float32Array;
  private smearedMag: Float32Array;
  private readonly smearCoeff = 0.85;

  constructor(options?: { processorOptions?: { mode?: number; autoFreeze?: boolean } }) {
    super();
    this.window = makeSqrtHannWindow(FFT_SIZE);
    this.inRing = new Float32Array(FFT_SIZE);
    this.outRing = new Float32Array(FFT_SIZE);
    this.frameRe = new Float32Array(FFT_SIZE);
    this.frameIm = new Float32Array(FFT_SIZE);
    this.framePhase = new Float32Array(FFT_SIZE / 2 + 1);
    this.smearedMag = new Float32Array(FFT_SIZE / 2 + 1);

    // Mode and auto-freeze can be set at construction time. This is used by
    // OfflineAudioContext-based DSP tests, where port messages don't reliably
    // flush during synchronous rendering.
    const po = options?.processorOptions;
    if (po) {
      if (typeof po.mode === 'number') this.mode = po.mode;
      if (po.autoFreeze) this.freezePending = true;
    }

    this.port.onmessage = (ev: MessageEvent): void => {
      const m = ev.data as { type?: string; mode?: number };
      if (!m || typeof m !== 'object') return;
      if (m.type === 'mode' && typeof m.mode === 'number') {
        this.mode = m.mode;
        if (this.mode !== MODE_FREEZE) this.frozenMag = null;
        if (this.mode !== MODE_SMEAR) this.smearedMag.fill(0);
      } else if (m.type === 'freeze') {
        this.freezePending = true;
      } else if (m.type === 'release') {
        this.frozenMag = null;
      }
    };
  }

  override process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    _params: Record<string, Float32Array>,
  ): boolean {
    const output = outputs[0];
    if (!output || output.length === 0) return true;
    const outChan = output[0];
    if (!outChan) return true;

    const inChan = inputs[0] && inputs[0]!.length > 0 ? inputs[0]![0] : undefined;
    const frames = outChan.length;

    if (this.mode === MODE_BYPASS) {
      if (inChan) outChan.set(inChan);
      else outChan.fill(0);
      for (let c = 1; c < output.length; c++) {
        const oc = output[c];
        if (oc) oc.set(outChan);
      }
      return true;
    }

    for (let n = 0; n < frames; n++) {
      const s = inChan ? (inChan[n] ?? 0) : 0;
      this.inRing[this.inWriteIdx] = s;
      this.inWriteIdx = (this.inWriteIdx + 1) % FFT_SIZE;
      if (this.samplesIn < FFT_SIZE) this.samplesIn++;

      outChan[n] = this.outRing[this.outReadIdx] ?? 0;
      this.outRing[this.outReadIdx] = 0;
      this.outReadIdx = (this.outReadIdx + 1) % FFT_SIZE;

      this.hopCount++;
      if (this.hopCount >= HOP_SIZE) {
        this.hopCount = 0;
        this.runFrame();
      }
    }

    for (let c = 1; c < output.length; c++) {
      const oc = output[c];
      if (oc) oc.set(outChan);
    }
    return true;
  }

  private runFrame(): void {
    const N = FFT_SIZE;
    const half = N >> 1;
    const w = this.window;
    const re = this.frameRe;
    const im = this.frameIm;

    // Copy inRing into re[] starting at the oldest sample (inWriteIdx),
    // applying the analysis window.
    for (let i = 0; i < N; i++) {
      const idx = (this.inWriteIdx + i) % N;
      re[i] = (this.inRing[idx] ?? 0) * (w[i] ?? 0);
      im[i] = 0;
    }
    fft(re, im);

    // Apply the spectral effect.
    if (this.mode === MODE_FREEZE) {
      // Skip the first FFT(s) — until the input ring is fully populated.
      // Otherwise the captured spectrum is biased by the half-zero window.
      if (this.freezePending && this.samplesIn >= FFT_SIZE) {
        this.frozenMag = new Float32Array(half + 1);
        for (let k = 0; k <= half; k++) {
          this.frozenMag[k] = Math.hypot(re[k]!, im[k]!);
        }
        this.framePhase.fill(0);
        this.freezePending = false;
      }
      if (this.frozenMag) {
        const mags = this.frozenMag;
        for (let k = 0; k <= half; k++) {
          // Advance bin k's phase by 2π · k · HOP / N per frame (natural
          // frequency of bin k applied over one hop).
          this.framePhase[k] = (this.framePhase[k] ?? 0) + (2 * Math.PI * k * HOP_SIZE) / N;
          const ph = this.framePhase[k]!;
          const mag = mags[k] ?? 0;
          re[k] = mag * Math.cos(ph);
          im[k] = mag * Math.sin(ph);
          if (k > 0 && k < half) {
            // Maintain Hermitian symmetry (real-input invariant).
            re[N - k] = re[k]!;
            im[N - k] = -im[k]!;
          }
        }
      }
    } else if (this.mode === MODE_SMEAR) {
      const a = this.smearCoeff;
      for (let k = 0; k <= half; k++) {
        const curMag = Math.hypot(re[k]!, im[k]!);
        const smoothed = a * (this.smearedMag[k] ?? 0) + (1 - a) * curMag;
        this.smearedMag[k] = smoothed;
        const scale = curMag > 1e-9 ? smoothed / curMag : 0;
        re[k] = re[k]! * scale;
        im[k] = im[k]! * scale;
        if (k > 0 && k < half) {
          re[N - k] = re[k]!;
          im[N - k] = -im[k]!;
        }
      }
    }

    ifft(re, im);

    // Synthesis window + overlap-add into outRing.
    for (let i = 0; i < N; i++) {
      const idx = (this.outReadIdx + i) % N;
      this.outRing[idx] = (this.outRing[idx] ?? 0) + re[i]! * (w[i] ?? 0);
    }
  }
}

registerProcessor('spectral', SpectralProcessor);
