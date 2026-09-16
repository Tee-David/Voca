# Security Policy

Voca processes documents that may contain private, academic, professional or personal information. Security and document privacy are therefore core project requirements.

## Reporting a vulnerability

Please do not disclose suspected vulnerabilities in a public issue before the maintainer has had a reasonable opportunity to investigate and address them.

Until a dedicated security contact is published, use GitHub's private vulnerability reporting feature when it is available for this repository. If private reporting is unavailable, contact the maintainer through a private channel listed on the maintainer's GitHub profile rather than posting exploit details publicly.

When reporting, include the affected component, reproduction conditions, expected impact and the smallest safe reproduction you can provide. Do not include real user documents, credentials or other people's private information.

## Security boundaries

Voca is designed so the primary reading path can operate locally wherever practical. Optional cloud-backed capabilities must document when document content or derived data leaves the user's device.

Contributors must never commit production credentials, API tokens, signing keys, database connection strings, private certificates, real user documents or infrastructure secrets.

## Supported versions

Voca has not yet made its first public stable release. During pre-release development, security fixes target the current development line. A formal supported-version policy will be published with the first stable release.

## Scope

Reports concerning authentication or authorization bypass, SSRF, malicious document processing, path traversal, unsafe file uploads, MIME confusion, injection, credential leakage, storage-key ownership, remote provider boundaries, Android signing material and resource-exhaustion paths are especially valuable.

## Responsible testing

Use only accounts, documents and infrastructure you own or are authorized to test. Do not attempt to access another person's documents or disrupt hosted services.
