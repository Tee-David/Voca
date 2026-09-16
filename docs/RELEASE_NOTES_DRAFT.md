# Voca 0.1.0 — Release Notes Draft

> Release candidate draft. Do not publish until the release gate passes and the maintainer explicitly approves publication.

## Read anything. Listen anywhere.

Voca is a local-first reader for people who want to listen to and read documents they already own without making another subscription or proprietary cloud TTS service the center of the experience.

The project began with a practical frustration: a document can already be yours and still be unnecessarily difficult or expensive to listen to. Voca combines document extraction, local neural speech, synchronized text, offline-oriented reading state and optional intelligence in one reading experience.

## Initial capabilities

- PDF, EPUB, DOCX and TXT ingestion
- Local Kokoro text-to-speech
- Synchronized word highlighting and sentence focus
- Continuous reading and automatic scrolling
- Bookmarks, highlights and annotations
- Offline-oriented PWA behavior
- Android packaging through Capacitor
- OCR for scanned content
- Audiobook generation
- Reading progress and statistics
- Optional summaries, recaps, quizzes, questions and speech input

## Local-first architecture

The core direction is intentionally independent from any one cloud vendor. Hosted storage, AI, sync, transcription, remote TTS and remote OCR are optional provider capabilities. Voca documents when those capabilities create a remote data boundary.

## Built to be contributed to

The first open-source release establishes architecture and data-flow documentation, a contributor quickstart, testing and dependency policies, security and privacy guidance, accessibility/performance principles, structured issue and pull-request workflows, CI, dependency automation and an explicit release gate.

## Security posture

Voca treats imported documents and client-supplied URLs/identifiers as untrusted. Existing regression coverage includes SSRF/address handling and storage authorization rules, and the project has dedicated release-candidate security review guidance.

The original private development history is not part of the public release because credentials were historically committed there. Publication requires rotated credentials and a clean audited Git history.

## Licensing

Application licensing and any model-specific notices will be finalized against the exact release artifacts before publication. Model weights and bundled assets may have terms distinct from Voca's application source.

## Maintainer

Created and maintained by **Taiwo David Dayomola, Senior Software Engineer**.