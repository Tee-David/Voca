# Data Flow

This document is a conceptual map for contributors. Exact implementation details may evolve as provider boundaries are extracted.

## Local reading path

```text
User-selected document
        │
        ▼
validation / extraction
        │
        ▼
structured text + metadata
        │
        ├────► local search / annotations / progress
        │
        ▼
local Kokoro TTS
        │
        ▼
audio + synchronization state
        │
        ▼
reader playback / local cache
```

The goal is to keep this path usable without automatically transmitting the document to an external AI or speech provider.

## Optional hosted path

```text
structured document data
        │
        ├────► StorageProvider
        ├────► SyncProvider
        ├────► AIProvider
        ├────► TranscriptionProvider
        ├────► RemoteTTSProvider
        └────► OCRProvider
```

A configured provider may receive document content, excerpts, derived representations, audio or metadata depending on its capability. Each implementation must document that behavior rather than relying on the generic diagram.

## Authentication data

Hosted account functionality can involve authentication/session data and user-owned resource identifiers. Authorization must be checked at the server boundary before returning or mutating another resource. Client-supplied storage identifiers are not proof of ownership.

## Logs

Logs should contain operational context rather than document bodies or credentials. A debug convenience that copies user content into platform logs changes the privacy boundary and should be treated accordingly.

## Mobile

The Capacitor client may intentionally connect to a separately hosted Voca API when configured. Its API base URL is build configuration, not a secret and not a maintainer-owned default. Authentication tokens remain sensitive even though the endpoint itself is public information.

## Questions for new data flows

Before adding one, answer:

1. What data moves?
2. Why is movement necessary?
3. Is the destination local, self-hosted or third-party?
4. What activates the flow?
5. Can the core reader work without it?
6. How is access authorized?
7. What is logged or retained?
8. How does failure affect local reading?