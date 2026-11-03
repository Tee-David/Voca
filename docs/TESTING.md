# Testing Strategy

Voca's tests should protect the reading experience and the security boundaries around untrusted documents and optional hosted services.

## Current automated checks

The frontend currently includes focused security regression scripts for SSRF/address handling and storage/object authorization rules. CI runs those checks together with TypeScript validation and a production build. The optional Python backend is syntax-compiled in CI.

## Test layers

### Unit tests

Good unit-test targets include document normalization, chapter/section logic, word synchronization, timing calculations, storage-key validation, URL/address classification, provider adapters and state transitions.

### Integration tests

Integration coverage should exercise document extraction, persistence adapters, authenticated API routes, upload/signing flows, OCR boundaries and optional provider failure behavior.

### Security tests

Security coverage should include SSRF, path traversal, malicious or malformed uploads, MIME confusion, oversized inputs, script/content injection, unsafe URLs, cross-user authorization, credential leakage and resource exhaustion.

### End-to-end tests

Critical user flows include importing a document, opening it, generating/playing local speech, synchronized highlighting, restoring progress, offline reload where supported, bookmarks/annotations and switching optional remote features off.

## Fixtures

Fixtures must be small, deterministic and safe to redistribute. Use synthetic, original, properly licensed or public-domain material. A regression test should capture the structural trigger for a bug without copying a user's private book into the repository.

## Release verification matrix

The first release candidate should manually verify at least one representative PDF, EPUB, DOCX and TXT document, local TTS, synchronization, progress restoration and offline behavior. Scanned PDF/OCR behavior should be verified separately because it has different performance and security characteristics.

## Performance and abuse

Large documents and malformed inputs need bounded behavior. Tests should increasingly cover size limits, cancellation, concurrency, temporary-file cleanup and expensive OCR/TTS paths rather than measuring only successful output.