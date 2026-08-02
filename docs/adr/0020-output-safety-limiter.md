# 20. Output safety limiter

- Status: accepted
- Date: 2026-08-02

## Context

The audio graph (ADR 0002) ends with `dryGain`/`wetGain` → `outGain` → `AnalyserNode` + `ctx.destination`. `outGain` is user-controllable up to 2x (`AudioEngine.setOutputGain`'s clamp; the UI slider goes to 1.5x), and the mic capture intentionally disables `echoCancellation`/`noiseSuppression`/`autoGainControl` so the delay and pitch effects aren't fighting the browser's own DSP.

That combination — a hot mic input, a boosted output slider, and disabled echo cancellation on a tool people plausibly run through speakers rather than headphones (the whole point is to *hear* the delayed/pitched version of the room, not just your own headphone monitor) — had no final ceiling on loudness before this ADR. Nothing in the graph prevented a transient from reaching the destination node clipped or uncomfortably loud. For a tool whose entire purpose is live audio processing at the user's ears, that is a real hearing-safety gap, not just an audio-quality one.

## Decision

Add a `DynamicsCompressorNode` as the last node in the graph, after `outGain` and before both the `AnalyserNode` and `ctx.destination`:

```
... → outGain → limiter → AnalyserNode
                        → ctx.destination
```

Settings (`AudioEngine.start()`):

- `threshold = -6 dB`
- `knee = 0` (hard knee — more limiter-like than a musical compressor knee)
- `ratio = 20:1` (the max `DynamicsCompressorNode` allows; approximates a limiter)
- `attack = 3 ms` (fast enough to catch a transient before it's fully audible)
- `release = 250 ms`

This is not a true brick-wall limiter (the Web Audio API doesn't expose one), but it materially reduces the chance that a maxed-out output slider plus a hot mic input reaches the user's ears at full, unclamped gain. `captureOutput()` (the "record output" feature) now taps post-limiter so the exported WAV matches what was actually played, not the pre-limit signal.

## Alternatives considered

- **Do nothing / rely on `outGain`'s 0–2x clamp alone.** Rejected — a clamp on the *control* doesn't bound the *signal*; a 2x gain on an already-hot mic input still clips well past 0 dBFS with nothing after it.
- **Clamp `outGain`'s max lower (e.g. 1.0x) instead of adding a limiter.** Rejected — doesn't address the acoustic-feedback case (speaker output re-entering the disabled-AEC mic), which can drive the signal hot independent of the output slider position.
- **Hard sample clipping (`WaveShaperNode` with a clamped curve).** Rejected — clipping distortion at a hard 0 dBFS ceiling is harsher-sounding and doesn't reduce gain ahead of the clip point the way a compressor's knee does; a compressor degrades more gracefully.

## Consequences

- Every code path that ends in "the user hears something" (live monitoring, `captureOutput`) now passes through the same safety stage; there is deliberately no other dynamics processing anywhere else in the graph.
- Heavily driven presets (e.g. maxed output + minimal dry/wet) will sound slightly compressed near their peaks instead of clipping. This is an intentional trade — quieter/safer over louder/riskier.
- `tests/dsp/output-limiter.spec.ts` verifies (via `OfflineAudioContext`) that a full-scale square wave at the engine's maximum output gain stays well under full scale after the limiter, using the same node settings as `AudioEngine.start()`.
