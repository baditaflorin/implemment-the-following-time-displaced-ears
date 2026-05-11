# Security policy

## Reporting a vulnerability

Email: baditaflorin@gmail.com

Please include reproduction steps and the affected browser/OS. We aim to acknowledge within 7 days.

## Threat model — what's in scope

This is a static site running entirely in the user's browser. The microphone stream is processed locally and never transmitted. There is no backend, no account system, and no server-side state.

In-scope vulnerabilities:

- Cross-site scripting (XSS) in the UI
- Supply-chain risk from third-party libraries
- Any code path that would cause microphone data to leave the device (this should be impossible by design — report immediately if you find one)

Out of scope:

- Denial of service against the user's own browser (mute the tab)
- Lack of authentication (there is none — by design)
- WebGPU/WASM browser bugs (report to the browser vendor)

## Supply chain

- `npm audit` and `npx audit-ci --high` run in `pre-push`.
- `gitleaks protect --staged` runs in `pre-commit`.
- Dependencies are pinned and the lockfile is committed.
