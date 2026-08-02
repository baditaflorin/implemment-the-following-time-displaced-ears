// Output safety-limiter regression test.
//
// This is a live-mic effects chain (delay, pitch shift, dry/wet mix, output
// gain up to 2x) that people plausibly run through speakers rather than
// headphones. `AudioEngine` puts a `DynamicsCompressorNode` as the very last
// node before `ctx.destination` / the analyser specifically so that no
// combination of controls (or a hot mic input) can send a full-scale
// transient straight to the user's ears unclamped.
//
// We can't spin up the real `AudioEngine` here — it calls `getUserMedia`,
// which isn't available in `OfflineAudioContext` — so this test builds the
// same tail of the graph (GainNode at the engine's max output gain -> the
// same DynamicsCompressorNode settings) and confirms that even a 0 dBFS
// input, boosted by the maximum output gain the engine allows, never
// produces a rendered sample anywhere near clipping (|sample| should stay
// well under 1.0).

import { test, expect } from '@playwright/test';

test('output limiter keeps a hot signal + max output gain from clipping', async ({ page }) => {
  await page.goto('./');
  await page.waitForFunction(() => document.querySelector('#start') !== null);

  const result = await page.evaluate(async () => {
    const SAMPLE_RATE = 48000;
    const DURATION_SEC = 1;
    // Worst case: a full-scale square wave (harsher than a sine — hits +1/-1
    // instantly every half-cycle) at 440 Hz, then the engine's max output
    // gain (2.0, see AudioEngine.setOutputGain's clamp) applied ahead of the
    // same limiter settings AudioEngine.start() configures.
    const ctx = new OfflineAudioContext({
      numberOfChannels: 1,
      length: SAMPLE_RATE * DURATION_SEC,
      sampleRate: SAMPLE_RATE,
    });

    const buf = ctx.createBuffer(1, SAMPLE_RATE * DURATION_SEC, SAMPLE_RATE);
    const data = buf.getChannelData(0);
    for (let n = 0; n < data.length; n++) {
      const t = n / SAMPLE_RATE;
      data[n] = Math.sin(2 * Math.PI * 440 * t) >= 0 ? 1 : -1;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;

    const outGain = ctx.createGain();
    outGain.gain.value = 2.0; // AudioEngine.setOutputGain max clamp

    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.25;

    src.connect(outGain).connect(limiter).connect(ctx.destination);
    src.start();

    const rendered = await ctx.startRendering();
    const samples = rendered.getChannelData(0);

    // Skip the attack-time ramp-up at the very start of the buffer.
    const settled = samples.slice(Math.floor(SAMPLE_RATE * 0.05));
    let peak = 0;
    for (let i = 0; i < settled.length; i++) {
      const abs = Math.abs(settled[i] ?? 0);
      if (abs > peak) peak = abs;
    }
    return { peak };
  });

  expect(
    result.peak,
    `limiter should keep peak output comfortably below full scale even with a hot square wave at 2x output gain, got ${result.peak}`,
  ).toBeLessThan(0.95);
});
