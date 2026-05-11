# 14. Error handling conventions

- Status: accepted
- Date: 2026-05-11

## Principles

1. **Fail loudly to the user, never silently.** Engine start failures (mic denied, AudioContext suspended, AudioWorklet load error) surface in the status line and the `error` state class.
2. **Never throw across the audio thread boundary.** AudioWorklet `process()` returns normally even when the input is missing — silent passthrough is preferable to a `process()` exception that the browser would handle by terminating the node.
3. **Caller-driven error propagation.** Public engine methods return Promises or throw synchronously; the UI catches and renders. No `catch` blocks inside engine code beyond cleanup of disconnected nodes.
4. **Disposable workers.** The analysis worker is recreated on demand and terminated explicitly. A crashed worker is reported through the existing `onerror` message channel.

## Exception classes

The codebase uses plain `Error` with descriptive messages. No custom subclass hierarchy — the call graph is shallow enough that string matching against `error.message` is acceptable for the few places (none currently) that need conditional recovery.
