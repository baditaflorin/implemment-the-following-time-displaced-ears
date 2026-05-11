# 16. Local git hooks (replacing CI)

- Status: accepted
- Date: 2026-05-11

## Decision

GitHub Actions is explicitly disabled at the account level. All checks run as local git hooks installed via `git config core.hooksPath .githooks` (run `make install-hooks` once).

## Hooks

- **`pre-commit`** — `prettier --check`, `tsc --noEmit`, `eslint`, `gitleaks protect --staged` (skipped if not installed). Soft on missing `node_modules` so a fresh clone can commit the initial install.
- **`commit-msg`** — Conventional Commits validator. Accepts `feat|fix|docs|chore|refactor|test|ops|data|perf|style|build|ci`, optional scope, optional `!`.
- **`pre-push`** — `npm test`, `npm run build`, sanity checks that `docs/index.html` and `docs/.nojekyll` exist, then `npm run smoke`.

## Rationale

Local hooks are the only enforcement mechanism that:

- works without any Actions budget,
- gives the developer immediate feedback,
- cannot be bypassed by a misconfigured workflow file.

The downside is they can be bypassed with `--no-verify`. Project convention is: don't.
