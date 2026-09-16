# Changelog

All notable public changes to Voca will be documented here.

The project is preparing its first open-source release. Private-development history is intentionally not being converted into a public changelog because it may contain infrastructure details and does not represent a stable public API.

## Unreleased

### Added

- Open-source release-readiness gate
- Security policy
- Contribution guide
- Architecture documentation
- Public roadmap
- Community code of conduct

### Changed

- Repositioned project documentation around Voca's local-first reading architecture
- Removed the maintainer-hosted API URL from the Android/mobile build script

### Security

- Public release is blocked on clean-history verification and rotation of credentials previously exposed in private Git history
- Existing security regression coverage includes SSRF and storage/object authorization checks

## Versioning

Voca will adopt semantic versioning for public releases once the public API and extension surfaces are defined.