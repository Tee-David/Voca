# Voca 0.1.0 — Release Notes Draft

> Release candidate draft. Do not publish until the release gate passes and the maintainer explicitly approves publication.

## Read anything. Listen anywhere.

Voca is an open-source, local-first reader built for people who want to listen to and read documents they already own without making a subscription or proprietary cloud TTS service the center of the experience.

The reader combines document extraction, local neural speech, synchronized word highlighting, sentence focus, continuous playback, offline caching, progress, annotations and optional document intelligence in one reading experience.

## Initial capabilities

- PDF, EPUB, DOCX and TXT ingestion
- Local Kokoro text-to-speech
- Synchronized word highlighting and sentence focus
- Continuous reading and auto-scroll
- Bookmarks, highlights and annotations
- Offline-oriented PWA behavior
- Android packaging through Capacitor
- OCR for scanned content
- Audiobook generation
- Reading progress and statistics
- Optional summaries, recaps, quizzes, questions and speech input

## Open-source architecture

Voca's core direction is local-first. Cloud storage, AI, sync, transcription, remote TTS and remote OCR are optional provider capabilities rather than the definition of the reader.

The first public release also establishes security, contribution, privacy-boundary, architecture, roadmap and release-process documentation so contributors can understand not only how the code works, but what the project is trying to protect.

## Security note

The private development repository is not intended to be published directly. The public release must be produced from an audited clean history after credentials historically exposed in private development have been rotated.

## Maintainer

Created and maintained by Taiwo David Dayomola, Senior Software Engineer.
