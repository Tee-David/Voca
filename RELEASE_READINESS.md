# Voca Open Source Release Readiness

Voca is being prepared as a local-first open-source reading platform. This file is the publication gate. A checked box should represent verified evidence, not intent.

## Product and identity

- [x] Problem and project positioning are documented
- [x] Public identity and tagline are established
- [x] Maintainer identity is documented
- [x] Local-first principle is documented
- [x] Responsible-use and copyright boundaries are documented

## Security and privacy

- [x] Security policy exists
- [x] Local versus optional remote processing is documented
- [x] Hardcoded maintainer API URL removed from mobile build script
- [x] Existing SSRF and object-authorization regression checks identified
- [ ] Historical R2 credentials revoked or rotated by the infrastructure owner
- [ ] Exact public candidate scanned for secrets
- [ ] Public candidate contains no private deployment identifiers, test accounts or personal data
- [ ] Android candidate contains no signing material or production-only configuration
- [ ] Clean public Git history contains no historical credentials

## Architecture and configuration

- [x] Core reading pipeline documented
- [x] Target provider boundaries documented
- [x] Optional cloud capabilities distinguished from the reader core
- [x] Repository structure documented without forcing a cosmetic monorepo rewrite
- [ ] Core local reading path independently verified without maintainer cloud credentials
- [ ] Environment template independently verified from a clean setup
- [ ] Remaining provider-specific coupling reviewed and either separated or explicitly documented

## Quality

- [x] Security regression test command exists
- [x] CI definition includes deterministic install, type check, security tests and production build
- [x] CI definition includes production dependency audit
- [ ] CI passes on the exact release candidate
- [ ] Clean production build verified independently
- [ ] Representative document ingestion/playback flows verified
- [ ] Oversized/malformed upload and parser abuse cases reviewed for the candidate

## Licensing and content

- [x] Application license intentionally withheld until audit is complete
- [ ] Exact Kokoro model and weight license verified
- [ ] kokoro-js license verified for intended distribution
- [ ] Fonts, icons and bundled assets audited
- [ ] Test/sample documents confirmed original, licensed, synthetic or public domain
- [ ] Third-party notices added where required
- [ ] Final application source license selected and added

## Documentation and community

- [x] README repositioned for public open-source use
- [x] CONTRIBUTING.md
- [x] SECURITY.md
- [x] CODE_OF_CONDUCT.md
- [x] ARCHITECTURE.md
- [x] ROADMAP.md
- [x] CHANGELOG.md
- [x] Privacy-boundary documentation
- [x] Release-process documentation
- [x] Pull request template
- [x] Bug report form
- [x] Feature request form
- [x] Dependabot configuration
- [x] Independent audit document created
- [ ] README/setup followed successfully by a fresh contributor environment

## Clean public release

- [ ] Audited clean source snapshot created without private repository history
- [ ] Final diff reviewed for private infrastructure residue
- [ ] Release candidate commit identified
- [ ] Release candidate independently audited
- [ ] Release notes finalized

## Maintainer publication approval

- [ ] Taiwo David Dayomola explicitly approves the audited release candidate for public release

Publication must not happen before the final checkbox is explicitly approved.

## Known hard blockers

1. Private Git history records that live R2 credentials were previously committed. Removal from the working tree is not sufficient. The credentials must be rotated and the public release must use clean history.
2. Licensing for the exact speech model/weights and redistributed assets must be verified before an application license is selected.
3. The clean-install/local-core experience and CI must pass on the exact candidate, not merely on an earlier private-development commit.
