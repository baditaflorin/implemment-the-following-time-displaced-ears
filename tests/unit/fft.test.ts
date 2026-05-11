import { describe, it, expect } from 'vitest';
import { fft, ifft, isPowerOfTwo, makeSqrtHannWindow } from '../../src/audio/lib/fft';

describe('isPowerOfTwo', () => {
  it('accepts powers of two', () => {
    expect(isPowerOfTwo(1)).toBe(true);
    expect(isPowerOfTwo(2)).toBe(true);
    expect(isPowerOfTwo(1024)).toBe(true);
  });
  it('rejects non-powers', () => {
    expect(isPowerOfTwo(0)).toBe(false);
    expect(isPowerOfTwo(3)).toBe(false);
    expect(isPowerOfTwo(1000)).toBe(false);
  });
});

describe('fft', () => {
  it('throws on non-power-of-two length', () => {
    const re = new Float32Array(5);
    const im = new Float32Array(5);
    expect(() => fft(re, im)).toThrow();
  });

  it('produces correct DFT of a known signal', () => {
    // Cosine at bin 2 of an 8-point FFT should produce peaks at k=2 and k=6 (N-k).
    const N = 8;
    const re = new Float32Array(N);
    const im = new Float32Array(N);
    for (let n = 0; n < N; n++) re[n] = Math.cos((2 * Math.PI * 2 * n) / N);
    fft(re, im);
    const mags = new Float32Array(N);
    for (let k = 0; k < N; k++) mags[k] = Math.hypot(re[k]!, im[k]!);
    expect(mags[2]!).toBeCloseTo(N / 2, 4);
    expect(mags[6]!).toBeCloseTo(N / 2, 4);
    // DC bin should be ~0.
    expect(mags[0]!).toBeLessThan(1e-4);
  });

  it('round-trips fft → ifft within float tolerance', () => {
    const N = 1024;
    const re = new Float32Array(N);
    const im = new Float32Array(N);
    for (let n = 0; n < N; n++) {
      re[n] = Math.sin((2 * Math.PI * 7 * n) / N) + 0.3 * Math.cos((2 * Math.PI * 23 * n) / N);
    }
    const orig = new Float32Array(re);
    fft(re, im);
    ifft(re, im);
    let maxErr = 0;
    for (let n = 0; n < N; n++) {
      maxErr = Math.max(maxErr, Math.abs(re[n]! - orig[n]!));
    }
    expect(maxErr).toBeLessThan(1e-4);
  });
});

describe('makeSqrtHannWindow', () => {
  it('starts at 0 (periodic Hann)', () => {
    const w = makeSqrtHannWindow(64);
    expect(w[0]!).toBeCloseTo(0, 6);
    // Periodic Hann: w[N-1] = sqrt(0.5(1 - cos(2π(N-1)/N))) — not zero, that's
    // intentional and what makes COLA work exactly.
  });

  it('peaks near the middle', () => {
    const w = makeSqrtHannWindow(64);
    expect(w[32]!).toBeCloseTo(1, 4);
  });

  it('squared values sum to 1 at 50% overlap', () => {
    // Hann (= sqrtHann squared) at 50% overlap should reconstruct unity.
    const N = 32;
    const w = makeSqrtHannWindow(N);
    const half = N / 2;
    for (let i = 0; i < half; i++) {
      const sum = w[i]! * w[i]! + w[i + half]! * w[i + half]!;
      expect(sum).toBeCloseTo(1, 2);
    }
  });
});
