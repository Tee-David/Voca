# Voca scripts

Helpers for the Android app (Capacitor). They run from a terminal, or by a double-click in a Linux file manager that
offers "Run in Terminal" for `.sh` files.

| Script | What it does | When to use it |
|---|---|---|
| `dev.sh` | Starts `npm run dev` and `npx cap run android -l --external` together | The daily loop: each save updates the phone in about 1 second |
| `apk-debug.sh` | Builds a debug APK and installs it on the connected phone | A quick one-time rebuild without live reload |

## Before the first run

1. Install JDK 21 and the Android SDK, and set `ANDROID_HOME`.
2. Connect a phone with USB debugging on (or start an emulator).
3. Install the app's packages:

   ```bash
   cd ../frontend
   npm install
   ```

## Environment

Both scripts set `NEXT_PUBLIC_API_BASE_URL=https://voca-cyan.vercel.app`, so the app on the phone talks to the deployed
API. To use another deployment:

```bash
NEXT_PUBLIC_API_BASE_URL=https://your-deployment.vercel.app ./scripts/dev.sh
```

## Run

```bash
./scripts/dev.sh
./scripts/apk-debug.sh
```

Over-the-air JavaScript updates use Capgo: `npm run mobile:release` in `frontend/` (needs a `CAPGO_TOKEN`).
