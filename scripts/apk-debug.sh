#!/usr/bin/env bash
# Voca — build a debug APK and install it on the connected phone
# One-shot: useful when live-reload isn't convenient or you want a persistent build.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT/frontend"

VERCEL_URL="${NEXT_PUBLIC_API_BASE_URL:-https://voca-cyan.vercel.app}"
APK_PATH="$REPO_ROOT/frontend/android/app/build/outputs/apk/debug/app-debug.apk"

echo "▶ Voca debug APK"
echo "  API base: $VERCEL_URL"
echo

if ! command -v adb >/dev/null 2>&1; then
  echo "✗ adb not on PATH. Follow plans/android-setup.md steps 1–6 first."
  exit 1
fi

MOBILE_BUILD=1 NEXT_PUBLIC_API_BASE_URL="$VERCEL_URL" npm run mobile:apk:debug

if [ ! -f "$APK_PATH" ]; then
  echo "✗ Build succeeded but APK not found at $APK_PATH"
  exit 1
fi

DEVICES=$(adb devices | awk 'NR>1 && $2=="device" {print $1}')
if [ -z "$DEVICES" ]; then
  echo
  echo "⚠ No authorized Android device. Plug in your phone + accept USB-debug, then run:"
  echo "  adb install -r \"$APK_PATH\""
  exit 0
fi

echo
echo "Installing on $(echo "$DEVICES" | tr '\n' ' ')..."
adb install -r "$APK_PATH"
echo
echo "✓ Voca installed. Open it from your phone's launcher."
