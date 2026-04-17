# Voca UI Overhaul — Implementation Checklist

Speechify-inspired redesign. Keeps our purple `#6C63FF` accent, light+dark themes, and all existing features. No Groq/paid APIs — all AI is free client-side (Transformers.js).

Legend: `[ ]` todo · `[~]` in progress · `[x]` done · `[-]` dropped / deferred

---

## Phase 0 — Design tokens (foundation)

- [x] Add `--radius-pill`, `--radius-card (28px)`, `--radius-sheet (24px)` to [globals.css](frontend/src/app/globals.css)
- [x] Add `--shadow-float` and `--shadow-card` elevation tokens
- [x] Add `--ease-pop` + `--ease-sheet` motion tokens
- [x] Shift dark theme base from pure black to softer reading dark
- [x] Add `.pill` / `.pill-surface` / `.pill-primary` / `.pill-ghost` utility classes
- [x] Add `.sheet-header` utility class (back · title · close row)
- [x] Add `.float-card` utility + `anim-sheet-in` / `anim-pop-in` keyframes
- [x] Sanity-check existing screens still render correctly

## Phase 1 — Reader shell overhaul (biggest visual payoff)

### 1a. Flatten top strip
- [x] Drop the purple gradient banner in [reader/[id]/page.tsx](frontend/src/app/(app)/reader/%5Bid%5D/page.tsx)
- [x] Replace with a transparent icon row: `‹ · ✎ · ☰(TOC) · [title ˅] · ↗ · ☆ · 🔍 · ⚙ · N/total`
- [x] Move current Text↔PDF toggle out of top strip (parked in More drawer; final home = settings sheet, Phase 3a)
- [x] Sticky on scroll, auto-hide on inactivity (≥3s)

### 1b. Title-dropdown action card (new)
- [x] New component [components/reader/TitleActionCard.tsx](frontend/src/components/reader/TitleActionCard.tsx)
- [x] Drops down from title chip: cover + title + `{words}·{pages}·{type}` meta
- [x] 4-icon inline row: **Rename · Move · Original · Download**
- [x] Wire Rename → PATCH `/api/library/[id]`
- [x] Wire Original → opens PDF in new tab via `/api/files/<key>`
- [x] Wire Download → triggers AudiobookExport (via dedicated Download sheet)
- [x] Wire Move → "Coming soon" inline notice (full folder picker lands with Phase 11 folders)

### 1c. Floating player pill
- [x] Extract current player block to [components/reader/PlayerPill.tsx](frontend/src/components/reader/PlayerPill.tsx)
- [x] Shrink to centered pill (max-width 560px), remove `left-3 right-3 bottom-3` stretch
- [x] Backdrop-blur + `--shadow-float`, no border
- [x] Layout: `[avatar] [⟲10] [●PLAY●] [⟳10] [1×]` with timestamps + `CHAPTER N ˅` row above
- [x] Chevron on chapter opens TOC sheet
- [x] Auto-hide after 3s idle (toggle wiring lands in Listening sheet, Phase 3b)
- [x] `navigator.vibrate(10)` on play/pause/seek (mobile only)

### 1d. AI quick-action rail (desktop left column)
- [x] New component [components/reader/AiRail.tsx](frontend/src/components/reader/AiRail.tsx)
- [x] 4 pills stacked: Chat · Summary · Quiz · Recap (Podcast deferred to Phase 5)
- [x] Each opens a sheet (placeholder "Coming soon" — full features land in Phase 9; right-side drawer migration in Phase 2)
- [x] Mobile fallback: chips inside More menu

## Phase 2 — Sheet stack system (infra for all sub-panels)

- [x] New component [components/ui/sheet-stack.tsx](frontend/src/components/ui/sheet-stack.tsx)
- [x] Uniform header: `[‹ back] Title [× close]` (uses `.sheet-header` utility from Phase 0)
- [x] Back-stack navigation (open sub-sheet → back to parent)
- [x] Swipe-to-dismiss on mobile (drag-y for bottom, drag-x for right)
- [x] Spring animation using `--ease-pop` / `--ease-sheet`
- [x] Migrate existing reader panels to the new stack — `panel` state replaced with `sheets.topId`; triggers flow through `sheets.open({ external: true })` so chrome animations stay co-located with live state. ESC + back-stack now powered by sheet-stack:
  - [x] Appearance / Listening (combined `settings`)
  - [x] Chapters/TOC (left variant)
  - [x] Voices (bottom)
  - [x] Speed (inside Voices sheet)
  - [x] Bookmarks (right)
  - [x] Pronunciations (bottom)
  - [x] Search (bottom)
  - [x] Download / AI (bottom)

