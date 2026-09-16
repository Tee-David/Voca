# Contributing to Voca

Thank you for considering contributing to Voca.

Voca is an open-source, local-first document reader focused on turning user-provided documents into a synchronized reading and listening experience. The project values privacy, offline capability, accessible reading, provider independence and a contributor experience that does not require access to the maintainer's private infrastructure.

## Before contributing

Voca is currently being prepared for its first public release. Architecture and setup instructions may change while the release-readiness work is completed.

Do not commit credentials, private documents, production URLs, signing material, database dumps or environment-specific infrastructure identifiers. Examples and tests should use original, licensed or public-domain content.

## Development principles

Prefer local processing when technically reasonable. Keep optional hosted services behind explicit boundaries. A feature that uses an external provider should degrade clearly when that provider is not configured rather than making the core reader unusable.

Security-sensitive changes should include tests. Document parsing and rendering code must treat imported content as untrusted input.

## Development setup

The current application lives primarily under `frontend/`, with an optional fallback service under `backend/`. Until the local-only setup is finalized, consult `.env.example` and the repository README for the current development requirements.

Typical frontend development currently begins with:

```bash
cd frontend
npm ci
npm run dev
```

Run the available security checks with:

```bash
npm run test:security
```

Additional lint, typecheck, unit, integration and end-to-end commands will be documented as the public CI pipeline is completed.

## Pull requests

Keep changes focused and explain why the change is needed, how it was tested, whether it changes local/cloud behavior and whether it introduces or changes a third-party dependency.

For new provider integrations, keep provider-specific code outside core reader behavior and document any data that is transmitted externally.

For new document formats, include validation and representative copyright-safe fixtures.

## AI-assisted contributions

AI-assisted development is welcome, but contributors remain responsible for the code they submit. Review generated code, verify licensing and provenance, run the relevant tests and do not submit secrets or proprietary material to external tools without authorization.

## Licensing

Do not add third-party code, models, fonts, icons or assets unless their license is compatible with Voca and can be documented. Model licensing is treated separately from the application source license where necessary.
