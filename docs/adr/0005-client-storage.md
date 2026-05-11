# 5. Client-side storage strategy

- Status: accepted
- Date: 2026-05-11

## Decision

- **localStorage** for the user's parameter presets and last-used settings (`tde:prefs:v1` key).
- **No IndexedDB in v1.** Captured audio buffers are held in memory only and discarded when the analysis run completes.
- **No OPFS** in v1. May reconsider if "save a clip" becomes a v2 feature.

## Why localStorage and not IndexedDB

The total stored payload is a single small JSON object (under 200 bytes). IndexedDB's async API would add complexity for no benefit at this scale. localStorage's quota (5–10 MB) is more than sufficient.

## Schema versioning

The key includes a version suffix (`:v1`). If the `EngineParams` shape ever changes incompatibly, bump to `:v2` and drop `:v1` after migration logic runs once. The loader is fail-soft — any parse error returns `{}` and the user gets defaults.
