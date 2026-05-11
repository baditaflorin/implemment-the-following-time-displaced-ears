import pitchShifterWorkletUrl from './worklets/pitch-shifter.worklet?worker&url';
import tapWorkletUrl from './worklets/tap.worklet?worker&url';
import spectralWorkletUrl from './worklets/spectral.worklet?worker&url';

export type EngineState = 'idle' | 'starting' | 'running' | 'error';

export type SpectralMode = 'bypass' | 'freeze' | 'smear';

const SPECTRAL_MODE_VALUE: Record<SpectralMode, number> = {
  bypass: 0,
  freeze: 1,
  smear: 2,
};

export interface EngineParams {
  delaySeconds: number;
  pitchRatio: number;
  highpassHz: number;
  lowpassHz: number;
  dryWet: number;
  outputGain: number;
  spectralMode: SpectralMode;
}

export interface EngineCallbacks {
  onState?: (state: EngineState, info?: string) => void;
  onLevel?: (rms: number) => void;
}

export const DEFAULT_PARAMS: EngineParams = {
  delaySeconds: 7,
  pitchRatio: 1,
  highpassHz: 20,
  lowpassHz: 18000,
  dryWet: 1,
  outputGain: 0.9,
  spectralMode: 'bypass',
};

export const MAX_DELAY_SECONDS = 30;

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private delay: DelayNode | null = null;
  private highpass: BiquadFilterNode | null = null;
  private lowpass: BiquadFilterNode | null = null;
  private pitch: AudioWorkletNode | null = null;
  private spectral: AudioWorkletNode | null = null;
  private dryGain: GainNode | null = null;
  private wetGain: GainNode | null = null;
  private outGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private levelTimer: number | null = null;
  private state: EngineState = 'idle';

  constructor(private readonly cb: EngineCallbacks = {}) {}

  getState(): EngineState {
    return this.state;
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  getContext(): AudioContext | null {
    return this.ctx;
  }

  getSourceNode(): MediaStreamAudioSourceNode | null {
    return this.source;
  }

  async start(initial: EngineParams = DEFAULT_PARAMS): Promise<void> {
    if (this.state === 'running' || this.state === 'starting') return;
    this.setState('starting');
    try {
      const ctx = new AudioContext({ latencyHint: 'interactive' });
      this.ctx = ctx;

      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1,
        },
        video: false,
      });

      await ctx.audioWorklet.addModule(pitchShifterWorkletUrl);
      await ctx.audioWorklet.addModule(tapWorkletUrl);
      await ctx.audioWorklet.addModule(spectralWorkletUrl);

      this.source = ctx.createMediaStreamSource(this.stream);

      this.highpass = ctx.createBiquadFilter();
      this.highpass.type = 'highpass';
      this.highpass.frequency.value = initial.highpassHz;
      this.highpass.Q.value = 0.707;

      this.lowpass = ctx.createBiquadFilter();
      this.lowpass.type = 'lowpass';
      this.lowpass.frequency.value = initial.lowpassHz;
      this.lowpass.Q.value = 0.707;

      this.delay = ctx.createDelay(MAX_DELAY_SECONDS);
      this.delay.delayTime.value = initial.delaySeconds;

      this.pitch = new AudioWorkletNode(ctx, 'pitch-shifter', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
        parameterData: { pitchRatio: initial.pitchRatio },
      });

      this.spectral = new AudioWorkletNode(ctx, 'spectral', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
      });
      this.spectral.port.postMessage({
        type: 'mode',
        mode: SPECTRAL_MODE_VALUE[initial.spectralMode],
      });

      this.dryGain = ctx.createGain();
      this.dryGain.gain.value = 1 - initial.dryWet;
      this.wetGain = ctx.createGain();
      this.wetGain.gain.value = initial.dryWet;
      this.outGain = ctx.createGain();
      this.outGain.gain.value = initial.outputGain;

      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.75;

      this.source.connect(this.highpass);
      this.highpass.connect(this.lowpass);

      this.lowpass.connect(this.delay);
      this.delay.connect(this.pitch);
      this.pitch.connect(this.spectral);
      this.spectral.connect(this.wetGain);

      this.lowpass.connect(this.dryGain);

      this.dryGain.connect(this.outGain);
      this.wetGain.connect(this.outGain);

      this.outGain.connect(this.analyser);
      this.outGain.connect(ctx.destination);

      this.startLevelLoop();
      this.setState('running');
    } catch (err) {
      this.setState('error', err instanceof Error ? err.message : String(err));
      await this.stop();
      throw err;
    }
  }

  async stop(): Promise<void> {
    if (this.levelTimer !== null) {
      cancelAnimationFrame(this.levelTimer);
      this.levelTimer = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    try {
      this.source?.disconnect();
      this.highpass?.disconnect();
      this.lowpass?.disconnect();
      this.delay?.disconnect();
      this.pitch?.disconnect();
      this.spectral?.disconnect();
      this.dryGain?.disconnect();
      this.wetGain?.disconnect();
      this.outGain?.disconnect();
      this.analyser?.disconnect();
    } catch {
      // disconnect on a never-connected node throws; ignore
    }
    this.source = null;
    this.highpass = null;
    this.lowpass = null;
    this.delay = null;
    this.pitch = null;
    this.spectral = null;
    this.dryGain = null;
    this.wetGain = null;
    this.outGain = null;
    this.analyser = null;

    if (this.ctx && this.ctx.state !== 'closed') {
      await this.ctx.close();
    }
    this.ctx = null;
    this.setState('idle');
  }

  setDelaySeconds(seconds: number): void {
    if (!this.ctx || !this.delay) return;
    const clamped = Math.max(0, Math.min(MAX_DELAY_SECONDS, seconds));
    this.delay.delayTime.setTargetAtTime(clamped, this.ctx.currentTime, 0.02);
  }

  setPitchRatio(ratio: number): void {
    if (!this.ctx || !this.pitch) return;
    const clamped = Math.max(0.125, Math.min(4, ratio));
    const param = this.pitch.parameters.get('pitchRatio');
    if (param) param.setTargetAtTime(clamped, this.ctx.currentTime, 0.02);
  }

  setHighpassHz(hz: number): void {
    if (!this.ctx || !this.highpass) return;
    this.highpass.frequency.setTargetAtTime(hz, this.ctx.currentTime, 0.02);
  }

  setLowpassHz(hz: number): void {
    if (!this.ctx || !this.lowpass) return;
    this.lowpass.frequency.setTargetAtTime(hz, this.ctx.currentTime, 0.02);
  }

  setDryWet(wet: number): void {
    if (!this.ctx || !this.dryGain || !this.wetGain) return;
    const w = Math.max(0, Math.min(1, wet));
    this.dryGain.gain.setTargetAtTime(1 - w, this.ctx.currentTime, 0.02);
    this.wetGain.gain.setTargetAtTime(w, this.ctx.currentTime, 0.02);
  }

  setOutputGain(g: number): void {
    if (!this.ctx || !this.outGain) return;
    this.outGain.gain.setTargetAtTime(Math.max(0, Math.min(2, g)), this.ctx.currentTime, 0.02);
  }

  setSpectralMode(mode: SpectralMode): void {
    if (!this.spectral) return;
    this.spectral.port.postMessage({ type: 'mode', mode: SPECTRAL_MODE_VALUE[mode] });
  }

  freezeSpectrum(): void {
    if (!this.spectral) return;
    this.spectral.port.postMessage({ type: 'freeze' });
  }

  releaseSpectrum(): void {
    if (!this.spectral) return;
    this.spectral.port.postMessage({ type: 'release' });
  }

  // Capture audio from the post-filter, pre-delay path for offline analysis.
  // Returns a function that yields the captured Float32Array (mono).
  captureRawInput(durationSec: number): Promise<Float32Array> {
    if (!this.ctx || !this.lowpass) {
      return Promise.reject(new Error('engine not running'));
    }
    const ctx = this.ctx;
    const tap = new AudioWorkletNode(ctx, 'tap', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
    });
    const sink = ctx.createGain();
    sink.gain.value = 0;
    this.lowpass.connect(tap);
    tap.connect(sink);
    sink.connect(ctx.destination);

    const chunks: Float32Array[] = [];
    const target = Math.floor(durationSec * ctx.sampleRate);
    let collected = 0;

    return new Promise<Float32Array>((resolve, reject) => {
      const timeout = setTimeout(
        () => {
          cleanup();
          reject(new Error('capture timed out'));
        },
        (durationSec + 2) * 1000,
      );

      const cleanup = (): void => {
        clearTimeout(timeout);
        try {
          tap.port.postMessage({ type: 'set', active: false });
          tap.disconnect();
          sink.disconnect();
        } catch {
          // ignore
        }
      };

      tap.port.onmessage = (ev: MessageEvent): void => {
        const data = ev.data as Float32Array;
        if (!(data instanceof Float32Array)) return;
        const need = target - collected;
        if (need <= 0) return;
        const slice = data.length <= need ? new Float32Array(data) : data.slice(0, need);
        chunks.push(slice);
        collected += slice.length;
        if (collected >= target) {
          const out = new Float32Array(collected);
          let off = 0;
          for (const c of chunks) {
            out.set(c, off);
            off += c.length;
          }
          cleanup();
          resolve(out);
        }
      };
      tap.port.postMessage({ type: 'set', active: true });
    });
  }

  getSampleRate(): number {
    return this.ctx?.sampleRate ?? 48000;
  }

  private setState(s: EngineState, info?: string): void {
    this.state = s;
    this.cb.onState?.(s, info);
  }

  private startLevelLoop(): void {
    if (!this.analyser) return;
    const data = new Float32Array(this.analyser.fftSize);
    const analyser = this.analyser;
    const tick = (): void => {
      if (!this.analyser) return;
      analyser.getFloatTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = data[i] ?? 0;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      this.cb.onLevel?.(rms);
      this.levelTimer = requestAnimationFrame(tick);
    };
    this.levelTimer = requestAnimationFrame(tick);
  }
}
