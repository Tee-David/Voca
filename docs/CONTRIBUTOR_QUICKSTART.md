# Contributor Quickstart

This guide describes the current release-preparation workflow. The final public quickstart must be verified from a clean machine before release.

## Prerequisites

- Git
- Node.js 20
- npm
- Python 3.11 only if working on the optional backend
- Android tooling only if working on the Capacitor application

## Frontend

```bash
git clone https://github.com/Tee-David/Voca.git
cd Voca/frontend
npm ci
npm run dev
```

For a first contribution, you do not need Android tooling unless the change affects Android behavior.

## Quality checks

Before opening a pull request, run:

```bash
npx tsc --noEmit
npm run test:security
npm run build
```

CI also audits production npm dependencies. Changes to the optional Python backend must at minimum compile cleanly.

## Configuration

Read `docs/CONFIGURATION.md` and the root `.env.example`. Do not ask another contributor for production credentials just to get started. If a feature requires an optional provider, use your own development credentials and document the boundary.

The mobile build accepts an externally supplied `NEXT_PUBLIC_API_BASE_URL` when intentionally paired with a hosted API. There is no maintainer-owned endpoint baked into the script.

## Choosing an issue

Good first contributions are usually focused parser fixes, accessibility improvements, deterministic tests, documentation corrections, performance fixes with evidence or isolated provider work.

Avoid beginning with a broad architecture rewrite. Voca's provider separation is intentionally incremental.

## Test documents

Never commit a private book or user document as a fixture. Create a minimal synthetic fixture, use original material, or use content whose public-domain/license status is clear.

## Security-sensitive changes

Authentication, URL fetching, file parsing, storage keys, upload handling, OCR execution and mobile configuration deserve focused security review. Update or add regression tests when changing these surfaces.

## Dependencies

Read `docs/DEPENDENCY_POLICY.md` before introducing a substantial package, model or redistributed asset. Model and asset licensing is part of the release boundary, not only a package-manager concern.

## Before you submit

Explain the problem, the change, how you verified it and any privacy or remote-provider implications. A reviewer should be able to understand why the change belongs in Voca without reverse-engineering your intent from the diff.