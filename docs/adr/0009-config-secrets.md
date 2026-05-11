# 9. Configuration & secrets management

- Status: accepted
- Date: 2026-05-11

## Decision

- **No runtime secrets exist.** This is a static site running in the user's browser.
- **No environment variables affect behavior** beyond build config (Vite's `BASE_PATH` for the Pages preview server).
- `.env.example` is committed as a convention placeholder and explicitly contains no values.
- `gitleaks protect --staged` runs as a pre-commit guard so that an accidental future paste of a key still gets blocked.

## Why this is safe

The only external service the running app touches is the Pyodide CDN (jsdelivr), accessed without any authentication, only when the user explicitly opens the analysis panel.
