# Voca Roadmap

Voca's roadmap is organized around product capabilities and open-source quality rather than dates. Items may move as the architecture and community evolve.

## 1. Open-source foundation

- Complete security and secret-history audit
- Verify dependency, model, font, icon and asset licenses
- Make local development reproducible without maintainer infrastructure
- Separate hosted providers from the core reader
- Establish CI, security regression tests and contributor workflows
- Produce a clean public release history

## 2. Local-first reader

- Strengthen PDF, EPUB, DOCX and TXT ingestion
- Improve structured chapter and section extraction
- Keep Kokoro speech generation local by default
- Improve word synchronization, sentence focus and continuous playback
- Expand resilient offline caching and progress restoration
- Improve bookmarks, highlights and annotations

## 3. Provider ecosystem

- Formalize StorageProvider, AIProvider, SyncProvider, TranscriptionProvider, RemoteTTSProvider and OCRProvider interfaces
- Provide documented local/default implementations where practical
- Make hosted integrations optional adapters
- Document data boundaries for every provider
- Enable community-maintained adapters without changes to reader core

## 4. Platform quality

- Improve accessibility and keyboard navigation
- Expand PWA offline behavior
- Harden Android packaging and configuration
- Improve large-document performance and resource management
- Add deterministic fixtures for extraction and synchronization
- Expand end-to-end tests around critical reading flows

## 5. Intelligence, optionally

- Summaries, recaps and document questions
- Quizzes and study workflows
- Speech input and transcription
- Local or self-hosted model options
- Clear controls for features that send document-derived data remotely

## Non-goals

Voca will not become a source of copyrighted books, DRM-circumvention tooling, a piracy workflow or a product whose basic reading experience requires a proprietary AI subscription.

## How roadmap decisions are made

Changes should improve the reading experience while preserving privacy, provider independence, security, accessibility and maintainability. A large architectural change should demonstrate why it is better than an incremental one.