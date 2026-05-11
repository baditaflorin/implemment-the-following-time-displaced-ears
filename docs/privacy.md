# Privacy

## What this app does with your microphone

When you click "Start listening" the page calls `navigator.mediaDevices.getUserMedia({ audio: true })`. Your browser asks for permission, and (if granted) hands the page a `MediaStream` of raw audio samples.

That stream is fed into the Web Audio graph and rendered back to your speakers after delay / pitch / filter processing. **The audio never leaves your browser** — there is no `fetch()`, no `WebSocket`, no `BroadcastChannel` carrying audio data anywhere outside the page's memory.

## What outbound network requests the app makes

- **Initial page load:** the HTML, JS, and CSS are served from GitHub Pages. The CDN sees only normal HTTP requests with no audio payload.
- **Pyodide (optional):** if you click "Capture & analyze", the Pyodide WebAssembly runtime (~25 MB) is fetched from `cdn.jsdelivr.net/pyodide/`. The request body contains no audio. Once loaded, librosa runs inside the browser's Worker sandbox.

That is the complete list of outbound network requests in v1.

## What is stored locally

- One `localStorage` key (`tde:prefs:v1`) holding your slider positions. No audio. No identifiers. You can clear it via your browser's site-data dialog.

## What is NOT stored

- No cookies set by the app.
- No microphone audio saved to disk.
- No analytics, telemetry, or beacons.

## Verifying the claims above

The full source is in `src/`. Search for `fetch(`, `XMLHttpRequest`, `WebSocket`, `importScripts` — you'll find the Pyodide CDN load and nothing else. The page also runs without any third-party script tags (check `index.html`).

## Reporting issues

If you spot a code path that would cause audio to leave the device, please email baditaflorin@gmail.com or file an issue. This is the project's single most important security property.
