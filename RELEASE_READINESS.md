# Voca Open Source Release Readiness

This document is the publication gate for Voca. The repository must remain private until every blocking item is complete and the maintainer explicitly approves publication.

## Security and privacy

- [ ] Full Git history audited for secrets and sensitive values
- [ ] Previously committed Cloudflare R2 credentials rotated
- [ ] Historical secrets removed from the history intended for public release
- [ ] Personal information and test accounts removed
- [ ] Deployment-specific identifiers and URLs removed or replaced with safe examples
- [ ] Android signing configuration and artifacts audited and sanitized
- [ ] Logs, generated artifacts, certificates and debugging data audited
- [ ] Secret scanning passes on the release history

## Architecture and configuration

- [ ] Core reading path works without paid infrastructure
- [ ] Local-first TTS path verified
- [ ] Hosted providers are optional and isolated behind clear boundaries
- [ ] Environment configuration is documented as required vs optional
- [ ] Hardcoded hosted-instance configuration removed
- [ ] Clean local installation verified from a fresh clone
- [ ] Self-hosted setup documented and verified

## Quality

- [ ] Production build passes
- [ ] Type checking passes
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Security tests pass
- [ ] End-to-end core reader flow passes
- [ ] Offline behavior verified
- [ ] Dependency audit completed
- [ ] Reproducible installation verified with committed lockfiles

## Licensing and responsible use

- [ ] Application source license selected
- [ ] kokoro-js license audited
- [ ] Kokoro model and model-weight licenses documented separately
- [ ] Fonts, icons and bundled assets audited
- [ ] Sample documents are original, licensed or public domain
- [ ] Third-party adapted code audited
- [ ] Copyright and responsible-use guidance documented

## Open source project health

- [ ] README.md updated for the local-first open-source positioning
- [ ] LICENSE present
- [ ] CONTRIBUTING.md present
- [ ] SECURITY.md present
- [ ] CODE_OF_CONDUCT.md present
- [ ] CHANGELOG.md present
- [ ] ARCHITECTURE.md present
- [ ] ROADMAP.md present
- [ ] Issue templates present
- [ ] Pull request template present
- [ ] CI validates install, lint, typecheck, tests, build and security checks
- [ ] Contributor setup does not require maintainer cloud credentials

## Release blockers discovered during audit

### Previously committed R2 credentials

A prior security commit records that live Cloudflare R2 credentials had been committed in tracked scripts. Removing those files from the current tree does not remove the values from Git history. The associated credentials must be rotated and the public release history must not expose them.

Status: **BLOCKING**

### Hosted mobile API URL

The current frontend package scripts contain a Voca Vercel deployment URL in the mobile build command. Public configuration should use documented environment variables rather than embedding a maintainer deployment target.

Status: **BLOCKING**

## Maintainer approval

- [ ] Taiwo David Dayomola has reviewed this report
- [ ] Taiwo David Dayomola explicitly approves making Voca public

Publication must not happen before the final approval above.
