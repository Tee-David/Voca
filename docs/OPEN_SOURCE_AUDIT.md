# Open Source Audit

This document records the independent release-preparation review of Voca's current private repository. It is intentionally conservative: an unchecked item is not assumed safe.

## Executive finding

The project has a credible product identity and an increasingly clear local-first architecture, but the private repository itself must not be published with its existing Git history. Historical commits explicitly confirm that live object-storage credentials were committed. A clean public history plus credential rotation is therefore a hard release requirement.

## Security

### Confirmed improvements

The existing application has dedicated regression checks for SSRF and object/storage authorization behavior. A prior security pass also hardened authenticated fetching, object-key ownership, progress ownership, CORS, rate limiting, upload limits and malformed request handling.

### Blocking

- Credentials exposed in historical commits must be revoked/rotated.
- The public repository must be created from an audited clean snapshot rather than by exposing the private history.
- Final secret scanning must be run against the exact public candidate.

### Follow-up

- Verify production-grade rate limiting for hosted deployments rather than relying only on per-instance memory.
- Continue parser/upload fuzz and abuse testing.
- Verify Android signing configuration immediately before candidate creation.

## Architecture and privacy

The documented target correctly separates the reading pipeline from optional storage, AI, sync, transcription, remote TTS and OCR providers. The codebase predates that model, so provider separation is ongoing and should be incremental rather than a cosmetic rewrite.

The mobile build no longer hardcodes the maintainer's Vercel API endpoint. Remaining hosted assumptions should be treated as optional integrations and documented at each data boundary.

## Developer experience

The current private application was designed around real hosted infrastructure, so the clean-install path is not yet considered independently verified. The public candidate must demonstrate a useful core experience without access to the maintainer's database, bucket or AI credentials.

## Testing and automation

Security regression tests exist. CI now specifies deterministic dependency installation, TypeScript checking, security tests, production build and a high-severity production dependency audit. The workflow still needs to pass on the exact release-prep head before this section can be marked complete.

## Documentation and community

README, architecture, contribution, security, roadmap, conduct, privacy boundary, release process, changelog, issue forms and pull request guidance are present in release preparation. Documentation should be tested by following it from a clean environment before release.

## Licensing

Application licensing remains deliberately unresolved until the exact Kokoro model/weights, kokoro-js, fonts, icons, sample assets and other redistributed material are audited. Do not add a permissive application LICENSE merely because the JavaScript dependencies are individually permissive.

## Copyright and fixtures

The release candidate must contain no copyrighted books or private user documents. Tests and examples should use original, licensed, synthetic or public-domain material.

## Release verdict

**NOT YET A PUBLIC RELEASE CANDIDATE.**

This is a release-preparation finding, not a quality judgment on the product. The blocking conditions are concrete: clean public history, credential rotation confirmation, licensing verification, clean-install/local-core verification, passing CI on the candidate and final secret scan.

Once those conditions pass, the candidate can move to maintainer approval.