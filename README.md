# Voca

**Read anything. Listen anywhere.**

Voca is an open-source, local-first reader that turns documents you already own into a synchronized listening and reading experience.

It started from a simple frustration: listening to your own books and documents should not require buying them again as audiobooks, paying another subscription, or sending every page to a proprietary text-to-speech service. Voca is being built as the alternative: natural local speech, synchronized text, document understanding and offline reading, with cloud services treated as optional enhancements rather than requirements.

> Your books. Your device. Your reading experience.

## Why Voca

Most document readers make you choose between basic robotic speech and a cloud service with recurring cost, account requirements or privacy tradeoffs. Voca's primary reading path is designed around local processing wherever practical.

```text
Document
   ↓
Extraction and structure
   ↓
Local neural TTS
   ↓
Synchronized playback
   ↓
Local cache and progress
```

Optional AI, remote storage, sync, transcription, OCR and remote TTS can extend that path without defining it.

## What it can do

- Import PDF, EPUB, DOCX and TXT documents
- Generate natural speech locally with Kokoro
- Follow spoken words with synchronized highlighting
- Keep the active sentence in focus and automatically scroll while reading
- Continue playback across document sections
- Cache reading data for offline use
- Save progress, bookmarks, highlights and annotations
- Export documents as audio
- Extract text from scanned documents with OCR
- Install as a Progressive Web App
- Run as an Android application through Capacitor
- Optionally summarize, recap, quiz and answer questions about a document
- Optionally accept speech input for document questions

## Local first, not cloud dependent

The core Voca experience should remain useful without requiring accounts with several cloud vendors. Current hosted integrations are being separated from the core reader behind explicit provider boundaries as part of the first open-source release.

Where an optional provider receives document content or derived data, Voca will document that boundary clearly so users can make an informed choice.

## Project status

Voca is currently undergoing its first open-source release preparation. The application already exists and works, but the repository is being deliberately hardened before public release rather than simply exposing its private development history.

The release process includes secret-history auditing, configuration cleanup, provider decoupling, dependency and model-license review, broader automated testing, CI, documentation and a clean-install verification.

See [RELEASE_READINESS.md](RELEASE_READINESS.md) for the publication gate.

## Architecture today

The current codebase is intentionally being improved in place rather than reorganized for appearance alone.

```text
Voca/
├── frontend/          Next.js and TypeScript application
│   ├── src/app/       Application routes and API endpoints
│   ├── src/components Reader, playback, AI, auth and UI
│   ├── src/hooks/     Reader and playback behavior
│   ├── src/lib/       Extraction, synchronization, caching and utilities
│   ├── src/workers/   Local TTS and AI workers
│   ├── prisma/        Current persistence schema
│   └── android/       Capacitor Android project
├── backend/           Optional Python processing/TTS service
├── scripts/           Development and maintenance utilities
└── .env.example       Sanitized configuration template
```

The target architecture keeps document ingestion, reading, playback, synchronization, annotations and local storage independent from optional hosted providers.

## Technology

The reader is built primarily with Next.js, React and TypeScript. Local speech uses `kokoro-js` with ONNX/WASM. Document support currently uses libraries including PDF.js, Mammoth, epub.js, Tesseract.js and pdf-lib. The installable web application uses Serwist, while Android packaging uses Capacitor.

The existing private application also integrates hosted services for persistence, object storage and optional AI. These are implementation choices, not intended requirements of the public Voca architecture.

## Development

The current frontend development flow is:

```bash
git clone https://github.com/Tee-David/Voca.git
cd Voca/frontend
npm ci
npm run dev
```

The public developer experience is still being finalized. A contributor should ultimately be able to evaluate and run the core reader without access to the maintainer's production infrastructure.

Current security regression checks can be run with:

```bash
npm run test:security
```

See [CONTRIBUTING.md](CONTRIBUTING.md) before contributing.

## Privacy

Documents can contain highly sensitive information. Voca therefore treats the distinction between local and remote processing as a product feature, not a footnote.

Local processing is preferred where technically reasonable. Optional remote features must make their data boundary understandable and configurable.

## Copyright and responsible use

Voca is for documents you own or are authorized to process. The project does not provide copyrighted books, DRM circumvention, piracy tooling or document-scraping infrastructure. Repository examples and test fixtures should be original, properly licensed or public domain.

## Security

Please read [SECURITY.md](SECURITY.md) before reporting a vulnerability. Do not publish credentials, private documents or exploit details in a public issue.

## Contributing

External contributions will be welcomed once the initial public release is ready. The project values privacy, accessible reading, offline capability, provider independence, focused changes and tests around security-sensitive behavior.

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Maintainer

Voca was created and is maintained by **Taiwo David Dayomola, Senior Software Engineer**.

## License

The application source license will be finalized only after the dependency, model-weight, font, icon and bundled-asset licensing audit is complete. Model licenses may be documented separately from the application source license.

Until that audit and the release gate are complete, this repository remains private and is not yet offered as a public open-source release.
