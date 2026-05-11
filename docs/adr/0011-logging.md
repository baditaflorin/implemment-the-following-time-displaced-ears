# 11. Logging strategy

- Status: accepted
- Date: 2026-05-11

## Decision

- **No logging in production** beyond explicit `console.error` for caught exceptions.
- ESLint rule `no-console` blocks new `console.log` / `console.info` from landing.
- The hot audio path (AudioWorklets) never logs — logging from `process()` would create realtime audio glitches.
- User-facing errors render in the status line (`#status`), not the browser console.

## Trace correlation

Not applicable — single-page app, no distributed tracing.
