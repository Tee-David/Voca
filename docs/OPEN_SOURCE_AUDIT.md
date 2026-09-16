# Open Source Audit

This is the first independent release-preparation review of Voca's private codebase. It is deliberately conservative: planned work is not counted as completed evidence.

## Executive finding

Voca now has a coherent open-source identity, a documented local-first architecture, security and privacy policies, contributor/community infrastructure, CI definitions and a controlled release process. The project is materially beyond the state of a private application being casually exposed on GitHub.

It is **not yet safe to publish**. The private repository itself must not be switched to public because historical commits explicitly confirm that live object-storage credentials were committed. The first public release must be a clean-history candidate after credential rotation and licensing verification.

## Product identity

**Finding: strong.**

The project leads with a real user problem: listening to owned documents should not inherently require audiobook repurchase, another subscription or automatic upload to proprietary cloud TTS. The tagline and local-first principles align with the architecture rather than functioning as branding alone.

## Architecture

**Finding: direction is clear; implementation separation remains in progress.**

The core reading pipeline, data flows, architectural decisions and target provider capabilities are documented. Hosted storage, AI, sync, transcription, remote TTS and OCR are explicitly treated as adapters. The decision not to force a monorepo rewrite is appropriate for a working application.

The release candidate still needs a code-level review for remaining hosted assumptions and proof that a useful local/core reading path works without maintainer cloud credentials.

## Developer experience

**Finding: documentation ready for verification.**

Contributor quickstart, configuration, compatibility, dependency policy, testing strategy and documentation index now exist. The unresolved question is empirical: a fresh environment must follow the instructions successfully. Documentation should not be marked verified until that happens.

## Security

**Finding: meaningful existing hardening, with one historical blocker.**

The existing application has regression checks for SSRF/address handling and storage/object authorization. A prior private security pass reports hardening authenticated fetching, object-key ownership, progress ownership, CORS, rate limiting, upload limits and malformed request handling.

The historical R2 credential exposure is release-blocking regardless of later source cleanup. Credential rotation and clean public history are mandatory. The exact clean candidate also needs a dedicated full-history secret scan and the security checklist completed.

## Testing and automation

**Finding: credible baseline, not yet complete release evidence.**

CI defines deterministic npm installation, TypeScript checking, security regression tests, a production build and Python syntax validation. Production dependency advisories are surfaced separately. Dependabot and a lightweight tracked-source credential/signing-file check are configured.

Broader representative document-flow tests and candidate CI results remain outstanding.

## Documentation and community

**Finding: strong first-release foundation.**

The repository now includes README, architecture, roadmap, contributing, security, conduct, governance, maintainers, support, privacy, configuration, testing, accessibility, performance, compatibility, dependency, release and audit guidance, plus structured issue forms, pull request guidance and CODEOWNERS.

This is sufficient community structure for an early maintainer-led project without inventing bureaucracy for a community that does not yet exist.

## Licensing

**Finding: unresolved and correctly blocking.**

Voca has not prematurely added an application license. The exact Kokoro runtime/model weights and redistributed fonts, icons, Android artwork, fixtures and assets must be verified first. A similarly named upstream project is not sufficient evidence for the exact artifact shipped by Voca.

## Presentation

**Finding: narrative ready; visual/public metadata verification pending.**

The README and draft release notes explain problem, promise, architecture, capabilities, setup and release status coherently. A rendered README review and presentation checklist exist. Public screenshots, demo material, social preview, topics and logged-out repository review remain candidate-stage tasks and must use safe content.

## Release engineering

**Finding: safe process defined.**

The public repository is specified as a release artifact produced from an audited snapshot and new Git history. The private development repository is not the publication target. Clean-snapshot, release-candidate and final maintainer handoff checklists exist.

## Release verdict

**FOUNDATION PASS COMPLETE. NOT YET A PUBLIC RELEASE CANDIDATE.**

The repository-only open-source foundation is now substantially complete. Remaining release blockers require evidence that cannot be honestly created by adding more policy files:

1. rotate/revoke historically exposed R2 credentials;
2. create and inspect the clean-history candidate;
3. verify exact model/runtime/asset licenses and select the application license;
4. prove clean setup and useful local/core reading without maintainer cloud credentials;
5. pass candidate CI, full-history secret scan and manual security/format verification;
6. complete presentation review on the clean repository;
7. perform the final independent candidate audit;
8. obtain explicit approval from Taiwo David Dayomola for that exact commit.

No publication should occur before those conditions are satisfied.