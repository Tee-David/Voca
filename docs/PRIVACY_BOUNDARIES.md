# Privacy Boundaries

Voca processes documents that may contain personal, confidential or copyrighted information. Contributors should be able to tell which operations can stay on-device and which optional features may transmit data elsewhere.

## Local-first operations

The intended local path includes supported document parsing where browser/device libraries permit it, Kokoro text-to-speech, playback, synchronization, local caching and local reading state. Some OCR workflows may also execute locally depending on platform and configuration.

## Optional remote operations

Hosted persistence, synchronization, generative AI, transcription, remote OCR and fallback TTS may involve a remote service. These capabilities must not be presented as if they are local.

A provider integration should document what is sent, why it is sent, what configuration activates it and what happens when the provider is unavailable.

## Contributor rule

Do not introduce a new remote document-processing path silently. A pull request that causes document content, excerpts, embeddings, audio, annotations or identifying metadata to leave the device must describe the boundary and update relevant documentation.

## Logs and telemetry

Application logs must avoid document bodies, credentials, authentication tokens and unnecessary personal information. Telemetry should not become a hidden prerequisite for the reader.

## Test data

Use synthetic, original, properly licensed or public-domain fixtures. Do not commit a user's private document merely because it is convenient for reproducing a parser bug.