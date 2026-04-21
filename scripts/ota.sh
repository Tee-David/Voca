#!/usr/bin/env bash
# Voca — push an OTA update via Capgo
# Rebuilds the static export, syncs, and uploads the bundle.
# Requires Capgo to have been set up once — see plans/apk-walkthrough.md §7.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT/frontend"

VERCEL_URL="${NEXT_PUBLIC_API_BASE_URL:-https://voca-cyan.vercel.app}"

echo "▶ Voca OTA push"
echo "  API base: $VERCEL_URL"
echo "  Repo:     $REPO_ROOT"
echo

if [ ! -f ".env.local" ] && [ -z "${CAPGO_TOKEN:-}" ]; then
  echo "⚠ No CAPGO_TOKEN env var and no .env.local — Capgo upload will likely fail."
  echo "  Set up Capgo first (plans/apk-walkthrough.md §7). Continuing anyway..."
  echo
fi

MOBILE_BUILD=1 NEXT_PUBLIC_API_BASE_URL="$VERCEL_URL" npm run mobile:release

echo
echo "✓ OTA push complete. Reopen Voca on the phone — the new bundle will apply on next launch."
