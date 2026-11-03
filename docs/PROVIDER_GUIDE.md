# Provider Guide

Voca uses provider boundaries so optional hosted capabilities can evolve without becoming the reader architecture.

## Candidate provider capabilities

- `StorageProvider`: persist documents or derived artifacts
- `AIProvider`: summaries, questions, quizzes and related generation
- `SyncProvider`: synchronize library/reading state across devices
- `TranscriptionProvider`: convert user speech to text
- `RemoteTTSProvider`: optional remote speech generation
- `OCRProvider`: text recognition when a remote or replaceable OCR implementation is appropriate

These names describe the target architecture. Do not assume every interface has already been fully extracted in the current codebase.

## Provider requirements

A provider implementation should document:

1. capability supplied;
2. required configuration;
3. data received;
4. whether data leaves the device;
5. authentication/credential handling;
6. timeout, cancellation and size behavior;
7. error mapping;
8. fallback behavior when unavailable;
9. cost/quota considerations where relevant;
10. license or service-term considerations that affect redistribution/use.

## Core isolation

Reader components should depend on capability behavior rather than import a vendor SDK throughout the UI. Vendor-specific code should remain close to its adapter boundary.

## Errors

Provider errors should become stable application-level errors where practical. Do not leak credentials, raw upstream responses containing sensitive information or implementation-specific internals into user-facing messages.

## Testing

Provider adapters should be testable with fakes/mocks or local substitutes. Normal contributor tests must not require the maintainer's production account.

## Community providers

A community adapter should be possible without forking the reader core. Providers that transmit document content must make that behavior obvious in documentation and configuration.