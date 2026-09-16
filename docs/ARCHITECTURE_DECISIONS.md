# Architecture Decisions

This log records foundational decisions that contributors should not have to rediscover from old private commits.

## ADR-001: Local-first reading is the default architecture

**Status:** Accepted

Voca's primary value is reading and listening to a user's documents. Core document processing, speech, synchronization, caching and progress should stay local where practical. Remote capabilities may enhance this path but should not silently replace it.

**Consequences:** provider integrations need explicit boundaries; offline behavior matters; documentation must distinguish local and remote execution.

## ADR-002: Hosted vendors are adapters, not core domains

**Status:** Accepted

CockroachDB, Cloudflare R2, Groq, Hugging Face or another hosted vendor may be useful implementations. Voca should model the capability being supplied rather than make a vendor the architecture.

**Consequences:** storage, AI, sync, transcription, remote TTS and OCR move toward capability interfaces; contributors can add alternatives without rewriting reader behavior.

## ADR-003: Do not force a monorepo rewrite for the first release

**Status:** Accepted

The existing application has meaningful working behavior. Reorganizing every module before publication would create risk without automatically improving the product.

**Consequences:** extract boundaries incrementally and move code only when the change improves testability, provider independence, reuse, security or comprehension.

## ADR-004: Private development history is not the public history

**Status:** Accepted

The private repository historically contained live infrastructure credentials. Even after source cleanup, that history is inappropriate for publication.

**Consequences:** the public release starts from a clean audited snapshot and new Git history. The private repository is retained as development provenance but is not switched directly to public.

## ADR-005: Application licensing follows artifact licensing audit

**Status:** Accepted

Speech model weights and bundled assets can have licenses independent from Voca's application code.

**Consequences:** no source LICENSE is selected until the exact release artifacts are audited; model terms can be documented separately where necessary.