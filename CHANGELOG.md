# Changelog

All notable public changes to Voca will be documented here.

The project is preparing its first open-source release. Private-development history is intentionally not being converted into a public changelog because it may contain infrastructure details and does not represent a stable public API.

## Unreleased

### Open-source foundation

- Repositioned Voca as a local-first reading and listening platform
- Documented core architecture, data flows, provider boundaries and architectural decisions
- Added security, privacy, contribution, conduct, governance, support and maintainer guidance
- Added testing, accessibility, performance, compatibility, dependency and quality policies
- Added structured issue forms, pull request guidance and CODEOWNERS
- Added CI, dependency audit reporting, Dependabot and tracked-source credential/signing checks
- Added release-readiness, clean-snapshot, licensing, security, presentation, audit and release-candidate gates
- Removed the maintainer-hosted API URL from the mobile build script

### Security

- Public release is blocked on clean-history verification and rotation of credentials previously exposed in private Git history
- Existing security regression coverage includes SSRF/address and storage/object authorization checks

## Versioning

Voca will adopt semantic versioning for public releases once the public API and extension/provider surfaces are defined.