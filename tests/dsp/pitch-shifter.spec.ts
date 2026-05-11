// DSP regression test for the granular pitch shifter.
//
// Runs in a real Chromium via Playwright (not Vitest/happy-dom — those mock
// AudioWorklet poorly). Feeds a pure 1 kHz sine into the worklet at several
// pitch ratios, captures the rendered output, FFTs it, and asserts that the
// dominant frequency in the second half of the buffer matches the expected
// shifted frequency within tolerance.
//
// We compare the second half so transient onset / grain-fill silence at t=0
// doesn't dominate the spectrum.

import { test, expect } from '@playwright/test';

interface TestPoint {
  ratio: number;
  expectedHz: number;
  toleranceHz: number;
}

const POINTS: TestPoint[] = [
  { ratio: 1.0, expectedHz: 1000, toleranceHz: 25 },
  { ratio: 0.5, expectedHz: 500, toleranceHz: 25 },
  { ratio: 2.0, expectedHz: 2000, toleranceHz: 60 },
];

test('pitch shifter renders sine at expected ratio', async ({ page }) => {
  await page.goto('./');
  // Wait for the worklet asset URL to be discoverable.
  await page.waitForFunction(() => document.querySelector('#start') !== null);

  for (const point of POINTS) {
    const result = await page.evaluate(async (p: TestPoint) => {
      const SAMPLE_RATE = 48000;
      const DURATION_SEC = 2;
      const SIG_HZ = 1000;

      const dbg = (window as unknown as { __tde__?: { pitchShifterWorkletUrl?: string } })
        .__tde__;
      const workletUrl = dbg?.pitchShifterWorkletUrl;
      if (!workletUrl) throw new Error('window.__tde__.pitchShifterWorkletUrl missing');

      const ctx = new OfflineAudioContext({
        numberOfChannels: 1,
        length: SAMPLE_RATE * DURATION_SEC,
        sampleRate: SAMPLE_RATE,
      });
      await ctx.audioWorklet.addModule(workletUrl);

      const osc = new OscillatorNode(ctx, { type: 'sine', frequency: SIG_HZ });
      const shifter = new AudioWorkletNode(ctx, 'pitch-shifter', {
        outputChannelCount: [1],
        parameterData: { pitchRatio: p.ratio },
      });
      osc.connect(shifter).connect(ctx.destination);
      osc.start();

      const rendered = await ctx.startRendering();
      const samples = rendered.getChannelData(0);

      // Take the second half (skip startup transient) and compute |X[k]|.
      const half = samples.slice(Math.floor(samples.length / 2));
      // Naive DFT at a coarse frequency grid around the expected peak suffices
      // for verifying the dominant component without pulling in a real FFT
      // library. Scan ±200 Hz around expected at 2 Hz resolution.
      const fmin = Math.max(20, p.expectedHz - 200);
      const fmax = p.expectedHz + 200;
      let bestF = 0;
      let bestMag = 0;
      for (let f = fmin; f <= fmax; f += 2) {
        let re = 0;
        let im = 0;
        const w = (2 * Math.PI * f) / SAMPLE_RATE;
        for (let n = 0; n < half.length; n++) {
          const v = half[n]!;
          re += v * Math.cos(w * n);
          im -= v * Math.sin(w * n);
        }
        const mag = Math.sqrt(re * re + im * im);
        if (mag > bestMag) {
          bestMag = mag;
          bestF = f;
        }
      }
      return { peakHz: bestF, peakMag: bestMag };
    }, point);

    const err = Math.abs(result.peakHz - point.expectedHz);
    expect(
      err <= point.toleranceHz,
      `ratio=${point.ratio}: expected ~${point.expectedHz} Hz, got ${result.peakHz} Hz (err ${err} Hz, tol ${point.toleranceHz})`,
    ).toBe(true);
    expect(
      result.peakMag,
      `ratio=${point.ratio}: peak magnitude too small (${result.peakMag.toFixed(2)})`,
    ).toBeGreaterThan(100);
  }
});
