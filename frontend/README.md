# Voca — Frontend

Next.js 16 (App Router) + TypeScript + Tailwind v4. Hosts the full reader experience, library, all API routes, and AI features.

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Styling | Tailwind v4 + `tw-animate-css` |
| Components | shadcn/ui + Framer Motion |
| Auth | NextAuth.js v5 (credentials + JWT) |
| ORM | Prisma 5 + CockroachDB |
| Storage | Cloudflare R2 via `@aws-sdk/client-s3` |
| TTS | `kokoro-js` in Web Worker (ONNX Wasm) |
| AI | Transformers.js (embeddings, summarization) + Groq (LLM, Whisper) |
| PDF | `pdfjs-dist` + `tesseract.js` (OCR) + `pdf-lib` (annotated export) |
| EPUB / DOCX | `epubjs` + `mammoth` |
| PWA | `@serwist/next` |

## Scripts

```bash
npm run dev        # start dev server (Turbopack) at :3000
npm run build      # prisma generate + next build
npm run start      # serve the production build
npm run db:push    # push schema to CockroachDB
npm run db:seed    # create admin user
```

## Architecture

```
src/
├── app/
│   ├── (auth)/                 Login, register, forgot-password
│   ├── (app)/
│   │   ├── library/            Book grid, upload, favorites, stats
│   │   ├── reader/[id]/        Immersive reader with floating player
│   │   ├── audiobooks/         Downloaded audiobook library
│   │   └── settings/           User prefs, admin panel
│   └── api/
│       ├── auth/               NextAuth + register + reset
│       ├── ai/                 Groq LLM + Whisper transcription
│       ├── upload/             R2 presigned URL + book creation
│       ├── library/            Books CRUD + progress + bookmarks
│       ├── files/[...key]/     R2 file proxy (Range requests)
│       └── admin/              User management
├── components/
│   ├── reader/
│   │   ├── PlayerPill.tsx      Floating audio widget
│   │   ├── AIPanel.tsx         AI chat/summary/quiz panel
│   │   ├── VoiceSelector.tsx   Voice picker grid
│   │   ├── SpeedControl.tsx    Playback speed slider
│   │   ├── AudiobookExport.tsx Full-book audio renderer
│   │   └── PageView.tsx        PDF page canvas + text layer
│   ├── library/                BookCard, upload flow
│   ├── ui/                     shadcn primitives, BottomSheet
│   └── brand/                  Logo, preloader
├── hooks/
│   ├── usePlayer.ts            Howler.js queue player + onQueueEnd
│   ├── useKokoro.ts            TTS worker lifecycle
│   ├── useAI.ts                Transformers.js pipeline
│   └── useReadingProgress.ts   Session tracking
├── lib/
│   ├── extract.ts              PDF/EPUB/DOCX text extraction + OCR
│   ├── wordSync.ts             Character-weighted word timestamp sync
│   ├── annotatedPdf.ts         pdf-lib bookmark export
│   ├── bookCache.ts            IndexedDB chapter + audio cache
│   ├── embeddings.ts           Paragraph chunking + top-K retrieval
│   └── fileUrl.ts              R2 key → API URL resolver
└── workers/
    ├── tts.worker.ts           Kokoro TTS (ONNX Wasm, off-main-thread)
    └── ai.worker.ts            Transformers.js (embeddings, summarization)
```

## Database Models

`User`, `UserPreferences`, `Session`, `PasswordResetToken`, `Book`, `ReadingProgress`, `Bookmark`, `Audiobook`, `ReadingSession`, `Folder`, `Playlist`.

All per-user queries use compound indexes for fast library and dashboard queries.

## Key Features

### Reader
- **Continuous playback** — auto-advances through chapters with `onQueueEnd` callback
- **Pre-generation** — next 2 chapters generate in background for instant transitions
- **Speechify-style highlighting** — character-weighted word timing, active sentence background, dimmed inactive text, auto-scroll
- **Position persistence** — chapter saved to DB, restored on next visit
- **Responsive panels** — right side-sheets on desktop, full-screen/bottom-sheet on mobile
- **Theme support** — light, dark, sepia across all panels including the More drawer

### AI
- **RAG chat** — embed book paragraphs client-side, retrieve top-K for LLM context
- **Whisper voice input** — mic button in chat, audio sent to Groq Whisper API
- **Summary, recap, quiz** — one-tap AI actions on any chapter

### Export
- **Audiobook** — render full book to WAV/MP3 in-browser
- **Annotated PDF** — stamp bookmarks as margin notes via pdf-lib

## Admin

Admin email: `wedigcreativity@gmail.com` — gets a Users tab in Settings. Change the `ADMIN_EMAIL` constant in API routes to swap.

## PWA

Service worker via `@serwist/next`. Manifest at `public/manifest.json`. Custom splash at `public/voca_preloader.html`.
