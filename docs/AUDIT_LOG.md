# Open-Source Audit Log

This log records release-preparation changes that materially affect the public-readiness assessment.

## Foundation pass

- Established release-readiness gate and explicit maintainer publication approval.
- Added security and contribution policies.
- Rebuilt README around Voca's user problem and local-first identity.
- Documented architecture, data flow, provider boundaries and architecture decisions.
- Removed the maintainer-hosted Vercel API URL from the mobile build script.
- Added roadmap, conduct, governance, maintainer, support and community contribution workflows.
- Added CI for deterministic install, TypeScript, security regression tests, production build and backend syntax.
- Added dependency audit reporting, Dependabot and lightweight tracked-source credential/signing checks.
- Added privacy, configuration, testing, accessibility, performance, compatibility, dependency and quality guidance.
- Defined clean-history public release process, release candidate evidence, presentation review and final handoff.
- Recorded the historical R2 credential exposure as a non-negotiable release blocker rather than treating source deletion as remediation.
- Deliberately deferred the application license until exact model/runtime/asset licensing evidence is complete.

## Next audit event

The next formal audit should target the clean public release candidate rather than repeatedly re-auditing the private historical repository. It must include full-history secret scanning, licensing evidence, clean-install/local-core verification, CI results, representative document flows, security checklist and public presentation review.