#!/usr/bin/env bash
# Smoke test: build, serve docs/, run Playwright happy-path.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -s docs/index.html ]; then
  echo "[smoke] building first…"
  npm run build
fi

if [ ! -d node_modules/@playwright ]; then
  echo "[smoke] @playwright/test not installed — run 'npm install'"
  exit 1
fi

if [ ! -d ~/Library/Caches/ms-playwright ] && [ ! -d ~/.cache/ms-playwright ]; then
  echo "[smoke] installing Playwright Chromium…"
  npx --no-install playwright install chromium
fi

echo "[smoke] running playwright"
npx --no-install playwright test --project=chromium
