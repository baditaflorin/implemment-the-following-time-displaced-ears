# 18. PWA + offline support

- Status: accepted
- Date: 2026-05-11

## Context

The original brief said "Walking down a street while hearing it 7 seconds late is uncanny in a way nobody has experienced before." For that to be true in practice, the page has to keep working when the user's connection is bad — tunnels, subway, dead zones — and it has to be ergonomic enough to launch quickly. Both point at PWA.

## Decision

Ship a minimal PWA in v0.2.0:

- A web app manifest at `./manifest.webmanifest` (name, start_url, scope, display: standalone, theme color, two SVG icons including a maskable variant).
- A service worker at `./sw.js` registered from `main.ts` only in production builds.

## Caching strategy

| Request                    | Strategy                                          | Cache           |
| -------------------------- | ------------------------------------------------- | --------------- |
| Navigation (HTML)          | Network-first, fall back to cached `./index.html` | `tde-shell-v1`  |
| `./assets/*`               | Cache-first (Vite hashes filenames → immutable)   | `tde-assets-v1` |
| Other same-origin          | Cache-first                                       | `tde-shell-v1`  |
| Cross-origin (Pyodide CDN) | Pass through (browser HTTP cache handles it)      | —               |

We deliberately do **not** cache Pyodide ourselves. The runtime is ~25 MB and the browser's HTTP cache already does a fine job of it on the second visit. Storing it ourselves would consume more origin quota and complicate cache eviction.

## Why no Workbox

The whole SW is ~50 lines. Workbox would more than double the JS payload and add an external dependency for no functional gain.

## Why service worker registration is `PROD`-only

In dev, the SW's cache makes Vite's HMR confusing and can serve stale chunks. The `import.meta.env.PROD` guard means the SW only registers on the built site.

## How to invalidate

Bump the `VERSION` constant in `public/sw.js`. On install, the new SW will use a new cache name; on activate, the old caches are deleted.

## Consequences

- The page is installable on Chrome desktop, Android, and (with limitations) iOS Safari.
- After one visit, all subsequent visits work offline (the analysis panel still needs a connection on first use, since Pyodide hasn't been fetched yet).
- Total added JS: 0.05 KB gzipped for the registration shim. The SW itself is fetched out-of-band and doesn't count against initial paint.
