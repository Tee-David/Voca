# Open-Source Foundation Complete

The private release-preparation branch now contains the repository-level foundation needed to move Voca into release-candidate engineering.

## Established

- problem-led project identity and local-first positioning;
- architecture, data flow, provider and ADR documentation;
- security/privacy policies and release security checklist;
- contributor quickstart and engineering quality expectations;
- testing, accessibility, performance, compatibility and dependency policies;
- roadmap, conduct, governance, maintainer and support guidance;
- structured issue/PR workflows and code ownership;
- CI, dependency audit reporting, Dependabot and lightweight source checks;
- release readiness, blockers, clean-snapshot, presentation and candidate evidence processes;
- first independent audit and audit log;
- draft public release narrative;
- explicit one-time final maintainer publication gate.

## Deliberately not claimed

The foundation pass does not claim that credentials were rotated, third-party licenses were verified, a clean candidate was executed, CI passed on that candidate, device/browser behavior was tested or a final release was audited. Those require real evidence.

## Next state

The next meaningful artifact is the **clean public release candidate**. It should not be created by publishing the current private Git history. See `CANDIDATE_ENTRY_CRITERIA.md`, `PUBLIC_RELEASE_PLAN.md`, `CLEAN_SNAPSHOT_CHECKLIST.md` and `RELEASE_CANDIDATE_TEMPLATE.md`.

## External prerequisite

The one confirmed external security action that cannot be replaced by repository work is rotation/revocation of the R2 credential historically exposed in private Git history. Candidate publication remains blocked until that is confirmed.

For the concise current state, see `STATUS.md`.