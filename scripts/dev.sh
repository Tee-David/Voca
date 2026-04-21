#!/usr/bin/env bash
# Voca — daily dev loop
# Starts the Next.js dev server and Capacitor live-reload together.
# Phone + laptop must be on the same WiFi.
# Ctrl+C in the terminal stops both.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT/frontend"

trap 'echo; echo "Stopping dev loop..."; kill 0; exit 0' INT TERM

echo "▶ Voca dev loop"
echo "  Repo: $REPO_ROOT"
echo "  Starting: npm run dev  +  npx cap run android -l --external"
echo "  Stop with Ctrl+C"
echo

# Ensure phone is visible
if ! command -v adb >/dev/null 2>&1; then
  echo "✗ adb not on PATH. Follow plans/android-setup.md steps 1–6 first."
  exit 1
fi
DEVICES=$(adb devices | awk 'NR>1 && $2=="device" {print $1}')
if [ -z "$DEVICES" ]; then
  echo "⚠ No authorized Android device on adb. Plug in + accept the USB-debug prompt."
  echo "  (Continuing anyway — cap run will wait for the device.)"
  echo
fi

# Start dev server in background
npm run dev &
DEV_PID=$!

# Give Next a moment to bind, then launch cap run
sleep 3

# cap run takes over the terminal
npx cap run android -l --external

wait "$DEV_PID"
