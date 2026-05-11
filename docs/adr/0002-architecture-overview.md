# 2. Architecture overview & module boundaries

- Status: accepted
- Date: 2026-05-11

## Modules

```
src/
├── main.ts                 entry — instantiates UI
├── style.css               app-wide CSS (variables, no framework)
├── audio/
│   ├── engine.ts           Web Audio graph: src → HPF → LPF → Delay → Pitch → out
│   ├── spectrogram.ts      AnalyserNode + canvas rendering
│   └── worklets/
│       ├── pitch-shifter.worklet.ts   granular pitch shifter (AudioWorklet)
│       └── tap.worklet.ts             passthrough + post-to-main-thread capture
├── features/
│   └── analysis/
│       ├── analysis.worker.ts         dedicated Worker — loads Pyodide on demand
│       └── analysis-client.ts         main-thread shim around the worker
├── ui/
│   ├── app.ts              mounts DOM, wires inputs ↔ engine, manages presets
│   └── analysis-panel.ts   lazy-imports analysis-client on first click
└── lib/
    ├── prefs.ts            localStorage persistence
    └── feature-detect.ts   capability probes
```

## Boundaries

- **Realtime path** lives inside the `audio/` module. Everything in there is sample-accurate and runs on the audio thread (AudioWorklet) or against `AudioParam`s with smooth ramps. No DOM, no fetch.
- **UI layer** never touches Web Audio primitives directly — only via `AudioEngine`. This keeps audio testable in isolation.
- **Analysis subsystem** is fully isolated in a Web Worker. Its only contact with the rest of the app is a `postMessage` channel carrying `Float32Array` + sample rate in, `AnalysisResult` JSON out. The worker can fail or be slow without affecting the realtime path.
- **No global state**, no singletons that survive page navigation, no `window`-attached objects.

## Dataflow

```
Microphone ──► getUserMedia ──► MediaStreamSource ──► HPF ──► LPF
                                                              │
                                                              ├──► Tap (optional) ──► main thread ──► Analysis Worker (Pyodide)
                                                              │
                                                              ├──► DryGain ──┐
                                                              │              ├──► OutGain ──► AnalyserNode + Destination
                                                              └──► Delay ──► Pitch ──► WetGain ──┘
```

The dry-wet mix at the end lets the user blend the raw input back in. The analysis tap branches off **before** the delay so what's analyzed matches what's currently being heard (not delayed-7s historical audio).
