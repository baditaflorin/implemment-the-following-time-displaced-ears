# Contributing

Issues and PRs welcome. A few conventions:

1. **Conventional Commits.** `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`, `ops:`. The `commit-msg` hook enforces this.
2. **Run the hooks before pushing.** `make install-hooks` once, then they run automatically.
3. **No GitHub Actions.** All checks are local. `make test` and `make smoke` must pass before push.
4. **ADRs for significant decisions.** Add a new file under `docs/adr/` following the MADR format. Number sequentially.
5. **No secrets, ever.** `gitleaks` runs as a pre-commit guard.
6. **Keep the asset budget.** Initial JS payload under 200 KB gzipped on first load. Heavy modules (Pyodide, WASM DSP) load lazily behind an explicit user action.

## Reporting bugs

Open an issue with: browser + version, OS, exact steps to reproduce, expected vs actual, console errors. Audio bugs especially benefit from a short screen recording or a description of the timing.
