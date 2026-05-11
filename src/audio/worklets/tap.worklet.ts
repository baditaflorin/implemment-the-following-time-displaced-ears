/// <reference lib="webworker" />

// Passes audio through unchanged while posting copies of each render quantum
// to the main thread when `active` is true. Used to capture raw audio for
// offline analysis (e.g. librosa via Pyodide).

class TapProcessor extends AudioWorkletProcessor {
  private active = false;

  constructor() {
    super();
    this.port.onmessage = (ev: MessageEvent): void => {
      const m = ev.data as { type?: string; active?: boolean };
      if (m && m.type === 'set' && typeof m.active === 'boolean') {
        this.active = m.active;
      }
    };
  }

  override process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || !output) return true;
    const inChan = input[0];
    const outChan = output[0];
    if (inChan && outChan) {
      outChan.set(inChan);
      if (this.active) {
        this.port.postMessage(new Float32Array(inChan));
      }
    }
    return true;
  }
}

registerProcessor('tap', TapProcessor);
