# Voca scripts — click-to-run dev helpers

All three scripts live in this folder. They work from your regular terminal **and** by double-clicking in a file manager that offers "Run in terminal" on `.sh` files (GNOME Files, Dolphin, Nautilus, Thunar — right-click → Properties → Permissions → "Allow executing file as program" is already set).

| Script | What it does | When to use |
|---|---|---|
| `dev.sh` | Starts `npm run dev` + `npx cap run android -l --external` together | Daily dev loop — every file save updates the phone in ~1s |
| `apk-debug.sh` | Builds a debug APK and installs it on the connected phone | Quick one-shot rebuild (no live-reload needed) |
| `ota.sh` | Pushes a new JS bundle via Capgo | When Capgo is set up and you just want to ship a JS change |

## First-time prereqs

Before any of these work, follow [../plans/android-setup.md](../plans/android-setup.md) Steps 1–6 to install JDK 21 + the Android SDK. And:

```bash
cd ../frontend
npm install
```

## Environment

All scripts default `NEXT_PUBLIC_API_BASE_URL=https://voca-cyan.vercel.app`. Override with:

```bash
NEXT_PUBLIC_API_BASE_URL=https://your-other-vercel.vercel.app ./scripts/dev.sh
```

Capgo OTA needs a `CAPGO_TOKEN` (or `.env.local` with it) before `ota.sh` can upload — see [../plans/apk-walkthrough.md §7](../plans/apk-walkthrough.md).

## Running

From terminal:

```bash
./scripts/dev.sh
./scripts/apk-debug.sh
./scripts/ota.sh
```

From file manager: double-click the `.sh`, choose **Run in Terminal** if prompted.

## Creating desktop launchers (optional)

If you want one-click from the GNOME/KDE app grid, drop these in `~/.local/share/applications/` (edit the `Exec=` path to match your checkout):

```desktop
[Desktop Entry]
Type=Application
Name=Voca — Dev loop
Exec=gnome-terminal -- /home/teedavid/Desktop/Projects/Voca/scripts/dev.sh
Icon=utilities-terminal
Terminal=false
Categories=Development;
```

Repeat with `apk-debug.sh` / `ota.sh` for the other two. They'll show up as searchable apps in your Activities overview.
