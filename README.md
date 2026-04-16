# Voca

**Read anything. Listen anywhere.**

A clean, minimal PDF / EPUB / TXT / DOCX reader with on-device text-to-speech — think ElevenReader, but free to run and installable as a PWA.

- **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind v4 + shadcn/ui, deployed to Vercel.
- **TTS**: [kokoro-js](https://www.npmjs.com/package/kokoro-js) running in a Web Worker via ONNX WebAssembly — no monthly API cost.
- **Fallback TTS**: FastAPI + Kokoro on a Hugging Face Space (free CPU tier).
- **Database**: CockroachDB Serverless (free tier) via Prisma 5.
- **File storage**: Cloudflare R2 (10 GB free, zero egress) via presigned S3 URLs.
- **Auth**: NextAuth.js v5 (credentials + JWT).
- **PWA**: `@serwist/next` — installable, offline-capable, background audio via MediaSession API.

## Repository layout

```
Voca/
├── frontend/          Next.js app (Vercel target)
│   ├── src/app/       App Router pages + API routes
│   ├── src/components Reader, player, auth, brand, ui
│   ├── prisma/        schema.prisma + seed.ts
│   └── public/        Static assets (logo, preloader, manifest)
├── backend/           FastAPI + Kokoro TTS (Hugging Face Space)
├── AGENTS.md          Rules for AI coding agents working in this repo
└── .env.example       Template for secrets — copy to .env
```

See [frontend/README.md](frontend/README.md) and [backend/README.md](backend/README.md) for per-service instructions.

## Quick start

```bash
# 1. Clone & install
git clone https://github.com/Tee-David/Voca.git
cd Voca
cp .env.example .env      # fill in secrets
cd frontend && npm install

# 2. Fetch CockroachDB CA cert (one-time)
curl --create-dirs -o $HOME/.postgresql/root.crt \
  'https://cockroachlabs.cloud/clusters/<YOUR-CLUSTER-ID>/cert'

# 3. Push schema + seed the admin user
npx prisma db push
npm run db:seed

# 4. Dev server
npm run dev   # http://localhost:3000
```

## Required environment variables

Set these in `.env` (local) **and** in Vercel project settings (production):

| Var | Purpose |
|---|---|
| `DATABASE_URL` | CockroachDB connection string (with `sslmode=verify-full`) |
| `NEXTAUTH_SECRET` | Session signing key (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Deployed app URL |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | Cloudflare R2 credentials |
| `R2_BUCKET_NAME` / `R2_PUBLIC_URL` | Bucket and its public endpoint |
| `HF_TTS_URL` | (optional) Hugging Face Space URL for fallback TTS |
| `VOCA_API_KEY` | API key between frontend and the HF backend |

A working template lives in [.env.example](.env.example). **Never commit `.env`** — it's gitignored.

## Features

- 📚 **Library** — upload PDF / EPUB / TXT / DOCX, filter, favorite, archive.
- 🔊 **Reader + player** — word-level highlight, speed 0.5×–2×, pitch, skip ±30 s, seek bar.
- 🧑‍🎤 **Voice picker** — 9 Kokoro voices, per-user default in settings.
- 🔖 **Bookmarks** — color-tagged highlights with notes.
- 🎧 **Audiobook export** — render the whole book to WAV in the browser.
- 🛠 **Admin** — `wedigcreativity@gmail.com` gets a Users tab to create/delete accounts.
- 📈 **Reading sessions** — streaks + listening-time widget.
- 📱 **PWA** — installable, offline cache, lock-screen controls.

## Admin account

Seeded by `prisma/seed.ts`:

- Email: `wedigcreativity@gmail.com`
- Password: `securePassword123` *(change after first login → Settings → Security)*

## Deploy

1. Push to [github.com/Tee-David/Voca](https://github.com/Tee-David/Voca).
2. Import the repo on [vercel.com](https://vercel.com/new) — set the **Root Directory** to `frontend`.
3. Paste every env var from `.env` into Vercel → Project → Settings → Environment Variables.
4. First deploy will run `prisma generate && next build` automatically.

## License

Private. All rights reserved.
