# Voca Open Source Release Readiness

Voca is being prepared as a local-first open-source reading platform. This file is the publication gate. A checked box represents verified evidence, not intent.

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
- [x] Private release-preparation head passes secret scanning
- [x] Unverified public raster assets removed
- [ ] Historical R2 credentials revoked or rotated by the infrastructure owner
- [ ] Exact clean public candidate scanned for secrets
- [ ] Public candidate contains no private deployment identifiers, test accounts or personal data
- [ ] Android candidate contains no signing material or production-only configuration
- [ ] Clean public Git history contains no historical credentials

## Architecture and configuration

- [x] Core reading pipeline documented
- [x] Target provider boundaries documented
- [x] Optional cloud capabilities distinguished from the reader core
- [x] Repository structure documented without forcing a cosmetic monorepo rewrite
- [x] Environment example rewritten with sanitized provider-neutral placeholders
- [ ] Core local reading path independently verified without maintainer cloud credentials
- [ ] Environment template independently verified from a clean setup
- [ ] Remaining provider-specific coupling reviewed and either separated or explicitly documented

## Quality

- [x] Security regression test command exists
- [x] CI definition includes deterministic install, type check, security tests and production build
- [x] CI definition includes production dependency audit
- [x] Latest private release-preparation CI passes
- [ ] CI passes on the exact clean release candidate
- [ ] Clean production build verified independently
- [ ] Representative document ingestion/playback flows verified
- [ ] Oversized/malformed upload and parser abuse cases reviewed for the candidate

## Licensing and content

- [x] Exact Kokoro base model/weight licensing evidence verified as Apache-2.0
- [x] `kokoro-js` licensing evidence reviewed for intended distribution
- [x] Unexplained raster assets removed
- [x] Default unused framework public assets removed from release-preparation branch
- [x] Final application source license selected and added: Apache-2.0
- [ ] Remaining generated/bundled asset notice requirements reviewed on clean candidate
- [ ] Test/sample documents confirmed original, licensed, synthetic or public domain on clean candidate
- [ ] Automated dependency-license inventory captured for exact candidate
- [ ] Third-party notices added if final inventory requires them

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

- [ ] Taiwo David Dayomola explicitly approves the exact audited release candidate for public release

Publication must not happen before the final checkbox is explicitly approved.

## Remaining hard blockers

1. Private Git history records that live R2 credentials were previously committed. Removal from the working tree is not sufficient. The affected credential must be revoked or rotated by the infrastructure owner.
2. The public release must use clean Git history rather than exposing the existing private development history.
3. The clean-install/local-core experience, final asset/dependency inventory, CI, secret scan and independent audit must pass on the exact clean candidate.
