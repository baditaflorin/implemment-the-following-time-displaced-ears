# 4. Static data contract

- Status: accepted
- Date: 2026-05-11

## Context

Mode A — no precomputed dataset exists.

## Decision

The only "data" the app fetches at runtime is the lazy Pyodide bundle from `cdn.jsdelivr.net/pyodide/`. This is loaded on demand, inside a Web Worker, when the user explicitly opens the analysis panel. Pinned version is documented in ADR 0006.

There is no app-owned static JSON or Parquet artifact.

## Consequences

- No data freshness signaling needed.
- No schema versioning needed.
- §6 of the bootstrap meta-prompt (static data pipeline) does not apply.
