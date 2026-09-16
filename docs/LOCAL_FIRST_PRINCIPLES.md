# Local-First Principles

Local-first in Voca is an engineering constraint, not a claim that every feature always runs without a network.

## 1. Reading comes first

Importing, understanding and listening to a supported document should rely on local capabilities where the platform can reasonably provide them.

## 2. Remote enhancement is explicit

AI, synchronization, hosted storage, transcription, remote OCR and fallback TTS may be valuable. They should be optional capabilities with understandable configuration and data boundaries.

## 3. Offline state is real state

Cached documents, playback state, progress and annotations should not be treated as disposable merely because a hosted service is unavailable.

## 4. No hidden account requirement

Do not make a local-capable reader action require a vendor account solely because the hosted implementation was easier to build first.

## 5. Failure is isolated

A remote provider outage should degrade the capability that provider supplies rather than unnecessarily break local reading.

## 6. Privacy claims are precise

Say which operation is local. Do not describe the whole product as private/offline if an enabled feature sends excerpts, audio or document data to a provider.

## 7. Self-hosting is a valid direction

Provider interfaces should make self-hosted or local alternatives possible where the ecosystem supports them.

## 8. Local does not mean insecure

On-device caches can contain sensitive material. Local storage, mobile files and offline caches still require thoughtful access and lifecycle behavior.