# 17. Dependency policy

- Status: accepted
- Date: 2026-05-11

## Decision

- **No runtime dependencies.** The published bundle imports nothing from `node_modules` at runtime; the entire app is the TypeScript in `src/` plus Vite's small ESM wrapper.
- **Build/dev dependencies only:** Vite, TypeScript, Vitest, ESLint, Prettier, Playwright, happy-dom, types.
- Pyodide is loaded **at runtime from a CDN**, not bundled, behind a user action. It is documented as a "runtime fetched dependency" in ADR 0006 and is treated as a third-party service for security purposes.

## Why no runtime deps

- Smaller bundle → faster first paint.
- Fewer supply-chain attack vectors. The only third party in the user's runtime is jsdelivr's Pyodide CDN, and only when explicitly invoked.
- The realtime DSP is small enough to write by hand (a granular shifter is ~100 lines).

## When to break this rule

If a battle-tested DSP library appears whose realtime quality clearly exceeds the hand-rolled granular shifter (e.g. `soundtouch-js` WASM, `essentia.js`), bundle it as a lazy chunk behind a "high-quality pitch shift" toggle. Write a new ADR justifying the size cost.

## Tooling versions

Pinned via `package.json` minimum bounds and `package-lock.json` (committed). `npm audit` and `tsc --noEmit` run in pre-commit/pre-push.
