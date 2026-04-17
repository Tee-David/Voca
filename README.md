# Voca

**Read anything. Listen anywhere.**

An AI-powered document reader with on-device text-to-speech, Speechify-grade word highlighting, and offline-first architecture — installable as a PWA.

## ✨ Features

- 📚 **Smart Library** — upload PDF, EPUB, TXT, or DOCX with auto title cleanup, cover extraction, and favorites
- 🔊 **Continuous Reading** — auto-advances through chapters with pre-generated audio for seamless playback
- ✨ **Speechify-Style Highlighting** — word-by-word tracking with character-weighted timing, sentence focus dimming, and auto-scroll
- 🧑‍🎤 **9 AI Voices** — Kokoro TTS running entirely in-browser via WebAssembly (zero API cost)
- 🔖 **Bookmarks & Annotations** — color-tagged highlights, exportable as annotated PDFs via `pdf-lib`
- 🧠 **AI Assistant** — summarize, recap, quiz, or chat about your book (Groq LLM + RAG)
- 🎙️ **Voice Query** — ask questions hands-free via Whisper speech-to-text
- 🎧 **Audiobook Export** — render any document to downloadable audio
- 📱 **PWA** — installable, offline-capable, lock-screen controls via MediaSession API
- 🌗 **Theming** — light, dark, and sepia modes across all panels and sheets
- 📈 **Reading Stats** — streaks, listening time, and progress tracking

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind v4 |
| TTS | [kokoro-js](https://www.npmjs.com/package/kokoro-js) in Web Worker (ONNX Wasm) |
| AI | Transformers.js (client) + Groq API (cloud) |
| Database | CockroachDB Serverless via Prisma 5 |
| Storage | Cloudflare R2 (S3-compatible, zero egress) |
| Auth | NextAuth.js v5 (credentials + JWT) |
| PDF | pdfjs-dist + Tesseract.js OCR + pdf-lib export |
| PWA | @serwist/next |

## Repository Layout

```
Voca/
├── frontend/          Next.js app (Vercel target)
│   ├── src/
│   │   ├── app/       App Router pages + API routes
│   │   ├── components Reader, player, AI panels, auth, brand, ui
│   │   ├── hooks/     usePlayer, useKokoro, useAI, useReadingProgress
│   │   ├── lib/       extract, wordSync, annotatedPdf, bookCache, embeddings
│   │   └── workers/   TTS worker, AI worker
│   ├── prisma/        schema.prisma + seed.ts
│   └── public/        Static assets, manifest, preloader
├── backend/           FastAPI + Kokoro TTS (Hugging Face Space)
├── AGENTS.md          Rules for AI coding agents
└── .env.example       Template for secrets
```

## Quick Start

```bash
# 1. Clone & install
git clone https://github.com/Tee-David/Voca.git
cd Voca
cp .env.example .env      # fill in secrets
cd frontend && npm install

# 2. Fetch CockroachDB CA cert (one-time)
curl --create-dirs -o $HOME/.postgresql/root.crt \
  'https://cockroachlabs.cloud/clusters/<YOUR-CLUSTER-ID>/cert'

# 3. Push schema + seed
npx prisma db push
npm run db:seed

# 4. Dev server
npm run dev   # http://localhost:3000
```

## Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | CockroachDB connection string (`sslmode=verify-full`) |
| `NEXTAUTH_SECRET` | Session signing key |
| `NEXTAUTH_URL` | Deployed app URL |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | Cloudflare R2 credentials |
| `R2_BUCKET_NAME` / `R2_PUBLIC_URL` | Bucket name and public endpoint |
| `GROQ_API_KEY` | Groq API for AI assistant + Whisper transcription |
| `HF_TTS_URL` | (optional) Hugging Face Space for fallback TTS |

See [.env.example](.env.example) for a working template. **Never commit `.env`.**

## Deploy

1. Push to [github.com/Tee-David/Voca](https://github.com/Tee-David/Voca)
2. Import on [vercel.com](https://vercel.com/new) — set **Root Directory** to `frontend`
3. Add all env vars in Vercel → Project → Settings → Environment Variables
4. First deploy runs `prisma generate && next build` automatically

## License

Private. All rights reserved.