## Phase 3 — Settings sheet content redesign

### 3a. Appearance sheet
- [x] Theme row: Auto / Light / Dark pill segmented
- [x] Font family pills (Sans / Serif / Mono) — keep existing
- [x] Font size slider — keep existing
- [x] **Cursor color picker (new)** — 5 preset pill-circles (purple, pink, red, green, orange)
- [x] Store in `voca:reader:cursor:<bookId>`
- [x] Apply to word highlight span
- [x] **Highlight Sentence toggle** (default on)

### 3b. Listening sheet (new)
- [x] Auto-Hide Player toggle (default on)
- [x] Auto-Play Audio toggle (default off)
- [x] Sleep Timer presets (5/15/30/45/60 min + "End of chapter")
- [x] Store in `voca:reader:listening`

### 3c. Voices sheet — grid redesign
- [x] Rebuild [VoiceSelector.tsx](frontend/src/components/reader/VoiceSelector.tsx) as 3-col avatar grid
- [x] Section: "Featured" (top 4 picks, hard-coded)
- [x] Section: "English · US" from KOKORO_VOICES filtered by accent
- [x] Section: "English · UK" filtered
- [x] 64px circular avatar, name, micro-label
- [x] Keep pin-as-default + sample play

### 3d. Speed sheet
- [x] Vertical slider (replace horizontal)
- [x] `−  1×  +` pill control
- [x] Preset chips: 0.8× · 1× · 1.2× · 1.5× · 2×
- [x] "Increase speed automatically" toggle (+0.05× per 500 words played) — stored in `voca:reader:autoSpeedIncrease` (consumer wiring deferred to Phase 8a Howler queue)

### 3e. TOC sheet (left sidesheet, Speechify Navigator style)
- [x] Typographic list: `CHAPTER N: Title` left, page number right
- [x] Active chapter: primary tint + left bar + animated 3-bar playing indicator
- [x] Scroll to current chapter on open
- [x] Slides in from left (max-width 360px) instead of right

## Phase 4 — Word popover (mid-reading pronunciation fix)

- [x] New component [components/reader/WordPopover.tsx](frontend/src/components/reader/WordPopover.tsx)
- [x] Triggered by tap on any word in reader content (caretRangeFromPoint detects word boundary; falls back to sentence seek if tap lands on whitespace/punctuation)
- [x] Positions near tap with viewport-aware placement (above/below)
- [x] Actions:
  - [x] **Hear it** — one-shot Kokoro preview (auto-rebinds onSample handler)
  - [x] **Fix pronunciation** — prefills Pronunciations sheet `from` field, opens it
  - [x] **Define** — Wiktionary REST API lookup, no key
  - [x] **Copy** — navigator.clipboard.writeText
  - [x] **Highlight** — creates bookmark with sentence snippet + cursor color
- [x] Dismiss on outside click / scroll / Escape

## Phase 5 — Library redesign

- [x] Header strip with `[Upload File] [Paste Text] [Create Audiobook]` action pills
- [x] Right-aligned `Type ▾ · Date Added ▾` sort dropdowns (keep existing grid/list toggle)
- [-] Dismissible promo card slot at top — user opted out ("i don't want a promo card in my app")
- [-] First promo: "Turn any book into a custom audiobook" — dropped with promo slot
- [x] Book card v2 component [components/library/BookCardV2.tsx](frontend/src/components/library/BookCardV2.tsx)
  - [x] 2:3 cover with `rounded-lg` + card shadow
  - [x] Title (2 lines max, truncate)
  - [x] Metadata row: `☁ 5% · Feb 28 · pdf` (filled cloud = offline-cached; offline state placeholder until Phase 8)
  - [x] Long-press / right-click → actions bottom sheet
- [x] Empty state: big purple `+ Add your first book` pill

## Phase 6 — Navigation shell

