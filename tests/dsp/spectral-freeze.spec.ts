// Spectral freeze regression test.
//
// Feeds two distinct sines into the spectral worklet:
//   - first half (0..1.0s): 1000 Hz
//   - second half (1.0..2.0s): 200 Hz
// Triggers a "freeze" message at t=0.5s (while 1000 Hz is playing).
// Asserts that the second half of the output is dominated by 1000 Hz (the
// frozen frequency), not 200 Hz (the live input that the worklet should be
// ignoring while frozen).
//
// We expose the spectral worklet URL on window.__tde__ for the same reason
// as the pitch shifter test.

import { test, expect } from '@playwright/test';

test('spectral freeze sustains captured frequency even as input changes', async ({ page }) => {
  await page.goto('./');
  await page.waitForFunction(() => document.querySelector('#start') !== null);

  const result = await page.evaluate(async () => {
    const dbg = (window as unknown as { __tde__?: { spectralWorkletUrl?: string } }).__tde__;
    const workletUrl = dbg?.spectralWorkletUrl;
    if (!workletUrl) throw new Error('window.__tde__.spectralWorkletUrl missing');

    const SR = 48000;
    const DUR = 2;
    const ctx = new OfflineAudioContext({
      numberOfChannels: 1,
      length: SR * DUR,
      sampleRate: SR,
    });
    await ctx.audioWorklet.addModule(workletUrl);

    // Build the input: 1000 Hz for the first half, 200 Hz for the second half.
    const buf = ctx.createBuffer(1, SR * DUR, SR);
    const data = buf.getChannelData(0);
    for (let n = 0; n < data.length; n++) {
      const t = n / SR;
      const hz = t < DUR / 2 ? 1000 : 200;
      data[n] = Math.sin(2 * Math.PI * hz * t);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;

    // Configure via processorOptions — OfflineAudioContext doesn't reliably
    // flush port messages during synchronous rendering. autoFreeze tells the
    // worklet to capture the FIRST complete FFT frame (after samplesIn >=
    // FFT_SIZE), which in this test is squarely inside the 1000 Hz region.
    const spectral = new AudioWorkletNode(ctx, 'spectral', {
      outputChannelCount: [1],
      processorOptions: { mode: 1, autoFreeze: true },
    });

    src.connect(spectral).connect(ctx.destination);
    src.start();

    const rendered = await ctx.startRendering();
    const samples = rendered.getChannelData(0);

    const dft = (slice: Float32Array, fmin: number, fmax: number, step: number) => {
      let bestF = 0;
      let bestMag = 0;
      for (let f = fmin; f <= fmax; f += step) {
        let re = 0;
        let im = 0;
        const w = (2 * Math.PI * f) / SR;
        for (let n = 0; n < slice.length; n++) {
          const v = slice[n]!;
          re += v * Math.cos(w * n);
          im -= v * Math.sin(w * n);
        }
        const mag = Math.sqrt(re * re + im * im);
        if (mag > bestMag) {
          bestMag = mag;
          bestF = f;
        }
      }
      return { f: bestF, mag: bestMag };
    };

    // Look at samples from 1.2s..1.9s — well past the 1000→200 input transition,
    // and past any STFT-frame ramp-up.
    const second = samples.slice(Math.floor(SR * 1.2), Math.floor(SR * 1.9));
    const peak = dft(second, 100, 1500, 5);
    return { peakHz: peak.f, peakMag: peak.mag };
  });

  // Expect the dominant frequency in the second half (after the input dropped
  // to 200 Hz) to be the *frozen* 1000 Hz, within FFT-bin resolution
  // (sample_rate / FFT_size ≈ 47 Hz at 1024-point/48kHz).
  expect(
    Math.abs(result.peakHz - 1000) < 60,
    `expected ~1000 Hz (frozen), got ${result.peakHz} Hz`,
  ).toBe(true);
  expect(result.peakMag).toBeGreaterThan(100);
});
