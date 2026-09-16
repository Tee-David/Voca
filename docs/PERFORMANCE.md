# Performance Principles

Voca can process large documents, generate speech and perform OCR, so performance failures can become usability and security failures.

## Measure user-visible work

Prioritize import latency, time to first readable content, time to first speech, playback continuity, memory use on long documents, cache behavior and reader responsiveness over synthetic microbenchmarks with no product impact.

## Progressive work

Avoid blocking the entire reading experience on work that can be deferred. Extraction, speech generation and optional intelligence should be chunked or progressive where practical so users can begin reading before every enhancement is complete.

## Resource bounds

File size, decoded document size, OCR concurrency, speech generation queues, network responses and temporary files need bounds. An operation that is correct for a small document but can exhaust memory or CPU on an adversarial input is not release-ready.

## Caching

Cache expensive local work when it improves offline reading and repeat performance, while treating cached document content as potentially sensitive data. Cache invalidation should be tied to document/version identity rather than broad destructive clearing where possible.

## Mobile

Android devices can have substantially less memory than desktop development machines. Reader and TTS changes should be reviewed on constrained devices before claiming performance characteristics.

## Performance changes

A performance pull request should identify the workload, measurement method and tradeoff. Avoid optimizations that silently move local processing to a remote service solely to improve a benchmark.