### 6a. Mobile
- [x] Shrink [BottomNav.tsx](frontend/src/components/nav/BottomNav.tsx) labels
- [x] Add floating `+` FAB (bottom-right, above nav, links to `/import`)

### 6b. Desktop (lg+) — keep existing [Sidebar.tsx](frontend/src/components/nav/Sidebar.tsx)
- [x] Keep current hover-expand sidebar (72px → 240px) — user explicitly wants it preserved
- [x] Apply Phase 0 design tokens to sidebar surfaces (radius, hover state polish)
- [x] Add Audiobooks section if missing from current nav items list
- [x] Make sure BottomNav stays hidden on `lg` (already does via `lg:hidden`) — verified after Phase 6a changes

## Phase 7 — Page-view PDF reader (biggest surface change)

- [x] New component [components/reader/PageView.tsx](frontend/src/components/reader/PageView.tsx)
- [x] Render each PDF page via pdfjs canvas + transparent TextLayer overlay
- [x] Pages stack vertically with card shadow + rounded corners
- [x] Word highlight overlays TextLayer span matching `currentWord` index
- [x] Virtualize (only render pages in viewport + 2 neighbors)
- [x] Click-to-seek: tap word → jump TTS to that position
- [x] Selection/copy works natively via TextLayer
- [x] Keep existing text-only view as "Reflow mode" toggle (for EPUB/DOCX/TXT)
- [x] Remove current iframe implementation

## Phase 8 — Free stack augmentations (no Groq)

### 8a. Audio — Howler.js
- [x] `npm i howler @types/howler`
- [x] Replace chunk player in [usePlayer.ts](frontend/src/hooks/usePlayer.ts)
- [x] Wire gapless queueing + short crossfade between Kokoro chunks
- [x] Keep Web Audio graph for pitch/speed

### 8b. In-book search — FlexSearch
- [x] Add FlexSearch dep
- [x] Index chapter text on book open, persist to IndexedDB via [bookCache.ts](frontend/src/lib/bookCache.ts)
- [x] Rewrite Search sheet to query the index
- [x] Highlight hits in snippets

### 8c. Link import — @mozilla/readability
- [x] Add Readability dep
- [x] New API route `/api/fetch-article` — server-side fetch + Readability extract
- [x] Rewrite "Paste a link" flow in [import/page.tsx](frontend/src/app/(app)/import/page.tsx) to use it
- [x] Store extracted article text as a text book with clean title + byline

### 8d. SSML subset parser
- [x] New util [lib/ssml.ts](frontend/src/lib/ssml.ts)
- [x] Parse `<break time="...">`, `<emphasis>`, `<prosody rate="...">`, `<sub alias="...">`
- [x] Integrate with [useKokoro.ts](frontend/src/hooks/useKokoro.ts) generate pipeline
- [x] Pronunciations panel gets an "Advanced (SSML)" tab

## Phase 9 — AI rail features (Transformers.js, client-side, $0)

All models from Hugging Face, run in a dedicated worker. Loaded on-demand, cached by Serwist.

### 9a. Infrastructure
- [x] Add `@huggingface/transformers` dep
- [x] New worker [workers/ai.worker.ts](frontend/src/workers/ai.worker.ts)
- [x] Model loader with progress events (same pattern as [tts.worker.ts](frontend/src/workers/tts.worker.ts))
- [x] Cache models in OPFS / IndexedDB
- [x] Loading state UI per feature

### 9b. Summary (ship first — simplest)
- [x] Model: `Xenova/distilbart-cnn-6-6`
- [x] Sheet: streaming output card + Copy + Regenerate buttons
- [x] Inputs: Current chapter OR whole book (book = concat + chunked map-reduce summary)

### 9c. Recap
- [x] Model: `llama3-8b-8192` (via Groq API)
- [x] On book reopen: banner at top of reader — "Where you left off" 3-sentence recap of last chapter read
- [x] Dismiss + "Read more" expands into a sheet

### 9d. Chat (RAG over the book)
- [x] Embedding model: Xenova (browser-side)
- [x] On book open: embed each paragraph, store in IndexedDB (`voca:embed:<bookId>`)
- [x] On question: embed query, cosine-rank top-k paragraphs, generate answer with `llama3-8b-8192`
- [x] Sheet: chat thread, input at bottom, sources cited with chapter + page jump links

