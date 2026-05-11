/// <reference lib="webworker" />

// Granular pitch-shifter — overlap-add of 50%-overlapping Hann-windowed grains
// read from a circular delay buffer at a variable read rate. Sounds smoother
// than naive resampling and avoids the FFT cost of a phase vocoder; perfectly
// adequate for the "whale song" 2-octaves-down use case.
//
// Algorithm:
//   write index advances 1 sample per render frame
//   two read pointers (grains) advance at `pitchRatio` samples per render frame
//     and wrap when they reach grainSize
//   each grain is Hann-windowed; the two grains are offset by grainSize / 2
//   output is the sum of the two windowed grains
//
// pitchRatio < 1 → pitch down (e.g. 0.25 = 2 octaves down)
// pitchRatio > 1 → pitch up (e.g. 2.0 = 1 octave up)

const GRAIN_MS = 80;
const BUFFER_MS = 500;

class PitchShifterProcessor extends AudioWorkletProcessor {
  private readonly grainSize: number;
  private readonly bufferSize: number;
  private readonly buffer: Float32Array;
  private readonly window: Float32Array;

  private writeIdx = 0;
  private grain1Pos = 0;
  private grain2Pos: number;
  private pitchRatio = 0.25;

  static get parameterDescriptors(): AudioParamDescriptor[] {
    return [
      {
        name: 'pitchRatio',
        defaultValue: 0.25,
        minValue: 0.125,
        maxValue: 4,
        automationRate: 'k-rate',
      },
    ];
  }

  constructor() {
    super();
    const rate = sampleRate;
    this.grainSize = Math.max(64, Math.floor((rate * GRAIN_MS) / 1000));
    this.bufferSize = Math.max(this.grainSize * 4, Math.floor((rate * BUFFER_MS) / 1000));
    this.buffer = new Float32Array(this.bufferSize);
    this.window = new Float32Array(this.grainSize);
    for (let i = 0; i < this.grainSize; i++) {
      this.window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (this.grainSize - 1));
    }
    this.grain2Pos = this.grainSize / 2;
  }

  override process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>,
  ): boolean {
    const input = inputs[0];
    const output = outputs[0];
    if (!output || output.length === 0) return true;

    const inChan = input && input.length > 0 ? input[0] : undefined;
    const outChan = output[0];
    if (!outChan) return true;

    const pr = parameters['pitchRatio'];
    if (pr && pr.length > 0) this.pitchRatio = pr[0] ?? this.pitchRatio;

    const grainSize = this.grainSize;
    const bufferSize = this.bufferSize;
    const buffer = this.buffer;
    const window = this.window;
    const frames = outChan.length;

    for (let n = 0; n < frames; n++) {
      const sample = inChan && inChan[n] !== undefined ? inChan[n]! : 0;
      buffer[this.writeIdx] = sample;
      this.writeIdx = (this.writeIdx + 1) % bufferSize;

      const baseRead = this.writeIdx - grainSize;

      const g1 = this.grain1Pos;
      const g2 = this.grain2Pos;

      const r1f = baseRead + g1;
      const r2f = baseRead + g2;

      const i1 = ((Math.floor(r1f) % bufferSize) + bufferSize) % bufferSize;
      const i2 = ((Math.floor(r2f) % bufferSize) + bufferSize) % bufferSize;
      const frac1 = r1f - Math.floor(r1f);
      const frac2 = r2f - Math.floor(r2f);

      const next1 = (i1 + 1) % bufferSize;
      const next2 = (i2 + 1) % bufferSize;

      const s1 = (buffer[i1] ?? 0) * (1 - frac1) + (buffer[next1] ?? 0) * frac1;
      const s2 = (buffer[i2] ?? 0) * (1 - frac2) + (buffer[next2] ?? 0) * frac2;

      const w1 = window[Math.floor(g1) % grainSize] ?? 0;
      const w2 = window[Math.floor(g2) % grainSize] ?? 0;

      outChan[n] = s1 * w1 + s2 * w2;

      this.grain1Pos += this.pitchRatio;
      this.grain2Pos += this.pitchRatio;
      if (this.grain1Pos >= grainSize) this.grain1Pos -= grainSize;
      if (this.grain2Pos >= grainSize) this.grain2Pos -= grainSize;
    }

    if (output.length > 1) {
      for (let c = 1; c < output.length; c++) {
        const oc = output[c];
        if (oc) oc.set(outChan);
      }
    }

    return true;
  }
}

registerProcessor('pitch-shifter', PitchShifterProcessor);
