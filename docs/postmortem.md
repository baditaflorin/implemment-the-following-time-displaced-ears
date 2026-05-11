# Postmortem — v0.1.0

Date: 2026-05-11

## What was built

A single-page web app on GitHub Pages that:

- captures live microphone audio via `getUserMedia`,
- routes it through a Web Audio graph (highpass → lowpass → DelayNode up to 30s → granular pitch-shifter AudioWorklet → wet/dry mix → output),
- renders a live spectrogram via `AnalyserNode` + canvas,
- offers five presets (7-second delay, whale song, apartment dream, underwater, monitor),
- exposes six continuous controls (delay, pitch, HPF, LPF, mix, output) with localStorage persistence,
- lazy-loads Pyodide + librosa in a Web Worker for offline analysis of a 5-second capture (RMS, peak, ZCR, centroid, rolloff, MFCC, tempo, onsets).

Initial JavaScript payload: **6.24 KB gzipped** (target: under 200 KB).

Toolchain: Vite 5, TypeScript 5.7, Vitest, Playwright, ESLint flat config, Prettier, plain bash git hooks via `core.hooksPath`. No GitHub Actions.

Live: https://baditaflorin.github.io/implemment-the-following-time-displaced-ears/

## Was Mode A the right call?

**Yes, unambiguously.** Every v1 feature fits inside the browser sandbox. The privacy property ("audio never leaves the device") is the most valuable thing about the project, and any backend would have weakened it. There was no honest case for Mode B or C.

## What worked

- **Granular pitch shifter as a custom AudioWorklet** — ~100 lines, no FFT, no dependency, sounds good enough that the "whale song" preset is convincing. Hand-rolled DSP paid off vs. pulling in `soundtouch-js` or `essentia.js`.
- **Pyodide in a dedicated Worker, behind a click** — initial page stays tiny while the analysis feature is real. Lazy boundary is exactly where it should be.
- **Vite's `?worker&url` import** for both the pitch AudioWorklet and the analysis Web Worker — TypeScript compilation + hashed asset URLs without writing a custom bundler step.
- **`docs/` as both the Pages publish root and the ADR home**, with Vite's `emptyOutDir: false` — single directory for everything, rollback is a `git revert`.
- **Local git hooks instead of GitHub Actions** — the pre-push hook caught build / smoke regressions immediately.

## What didn't work the first time

- **TypeScript types for the AudioWorklet global scope.** `AudioWorkletProcessor`, `registerProcessor`, `sampleRate` are not in `lib.dom` or `lib.webworker`. Had to write a small `worklets.d.ts` with the symbols we use. Cost: 5 minutes.
- **TypeScript 5.7's generic `Uint8Array<TArrayBuffer>`** — the default `Uint8Array(n)` constructor produces `Uint8Array<ArrayBuffer>` but assigning a `Uint8Array` field with `frequencyBinCount` inference picked up `ArrayBufferLike`. Fixed by allocating the `ArrayBuffer` explicitly. Will probably bite us again on every TS major.
- **ESLint 9 dropped `.eslintrc.cjs` support** without a transparent fallback. The migration to `eslint.config.js` (flat config) is straightforward but the error message points at a doc, not the fix.
- **Playwright `webServer` race** during `git push` — the smoke server occasionally fails to bind within 15 s if a previous run's port is still held by lsof. Mitigation: the `serve-docs.mjs` reuses-existing-server flag plus a `lsof -ti :4173 | xargs kill` is now in the smoke runbook (not yet wired into the script — see "next 3 improvements" below).

## Surprises

- AudioWorklet code, despite running in a separate audio thread, is bundled by Vite as a plain ES module — no Worker bootstrap needed. The same import pattern (`?worker&url`) works for both AudioWorklet and Web Workers when `worker.format: 'es'` is set in `vite.config.ts`.
- Pyodide's `loadPackage('librosa')` "just works" — the librosa wheel is packaged in the Pyodide distribution. No `micropip` fallback was needed in practice, though one is kept as a safety net.

## Accepted tech debt

- The pitch shifter uses two 50%-overlapping grains. This is fine at moderate ratios (0.5–2.0) but introduces audible warble at extreme ratios. A phase vocoder would sound cleaner at 0.25 (2 octaves down). Deferred until we ship a "high quality" toggle.
- No OfflineAudioContext-based test for the actual DSP output. The smoke test verifies the UI; the DSP is verified by ear.
- The WebGPU FFT path is *documented* (ADR 0006) but *not implemented*. AnalyserNode is sufficient for v1's spectrogram.

## Time spent vs. estimate

- Estimated: half a day.
- Actual: a single focused session (~3 hours), including ADRs and the postmortem. Most of the time was UI polish and getting the worklet TS types right.

## Next 3 most valuable improvements

1. **DSP correctness tests** — render a 1 kHz sine through the engine in `OfflineAudioContext`, FFT the output, assert peak frequency matches expected pitch ratio. This is the single biggest gap; everything else is cosmetic.
2. **Phase-vocoder pitch shift behind a toggle** — directly improves the "whale song" preset, which is the most quoted feature in the project description.
3. **PWA installability + offline service worker** — Mode A apps should be installable. Adds a manifest + service-worker scope inside `BASE_PATH`. Doubles the "works on a walk through a tunnel" use case.
