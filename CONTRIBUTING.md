# Contributing to Voca

Thanks for helping improve Voca. The project is building a local-first reading and listening platform, so contributions are evaluated not only for whether they work, but for how they affect privacy, offline capability, security, accessibility and provider independence.

## Before you start

Read the README, `ARCHITECTURE.md`, `docs/LOCAL_FIRST_PRINCIPLES.md` and `docs/QUALITY_BAR.md`. For setup, use `docs/CONTRIBUTOR_QUICKSTART.md`.

For a large architecture, provider, authentication, persistence or privacy change, open a design discussion before investing in a large implementation.

## Principles

- Keep local-capable reading workflows local where practical.
- Treat hosted storage, AI, sync, transcription, OCR and remote TTS as explicit provider boundaries.
- Never commit secrets, private user documents, production identifiers or signing material.
- Use synthetic, original, licensed or public-domain test documents.
- Prefer focused changes with regression evidence over broad rewrites.
- Preserve accessibility and offline behavior when changing the reader.

## Development

The primary application lives in `frontend/`.

```bash
cd frontend
npm ci
npm run dev
```

Before submitting a frontend change, run the checks relevant to it:

```bash
npx tsc --noEmit
npm run test:security
npm run build
```

See `docs/TESTING.md` for the testing strategy and `docs/DEPENDENCY_POLICY.md` before introducing a substantial dependency, model or asset.

## Pull requests

A good pull request explains the problem, the change, verification and any privacy/provider implications. Keep unrelated refactors separate where possible. UI changes should include safe visual evidence when it helps review.

Security-sensitive behavior should include a regression test where practical.

## Security reports

Do not open a public issue for an undisclosed vulnerability. Follow `SECURITY.md`.

## AI-assisted contributions

AI-assisted code is welcome when the contributor understands and takes responsibility for the submitted change. Review generated code, remove invented assumptions, run the relevant checks and disclose important generated dependencies or copied material just as you would for manually written code.

## Copyright and licensing

Do not contribute copyrighted books, DRM-circumvention code, private documents or material you do not have the right to redistribute. Contributors must have the right to submit their code and assets.

The first public application license is being selected after the exact third-party/model asset audit. Accepted public contributions will be made under the project's published source license once that release license is established.

## Conduct

Participation in Voca-managed spaces is governed by `CODE_OF_CONDUCT.md`.