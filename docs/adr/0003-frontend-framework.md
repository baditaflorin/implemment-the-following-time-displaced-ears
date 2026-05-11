# 3. Frontend framework & build tooling

- Status: accepted
- Date: 2026-05-11

## Decision

- **No framework.** Vanilla TypeScript + DOM APIs.
- **Vite 5** as the build tool.
- **No CSS framework.** Hand-written CSS using custom properties for theming.

## Why no framework

The whole UI is one screen: a spectrogram, two buttons, six sliders, a preset grid, and an analysis panel. There are no routes, no list virtualization, no form complexity, no SSR needs. A framework would be all cost and no benefit. Total UI source is ~300 lines; that does not justify React's ~50 KB minified runtime, let alone the toolchain.

## Why Vite

- Native ES module dev server (sub-second HMR).
- First-class worker imports (`?worker`, `?worker&url`) for the AudioWorklet and the Pyodide analysis worker.
- Easy `base` and `outDir` config — both required for GitHub Pages (ADR 0010).
- Sane defaults; no custom config needed for code splitting (Vite emits a chunk per dynamic import, which is what we use to defer the analysis client).

## Why hand-written CSS

The visual language is restrained: dark theme with a light-mode fallback via `prefers-color-scheme`. ~150 lines of CSS suffice. Tailwind would bloat the HTML attribute payload; the runtime DX wins don't apply to such a small surface.

## Trade-offs accepted

- No component reuse helpers. Mitigated by the small UI surface.
- No type-safe HTML templating. Mitigated by colocating `innerHTML` strings with the TS that reads/writes from them.
