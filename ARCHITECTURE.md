# Voca Architecture

## Design goal

Voca is a local-first reading platform. Its defining capability is the reading pipeline, not any particular cloud vendor.

The architectural goal is that importing a supported document, extracting readable structure, producing speech, synchronizing text and audio, caching the result and restoring reading progress can work locally wherever the platform permits it.

## Core reading pipeline

```text
Document
   │
   ▼
Document ingestion
   │
   ▼
Validation and extraction
   │
   ▼
Structured reading model
   │
   ├──────────────► annotations / search / progress
   │
   ▼
TTS engine
   │
   ▼
Audio + timing information
   │
   ▼
Playback and word synchronization
   │
   ▼
Local cache and reading state
```

A failure or absence of an optional cloud provider should not make this core pipeline conceptually dependent on that provider.

## Current repository

The application predates the open-source architecture work and currently contains two major runtime areas.

### `frontend/`

The primary product. It contains the Next.js application, reader UI, document extraction, playback, local TTS, synchronization, caching, persistence integrations, PWA support and the Capacitor Android application.

### `backend/`

An optional Python service used for processing and fallback capabilities. It is not intended to become a mandatory dependency for basic local reading.

The first public release will prefer incremental extraction of clean boundaries over a large cosmetic monorepo rewrite.

## Core domains

The architecture is moving toward explicit domains that can eventually become packages if doing so improves maintenance.

### Reader core

Owns the document reading model and coordinates the reading experience. It should not know how a particular cloud bucket, database or AI vendor works.

### Document parsing

Turns supported input formats into validated structured content. Imported documents are untrusted input. Parsers must enforce size and format constraints and avoid exposing arbitrary local or remote resources.

### Text to speech

The preferred implementation uses Kokoro locally through `kokoro-js`. A remote TTS implementation is an optional adapter, not the default architectural assumption.

### Playback and synchronization

Coordinates audio playback, sentence focus, word highlighting, auto-scroll and transitions between reading sections.

### Library and annotations

Owns books, progress, bookmarks, highlights, annotations and reading statistics independently from the storage mechanism used to persist them.

### Storage

Persistence should be expressed through interfaces rather than through Cloudflare R2 or another hosted service directly in core behavior.

Candidate implementations include local browser/device storage, local filesystem where available, S3-compatible storage, Cloudflare R2 and MinIO.

### AI

Summaries, questions, quizzes, recaps and other generative features are optional. Core reading must not require an LLM API key.

AI integrations should move toward an `AIProvider` boundary that can support hosted APIs, OpenAI-compatible APIs, Ollama/local models and community adapters without changing reader behavior.

## Provider boundaries

The target provider surface is intentionally small and capability-oriented:

```text
StorageProvider
AIProvider
SyncProvider
TranscriptionProvider
RemoteTTSProvider
OCRProvider
```

A provider must document:

1. what capability it supplies;
2. what data it receives;
3. whether data leaves the device;
4. which configuration is required;
5. how the application behaves when it is absent;
6. any relevant privacy, cost or licensing considerations.

## Privacy boundary

Local and remote execution must be distinguishable in both architecture and documentation.

Operations that can be local include document extraction for supported formats, Kokoro speech generation, playback, synchronization, browser/device caching and portions of OCR and search.

Optional remote operations may include hosted persistence, synchronization, generative AI, transcription, remote OCR or fallback speech. Those operations must be opt-in through configuration or an explicit product action where appropriate.

## Security model

Documents are untrusted input. Security-sensitive surfaces include file upload and parsing, URL fetching, OCR subprocesses, object-storage authorization, authentication, API routes, generated downloads and mobile configuration.

The project specifically tests and reviews for SSRF, path traversal, malicious uploads, MIME confusion, injection, unsafe URLs, cross-user object access, credential leakage, oversized inputs and resource exhaustion.

Secrets must enter through environment or platform secret management. No maintainer infrastructure credential or signing material belongs in source control.

## Offline model

Offline support is part of Voca's architecture rather than a convenience layer. The PWA and Android application should preserve already-imported content and reading state where platform storage permits it. Network-dependent enhancements should fail independently from local reading.

## Mobile

The Android application is built with Capacitor around the web application. Public builds must not embed the maintainer's hosted API endpoint, signing keys or production configuration. Environment-specific endpoints must be supplied externally.

## Evolution rule

A refactor is justified when it improves one or more of these properties:

- local-first operation;
- provider independence;
- security boundaries;
- testability;
- contributor comprehension;
- reuse between web and mobile;
- maintainability.

Voca will not be reorganized merely to look like an open-source monorepo.
