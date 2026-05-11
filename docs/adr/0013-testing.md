# 13. Testing strategy

- Status: accepted
- Date: 2026-05-11

## Layers

| Layer       | Runner                     | Where                             | What                                                                      |
| ----------- | -------------------------- | --------------------------------- | ------------------------------------------------------------------------- |
| Unit        | Vitest + happy-dom         | `tests/unit/`, `src/**/*.test.ts` | Pure logic (prefs serialization, feature detection, math helpers)         |
| Smoke (e2e) | Playwright (Chromium only) | `tests/smoke/`                    | Page loads, presets render, mic button kicks engine into a non-idle state |

## What is intentionally NOT tested

- The actual audio output of the pitch shifter or delay node. Verifying the spectrum/phase of generated audio with reasonable certainty requires a deterministic reference clip and a `OfflineAudioContext` test harness that handles AudioWorklets. This was considered for v1 and deferred — the cost/benefit only makes sense once we ship a second DSP module.
- Pyodide analysis output values (would tie the test suite to an external CDN). The smoke test verifies the analysis panel renders and the worker module loads; values are not asserted.

## Microphone in tests

Playwright launches Chromium with `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream` so `getUserMedia` returns a synthetic source. The test grants the `microphone` permission explicitly.

## Speed

`make test` runs in <2 s. `make smoke` runs in <15 s on a warm machine. Both are pre-push gated.
