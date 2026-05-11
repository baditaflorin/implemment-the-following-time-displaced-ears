# 6. WASM modules

- Status: accepted
- Date: 2026-05-11

## Pyodide (lazy)

- **Version:** 0.26.4 (pinned in `src/features/analysis/analysis.worker.ts`)
- **Source:** `https://cdn.jsdelivr.net/pyodide/v0.26.4/full/`
- **Loaded:** on the first click of "Capture & analyze" — never on initial page load
- **Where:** dedicated Web Worker (`analysis.worker.ts`). Pyodide cannot run in an AudioWorklet (no dynamic imports, no main-runtime bridge), and we do not want it on the main thread (would block UI).
- **Packages pulled at runtime:** `numpy`, `scipy`, `librosa`
- **Total transfer (cold cache):** ~25 MB compressed. Subsequent loads are served from the browser HTTP cache.

The use case is **offline analysis only** — extract RMS / spectral centroid / spectral rolloff / zero-crossing rate / MFCC / onset / tempo from a captured 5-second clip. Realtime DSP would be infeasible in Pyodide; realtime DSP runs in an AudioWorklet (below).

## Custom AudioWorklets

Two TypeScript-authored worklets, compiled by Vite to standalone ES modules and loaded via `audioWorklet.addModule(url)`:

1. **`pitch-shifter.worklet.ts`** — granular pitch shifter. Two 80 ms Hann-windowed grains overlapping at 50%, reading from a 500 ms ring buffer at a variable rate. Time-domain only, no FFT, no external dependency.
2. **`tap.worklet.ts`** — pass-through node that also posts copies of each render quantum to the main thread when activated. Used to capture audio for the analysis panel.

These run in the audio thread at 128-sample blocks (~2.67 ms at 48 kHz) and are the only DSP code on the realtime path.

## WebGPU FFT

Currently **not implemented**. The realtime spectrogram uses `AnalyserNode` + `getByteFrequencyData`, which is sufficient up to ~2048-point FFTs at ~60 Hz refresh.

If a WebGPU FFT path is added later (for >8192-point FFTs or for novel spectral transforms), it will live behind a feature flag in `src/lib/feature-detect.ts`:

```ts
if (detectFeatures().webgpu) {
  /* enable advanced spectral panel */
}
```

The visualization should degrade gracefully — never block the page on missing WebGPU.
