# Security Policy

Voca processes documents and may interact with local device storage, optional hosted storage, authentication systems, OCR, speech services and AI providers. Security and privacy issues are treated as first-class project concerns.

## Reporting a vulnerability

Before the public release, report security issues directly to the maintainer through an existing private communication channel rather than opening a GitHub issue. After publication, Voca should enable GitHub Private Vulnerability Reporting and this section will be updated to point contributors to that repository-native private channel.

Please include the affected component, impact, reproduction conditions and the smallest safe proof needed to understand the issue. Do not include another person's private documents, production credentials or unnecessary personal data.

Do not open a public issue for an undisclosed vulnerability before the maintainer has had a reasonable opportunity to assess it.

## Supported versions

Voca is currently preparing its first public release. Until a stable public version exists, only the current release candidate will be considered supported for coordinated vulnerability fixes.

## Security boundaries

The core reading path is intended to prefer local processing. Optional remote capabilities may include hosted persistence, synchronization, generative AI, transcription, OCR or fallback TTS. A remote provider is a security and privacy boundary and must be documented accordingly.

## Areas of particular interest

Reports are especially useful around authentication and authorization, SSRF, malicious document parsing, path traversal, oversized files, MIME confusion, script/content injection, unsafe URL handling, object-storage ownership, cross-user access, credential leakage, provider data boundaries, Android signing/configuration and resource exhaustion.

## Secrets

No production secret, private signing key, access token, database credential or cloud-storage credential belongs in the repository. If a credential is ever committed, removing the file in a later commit is not sufficient. Treat the credential as compromised, rotate or revoke it, and ensure it is absent from any history that will be made public.

## Test material

Security reproductions and fixtures must not contain copyrighted books, private user documents or real credentials. Prefer synthetic or public-domain inputs.

## Disclosure

Voca aims to acknowledge valid reports, investigate them, prepare a fix and coordinate disclosure proportionately to the risk. Exact timelines depend on severity and project capacity, but silence or public exposure of sensitive reporter information is not the intended process.