// Radix-2 in-place Cooley–Tukey FFT.
//
// Operates on parallel real/imag Float32Arrays. Length must be a power of two.
// Designed to run inside an AudioWorklet — no allocations after construction,
// no closures, plain arithmetic.

export function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

// Forward FFT in place. After the call, re[k] + i·im[k] is the DFT bin k.
export function fft(re: Float32Array, im: Float32Array): void {
  const n = re.length;
  if (n !== im.length) throw new Error('fft: re/im length mismatch');
  if (!isPowerOfTwo(n)) throw new Error(`fft: ${n} is not a power of two`);
  if (n <= 1) return;

  // Bit-reversal permutation.
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    while (j & bit) {
      j ^= bit;
      bit >>= 1;
    }
    j ^= bit;
    if (i < j) {
      const tr = re[i]!;
      re[i] = re[j]!;
      re[j] = tr;
      const ti = im[i]!;
      im[i] = im[j]!;
      im[j] = ti;
    }
  }

  // Cooley–Tukey butterflies.
  for (let len = 2; len <= n; len <<= 1) {
    const halfLen = len >> 1;
    const ang = (-2 * Math.PI) / len;
    const wRe0 = Math.cos(ang);
    const wIm0 = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let curRe = 1;
      let curIm = 0;
      for (let j = 0; j < halfLen; j++) {
        const k = i + j;
        const l = k + halfLen;
        const xRe = re[k]!;
        const xIm = im[k]!;
        const yRe = re[l]! * curRe - im[l]! * curIm;
        const yIm = re[l]! * curIm + im[l]! * curRe;
        re[k] = xRe + yRe;
        im[k] = xIm + yIm;
        re[l] = xRe - yRe;
        im[l] = xIm - yIm;
        const nextRe = curRe * wRe0 - curIm * wIm0;
        curIm = curRe * wIm0 + curIm * wRe0;
        curRe = nextRe;
      }
    }
  }
}

// Inverse FFT in place. After the call, re[n] + i·im[n] is the time-domain
// sample n (for real-input use, im should come out ≈ 0).
export function ifft(re: Float32Array, im: Float32Array): void {
  const n = re.length;
  // IFFT(x) = (1/N) · conj(FFT(conj(x))).
  for (let i = 0; i < n; i++) im[i] = -im[i]!;
  fft(re, im);
  const inv = 1 / n;
  for (let i = 0; i < n; i++) {
    re[i] = re[i]! * inv;
    im[i] = -im[i]! * inv;
  }
}

// sqrt(periodic Hann) window — together on analysis and synthesis sides of
// an STFT gives unity-gain 50%-overlap-add reconstruction.
//
// We use the *periodic* form (divides by N, not N-1) because it has the
// exact property that  Hann(n) + Hann((n + N/2) mod N) = 1 for all n,
// which is what makes COLA reconstruction free of ripple at 50% overlap.
export function makeSqrtHannWindow(size: number): Float32Array {
  const w = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    const h = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / size);
    w[i] = Math.sqrt(Math.max(0, h));
  }
  return w;
}
