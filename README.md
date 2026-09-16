# Voca

**Read anything. Listen anywhere.**

Voca is an open-source, local-first reader that turns documents you already own into a synchronized listening and reading experience.

It started from a simple frustration: listening to your own books and documents should not require buying them again as audiobooks, paying another subscription, or sending every page to a proprietary text-to-speech service. Voca is being built as the alternative: natural local speech, synchronized text, document understanding and offline reading, with cloud services treated as optional enhancements rather than requirements.

> **Your books. Your device. Your reading experience.**

## Why Voca

Most document readers make you choose between basic speech and a cloud service with recurring cost, account requirements or privacy tradeoffs. Voca's primary reading path is designed around local processing wherever practical.

```text
Document → extraction and structure → local neural TTS
         → synchronized playback → local cache and progress
```

Optional AI, remote storage, sync, transcription, OCR and remote TTS can extend that path without defining it.

## Highlights

- PDF, EPUB, DOCX and TXT ingestion
- Local neural speech with Kokoro
- Synchronized word highlighting and sentence focus
- Continuous playback and automatic scrolling
- Offline-oriented caching and progress
- Bookmarks, highlights and annotations
- Audiobook generation
- OCR for scanned documents
- Installable PWA and Capacitor Android application
- Optional summaries, recaps, quizzes, document questions and speech input

## Local first, not cloud dependent

The core Voca experience should remain useful without requiring accounts with several cloud vendors. Current hosted integrations are being separated from the core reader behind explicit provider boundaries as part of the first open-source release.

Where an optional provider receives document content or derived data, Voca documents that boundary so users can make an informed choice. See [`docs/PRIVACY_BOUNDARIES.md`](docs/PRIVACY_BOUNDARIES.md).

## Architecture

```text
                         ┌─ annotations / search / progress
Document → extraction ──┤
                         └→ local TTS → playback + sync → local cache

Optional adapters: storage · AI · sync · transcription · remote TTS · OCR
```

The codebase is being improved in place rather than reorganized for appearance alone. See [`ARCHITECTURE.md`](ARCHITECTURE.md) for the design, current repository structure, security boundaries and provider direction.

## Development

```bash
git clone https://github.com/Tee-David/Voca.git
cd Voca/frontend
npm ci
npm run dev
```

Quality checks:

```bash
npx tsc --noEmit
npm run test:security
npm run build
```

The public developer experience is still being verified. A contributor should ultimately be able to evaluate and run the core reader without access to the maintainer's production infrastructure. See [`docs/CONTRIBUTOR_QUICKSTART.md`](docs/CONTRIBUTOR_QUICKSTART.md) and [`docs/CONFIGURATION.md`](docs/CONFIGURATION.md).

## Repository

```text
Voca/
├── frontend/       Next.js/TypeScript reader + PWA + Capacitor Android
├── backend/        Optional Python processing/TTS service
├── scripts/        Development and maintenance utilities
├── docs/           Architecture, privacy, release and contributor docs
└── .github/        CI, dependency automation and community templates
```

## Security and privacy

Documents can contain highly sensitive information. Voca treats the distinction between local and remote processing as a product feature, not a footnote.

Read [`SECURITY.md`](SECURITY.md) before reporting a vulnerability. Security-sensitive changes should also use [`docs/SECURITY_CHECKLIST.md`](docs/SECURITY_CHECKLIST.md).

## Responsible use

Voca is for documents you own or are authorized to process. The project does not provide copyrighted books, DRM circumvention, piracy tooling or document-scraping infrastructure. Repository examples and fixtures should be original, properly licensed, synthetic or public domain.

## Contributing

Read [`CONTRIBUTING.md`](CONTRIBUTING.md). The project values privacy, accessible reading, offline capability, provider independence, focused changes and tests around security-sensitive behavior.

The [`ROADMAP.md`](ROADMAP.md) describes the capability direction, while [`docs/PROJECT_GOVERNANCE.md`](docs/PROJECT_GOVERNANCE.md) explains the current maintainer-led decision model.

## Open-source release status

Voca is undergoing a controlled first open-source release. The existing private repository will **not** simply be switched to public because its development history contains infrastructure residue that must not be published.

The release process includes credential rotation, clean-history creation, licensing verification, clean-install testing, CI, secret scanning and an independent candidate audit. [`RELEASE_READINESS.md`](RELEASE_READINESS.md) is the publication gate and [`docs/RELEASE_BLOCKERS.md`](docs/RELEASE_BLOCKERS.md) lists the remaining hard blockers.

## Maintainer

Created and maintained by **Taiwo David Dayomola, Senior Software Engineer**.

## License

The application source license will be finalized after the exact model-weight and redistributed-asset licensing audit. Model terms may differ from the application source license. See [`docs/THIRD_PARTY_AUDIT.md`](docs/THIRD_PARTY_AUDIT.md).

Until that audit and the release gate are complete, this repository remains private and is not yet offered as a public open-source release.