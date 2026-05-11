# Architecture

A one-page summary of how time-displaced-ears is wired. For the rationale behind individual decisions, see `docs/adr/`.

## C4 — System context

```mermaid
flowchart LR
  user((User))
  browser["Browser<br/>(Chromium / Firefox / Safari)"]
  pages["GitHub Pages<br/>static origin"]
  jsdelivr["jsdelivr CDN<br/>(Pyodide + librosa)"]

  user -- "speaks / listens" --> browser
  browser -- "HTML, JS, CSS<br/>(initial load)" --> pages
  browser -- "(on demand) Pyodide bundle" --> jsdelivr
  browser -- "renders processed<br/>audio to speakers" --> user
```

There is no other system in scope — no API, no database, no auth provider.

## C4 — Container view (inside the browser)

```mermaid
flowchart TB
  subgraph "Main thread"
    UI["ui/app.ts"]
    Panel["ui/analysis-panel.ts<br/>(lazy)"]
    Engine["audio/engine.ts"]
    Spec["audio/spectrogram.ts"]
    Prefs["lib/prefs.ts<br/>localStorage"]
  end

  subgraph "Audio thread (AudioWorklet)"
    Pitch["pitch-shifter.worklet.ts<br/>granular shifter"]
    Tap["tap.worklet.ts<br/>passthrough + capture"]
  end

  subgraph "Worker thread"
    AW["analysis.worker.ts"]
    Py["Pyodide + librosa<br/>(lazy CDN)"]
  end

  Mic[/Microphone<br/>getUserMedia/]
  Speakers[/Speakers<br/>destination/]

  Mic --> Engine
  Engine --> Pitch --> Engine
  Engine --> Tap --> Engine
  Engine --> Spec
  Engine --> Speakers
  UI --> Engine
  UI --> Spec
  UI --> Prefs
  UI --> Panel
  Panel -.first-click.-> AW
  AW --> Py
  Tap -. "5s capture<br/>on demand" .-> AW
```

Notes:

- The capture-tap branches off the post-filter, pre-delay node so what the analysis worker sees matches what the user is currently saying, not what they said 7 seconds ago.
- `analysis.worker.ts` and Pyodide are loaded only when the user clicks "Capture & analyze" — initial-page JS is well under 200 KB gzipped.
- All audio data stays inside the browser. The only outbound request is to `jsdelivr.net` for the optional Pyodide bundle.
