/// <reference lib="webworker" />

// Granular pitch-shifter — two Hann-windowed grains, 50% overlapped, reading
// from a circular delay buffer at pitchRatio samples per output sample.
//
// pitchRatio < 1 → pitch down (e.g. 0.25 = 2 octaves down)
// pitchRatio > 1 → pitch up
// pitchRatio = 1 → unity (passthrough, after one grain of warm-up)
//
// Key invariants of the algorithm:
//   - writeIdx advances at 1 sample/sample (input write head)
//   - each grain has independent read position (advances at pitchRatio)
//   - each grain has independent phase (advances at 1, wraps at grainSize)
//   - when a grain's phase wraps, its read position is snapped to
//     (writeIdx - grainSize) so it starts reading the most-recent grain's
//     worth of buffer
//   - the other grain (offset by grainSize/2 in phase) is at its window
//     peak during the snap, hiding the discontinuity in crossfade

const GRAIN_MS = 80;
const BUFFER_MS = 500;

class PitchShifterProcessor extends AudioWorkletProcessor {
  private readonly grainSize: number;
  private readonly bufferSize: number;
  private readonly buffer: Float32Array;
  private readonly window: Float32Array;

  private writeIdx = 0;
  private read1 = 0;
  private read2 = 0;
  private phase1 = 0;
  private phase2: number;
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
    this.phase2 = this.grainSize / 2;
    // Initial read positions point to the start of the (zero-filled) buffer;
    // they'll be repositioned on the first grain wrap.
    this.read1 = 0;
    this.read2 = 0;
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
    const win = this.window;
    const ratio = this.pitchRatio;
    const frames = outChan.length;

    for (let n = 0; n < frames; n++) {
      const sample = inChan ? (inChan[n] ?? 0) : 0;
      buffer[this.writeIdx] = sample;
      this.writeIdx = this.writeIdx + 1;
      if (this.writeIdx >= bufferSize) this.writeIdx = 0;

      // Linear-interpolated reads at floating-point positions.
      const r1 = this.read1;
      const r2 = this.read2;
      const i1 = Math.floor(r1);
      const i2 = Math.floor(r2);
      const f1 = r1 - i1;
      const f2 = r2 - i2;
      const j1 = i1 + 1 >= bufferSize ? 0 : i1 + 1;
      const j2 = i2 + 1 >= bufferSize ? 0 : i2 + 1;

      const s1 = (buffer[i1] ?? 0) * (1 - f1) + (buffer[j1] ?? 0) * f1;
      const s2 = (buffer[i2] ?? 0) * (1 - f2) + (buffer[j2] ?? 0) * f2;

      const w1 = win[this.phase1] ?? 0;
      const w2 = win[this.phase2] ?? 0;
      outChan[n] = s1 * w1 + s2 * w2;

      // Advance read pointers at pitchRatio (this is what does the shift).
      this.read1 += ratio;
      this.read2 += ratio;
      if (this.read1 >= bufferSize) this.read1 -= bufferSize;
      if (this.read2 >= bufferSize) this.read2 -= bufferSize;

      // Phase advances at 1 per output sample.
      this.phase1++;
      this.phase2++;
      if (this.phase1 >= grainSize) {
        this.phase1 = 0;
        this.read1 = this.writeIdx - grainSize;
        if (this.read1 < 0) this.read1 += bufferSize;
      }
      if (this.phase2 >= grainSize) {
        this.phase2 = 0;
        this.read2 = this.writeIdx - grainSize;
        if (this.read2 < 0) this.read2 += bufferSize;
      }
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
