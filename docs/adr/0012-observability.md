# 12. Metrics & observability

- Status: accepted
- Date: 2026-05-11

## Decision

**No analytics in v1.** No third-party scripts, no beacons, no event collection.

The only outbound traffic when the app is in use:

1. Loading the page itself from GitHub Pages.
2. Optional: loading Pyodide from `cdn.jsdelivr.net` when the analysis panel is opened (the CDN sees a referer-less request, no app-attached identifiers).

## Privacy posture

Microphone audio is processed entirely in `AudioContext` / `AudioWorkletNode` / `Worker` — all browser sandboxes. There is no code path that uploads, transmits, or fetches with audio content as a payload. This is verifiable by reading `src/` (the only `fetch` / `importScripts` calls are Pyodide and the static JS chunks served from the same Pages origin).

## Future consideration

If usage telemetry ever becomes valuable, prefer a self-hosted Plausible or a tiny Cloudflare Worker beacon that records only:

- distinct page loads
- count of "start listening" clicks
- count of "analyze" clicks

…with no IP storage, opt-in via a banner, and a documented privacy page. **Default remains zero** unless a clear case is made.
