# 1. Deployment mode

- Status: accepted
- Date: 2026-05-11

## Context

The project lets a user hear their live microphone input through configurable temporal and spectral transformations (7-second delay, pitch-down two octaves, low/high-cut, FFT-based experiments). The user-facing surface is interactive, real-time, and audio-bound.

Every viable feature in v1 can be expressed using browser-native primitives:

- Microphone capture: `navigator.mediaDevices.getUserMedia`
- Realtime DSP: Web Audio API + AudioWorklet
- Pitch shifting: granular phase-vocoder algorithm running inside an AudioWorklet
- Filtering: `BiquadFilterNode` (native, sample-accurate)
- Spectrogram: `AnalyserNode` plus `<canvas>`
- Optional WebGPU FFT for the experimental "spectral transform" panel
- Optional offline analysis (librosa) via Pyodide compiled to WASM, lazy-loaded behind a user action

No flow requires a runtime backend. No flow requires secrets. No flow benefits from cross-device state.

## Decision

**Mode A — Pure GitHub Pages.**

The entire application ships as a static bundle served from GitHub Pages. There is no runtime server, no API, no database. User preferences live in `localStorage`; captured audio buffers live transiently in memory and optionally in IndexedDB if the user explicitly saves a clip.

## Consequences

Positive:

- **Strongest privacy property**: microphone audio cannot leave the device because there is nowhere for it to go.
- Zero hosting cost, no operational overhead, no on-call.
- The user can install the page as a PWA and use it offline.
- §§3, 4 (Go backend), 7 (server observability), 10 (Docker/Compose), and the runtime parts of §11 (deploy/nginx) of the bootstrap meta-prompt drop out entirely.

Negative / accepted:

- Pyodide + librosa is large (~25 MB compressed for runtime + numpy + scipy + librosa). Mitigated by lazy-loading only when the user explicitly opens the analysis panel.
- Realtime DSP in JavaScript/WASM is more constrained than native — no SIMD intrinsics on all browsers, no thread-pool, AudioWorklet runs at a single thread at 128-sample blocks. This is sufficient for the v1 feature set; documented in ADR 0006.
- No usage analytics by default (also a positive — see ADR 0012).

## Alternatives considered

- **Mode B (precomputed data).** Rejected: there is no static dataset to precompute. The whole point is live microphone input.
- **Mode C (Pages + Docker backend).** Rejected: a backend would only weaken the privacy property and add operational cost for zero functional gain. Even the librosa analysis can run client-side via Pyodide.