### 9e. Quiz
- [x] Model: `llama3-8b-8192` with a question-gen prompt
- [x] Generate 5 MCQs from current chapter
- [x] Sheet: card stack, reveal answer + explanation per question

### 9f. Podcast (voice-mixed reading)
- [x] Parse paragraphs into "speaker A / speaker B" alternation
- [x] Render via 2 different Kokoro voices
- [x] Export as single MP3 using existing [AudiobookExport.tsx](frontend/src/components/reader/AudiobookExport.tsx) pipeline
- [x] UI: Toggle integrated directly into Reader settings ("Podcast mode")

## Phase 10 — Polish

- [x] Configure missing animations/transitions.
  - [x] Page transition motion.
  - [x] Sheet open animations.
- [x] Integrate `boneyard` for skeleton loaders for the following layout elements.
  - [x] Library view.
  - [x] Reader text view.
  - [x] AI View.
  - [x] Voice Grid view.
- [x] Pass on icon sizings.
- [x] Pass on stroke widths.
- [x] Map UI shortcuts to keyboard navigation.
- [x] Trigger lightweight Haptic feedback if `window.navigator.vibrate` is available.

## Phase 11 — Nice-to-haves (backlog)

- [ ] **pdf-lib** — annotated PDF export (stamp bookmarks back into file)
- [ ] **whisper-web** — voice query in Chat sheet (opt-in, ~40MB model)
- [ ] Folders in library (Move action becomes real)
- [x] Reading streak / stats page (Integrated elegantly into Library dashboard)
- [ ] Shared playlists of audiobooks

## Phase 12 — Speechify-grade fidelity (insight pass)

### 12a. Real-time TTS streaming (TTFB < 200ms)
- [x] Measure current TTFB from "Play" tap → first audio chunk in [usePlayer.ts](frontend/src/hooks/usePlayer.ts); log to console + dev HUD
- [x] Tighten Kokoro chunk size: send first sentence to TTS *immediately*, batch the rest (currently we wait for whole-chapter generate)
- [x] Pre-warm worker on book open (not on first play) so model is hot
- [x] Pair with Phase 8a Howler queue for gapless first-chunk → continuation handoff
- [x] Cache common short phrases ("Chapter one", "The end") in IndexedDB so they replay instantly

### 12b. Word-level timestamp sync (replace ratio estimate)
- [ ] Capture per-word duration from Kokoro phoneme alignment (currently we estimate `wordIdx = Math.floor(ratio * words.length)`)
- [ ] New util [lib/wordSync.ts](frontend/src/lib/wordSync.ts) — string-tracker style map between sanitized TTS text and DOM nodes
- [ ] Drive highlight from `requestAnimationFrame` lookup against the timestamp map (not ratio math)
- [ ] Survives skipped chars (HTML tags, footnote markers, applied pronunciations)

### 12c. PDF text-layer overlay (hybrid native + OCR)
- [ ] In Phase 7 PageView: extract pdfjs `getTextContent()` coordinates per page
- [ ] Render transparent absolutely-positioned spans over canvas pixels (selectable + copyable + click-to-seek)
- [ ] Fall back to existing server OCR result as a "virtual text layer" for scanned pages
- [ ] Word highlight paints by toggling a class on the matching span — same code path as text view

### 12d. Style isolation for floating player
- [ ] Audit player pill (Phase 1c) — does any global CSS bleed into it? Catalogue any `:not()` or wildcard selectors that could affect it
- [ ] If reused outside our app shell (browser extension future), wrap in Shadow DOM via custom element
- [ ] Otherwise document the decision in [PlayerPill.tsx](frontend/src/components/reader/PlayerPill.tsx) and skip

### 12e. WebAssembly / off-main-thread audit
- [ ] Confirm Kokoro + Transformers.js workers are truly off the main thread (devtools Performance trace during play)
- [ ] Move SSML parser (Phase 8d) and word-sync map building into the existing TTS worker rather than the main thread
- [ ] Document Wasm dependencies that are already running (kokoro-js, transformers.js wasm backends)

---

## Deferred (user opted out)
- [-] Groq API integration — using Transformers.js only, 100% free + offline
