export interface SpectrogramOptions {
  canvas: HTMLCanvasElement;
  analyser: AnalyserNode;
}

export class Spectrogram {
  private ctx: CanvasRenderingContext2D;
  private rafId: number | null = null;
  private freq: Uint8Array<ArrayBuffer>;
  private writeX = 0;

  constructor(private readonly opts: SpectrogramOptions) {
    const c = opts.canvas.getContext('2d');
    if (!c) throw new Error('2D canvas context unavailable');
    this.ctx = c;
    const buf = new ArrayBuffer(opts.analyser.frequencyBinCount);
    this.freq = new Uint8Array(buf);
    this.resize();
  }

  start(): void {
    if (this.rafId !== null) return;
    const tick = (): void => {
      this.draw();
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stop(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.opts.canvas.getBoundingClientRect();
    this.opts.canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    this.opts.canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.opts.canvas.width, this.opts.canvas.height);
    this.writeX = 0;
  }

  private draw(): void {
    const { canvas } = this.opts;
    const ctx = this.ctx;
    this.opts.analyser.getByteFrequencyData(this.freq);

    const w = canvas.width;
    const h = canvas.height;
    const bins = this.freq.length;
    const colStride = 2;

    for (let dx = 0; dx < colStride; dx++) {
      const x = (this.writeX + dx) % w;
      for (let y = 0; y < h; y++) {
        const t = 1 - y / h;
        const binIdx = Math.min(bins - 1, Math.floor(Math.pow(t, 2) * bins));
        const v = this.freq[binIdx] ?? 0;
        ctx.fillStyle = colorFor(v);
        ctx.fillRect(x, y, 1, 1);
      }
    }
    this.writeX = (this.writeX + colStride) % w;

    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(this.writeX, 0, 1, h);
  }
}

function colorFor(v: number): string {
  const t = v / 255;
  const r = Math.floor(255 * Math.min(1, Math.max(0, 1.5 * t - 0.3)));
  const g = Math.floor(255 * Math.min(1, Math.max(0, 1.4 * t)));
  const b = Math.floor(255 * Math.min(1, Math.max(0, 2.2 * t - 0.9)));
  return `rgb(${r},${g},${b})`;
}
