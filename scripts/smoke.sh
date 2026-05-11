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

# Free the smoke port if a previous run left a server holding it. The
# playwright webServer config's `reuseExistingServer` flag picks up the wrong
# server (one with no static content) when this happens, which manifests as a
# 15-second connect timeout.
SMOKE_PORT="${SMOKE_PORT:-4173}"
if command -v lsof >/dev/null 2>&1; then
  pids=$(lsof -ti ":${SMOKE_PORT}" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "[smoke] freeing port ${SMOKE_PORT} (pids: $pids)"
    echo "$pids" | xargs -r kill -9 2>/dev/null || true
    sleep 1
  fi
fi

echo "[smoke] running playwright"
npx --no-install playwright test --project=chromium
