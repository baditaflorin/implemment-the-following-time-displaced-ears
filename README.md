# time-displaced-ears

A browser audio lab for hearing live microphone input delayed, pitch-shifted, and spectrally transformed.

**Live:** https://baditaflorin.github.io/implemment-the-following-time-displaced-ears/

## What it does

- **7-second delay** — Walk down a street while hearing it 7 seconds late. Uncanny.
- **Two-octave pitch-down** — Traffic becomes whale song.
- **Spectral filtering** — Strip low frequencies and your apartment becomes a dream of itself.
- **Live spectrogram** — See what you hear.
- **Offline analysis** (optional, lazy-loaded) — Capture a clip and analyze it with librosa running in Pyodide, entirely in your browser.

All processing is client-side. Microphone audio never leaves your device.

## Quickstart

```
git clone https://github.com/baditaflorin/implemment-the-following-time-displaced-ears
cd implemment-the-following-time-displaced-ears
npm install
make install-hooks
make dev
```

Then open the printed local URL and grant microphone access.

## Architecture

Pure GitHub Pages — see https://github.com/baditaflorin/implemment-the-following-time-displaced-ears/blob/main/docs/adr/0001-deployment-mode.md

- Web Audio API + a custom AudioWorklet for delay and granular pitch shift
- BiquadFilterNode for spectral filtering
- AnalyserNode + Canvas for the spectrogram
- WebGPU FFT path gated behind feature detection (ADR 0006)
- Pyodide + librosa lazy-loaded for offline analysis (ADR 0006)

Diagrams: https://github.com/baditaflorin/implemment-the-following-time-displaced-ears/blob/main/docs/architecture.md
ADRs: https://github.com/baditaflorin/implemment-the-following-time-displaced-ears/tree/main/docs/adr
Privacy: https://github.com/baditaflorin/implemment-the-following-time-displaced-ears/blob/main/docs/privacy.md

## Make targets

| Target               | What it does                             |
| -------------------- | ---------------------------------------- |
| `make help`          | List targets                             |
| `make install-hooks` | Wire `.githooks/`                        |
| `make dev`           | Vite dev server                          |
| `make build`         | Build into `docs/` (Pages-ready)         |
| `make test`          | Unit tests (Vitest)                      |
| `make smoke`         | Build + Playwright happy-path            |
| `make lint`          | ESLint + tsc                             |
| `make fmt`           | Prettier write                           |
| `make pages-preview` | Serve `docs/` exactly as Pages would     |
| `make clean`         | Drop build artifacts (keeps `docs/adr/`) |

## Browser support

Requires a modern browser with Web Audio + AudioWorklet (Chrome/Edge 66+, Firefox 76+, Safari 14.1+). WebGPU FFT requires Chrome 113+ or equivalent; it gracefully degrades to AnalyserNode if absent.

## License

MIT — see `LICENSE`.
