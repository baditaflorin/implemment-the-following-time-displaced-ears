import AnalysisWorker from './analysis.worker?worker';

import type { AnalysisResult } from './analysis.worker';

export type { AnalysisResult };

export interface AnalysisCallbacks {
  onStatus?: (phase: string, detail?: string) => void;
}

export class AnalysisClient {
  private worker: Worker | null = null;

  constructor(private readonly cb: AnalysisCallbacks = {}) {}

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;
    this.worker = new AnalysisWorker();
    this.worker.addEventListener('message', (ev: MessageEvent) => {
      const m = ev.data as { type: string; phase?: string; detail?: string };
      if (m.type === 'status') {
        this.cb.onStatus?.(m.phase ?? '?', m.detail);
      }
    });
    return this.worker;
  }

  analyze(audio: Float32Array, sampleRate: number): Promise<AnalysisResult> {
    return new Promise<AnalysisResult>((resolve, reject) => {
      const w = this.ensureWorker();
      const onMessage = (ev: MessageEvent): void => {
        const m = ev.data as {
          type: string;
          payload?: AnalysisResult;
          message?: string;
        };
        if (m.type === 'result' && m.payload) {
          w.removeEventListener('message', onMessage);
          resolve(m.payload);
        } else if (m.type === 'error') {
          w.removeEventListener('message', onMessage);
          reject(new Error(m.message ?? 'analysis failed'));
        }
      };
      w.addEventListener('message', onMessage);
      w.postMessage({ audio, sampleRate }, [audio.buffer]);
    });
  }

  terminate(): void {
    this.worker?.terminate();
    this.worker = null;
  }
}

export class CaptureBuffer {
  private buffers: Float32Array[] = [];
  private samples = 0;
  private targetSamples: number;

  constructor(
    durationSec: number,
    public readonly sampleRate: number,
  ) {
    this.targetSamples = Math.floor(durationSec * sampleRate);
  }

  push(chunk: Float32Array): boolean {
    if (this.samples >= this.targetSamples) return true;
    const remaining = this.targetSamples - this.samples;
    if (chunk.length <= remaining) {
      this.buffers.push(new Float32Array(chunk));
      this.samples += chunk.length;
    } else {
      this.buffers.push(chunk.slice(0, remaining));
      this.samples = this.targetSamples;
    }
    return this.samples >= this.targetSamples;
  }

  done(): boolean {
    return this.samples >= this.targetSamples;
  }

  flatten(): Float32Array {
    const out = new Float32Array(this.samples);
    let off = 0;
    for (const b of this.buffers) {
      out.set(b, off);
      off += b.length;
    }
    return out;
  }
}
