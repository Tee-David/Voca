# Release Candidate Entry Criteria

Do not create or label a Voca release candidate until these entry conditions are satisfied.

## Required before candidate creation

- [ ] Historically exposed R2 credential is confirmed rotated/revoked
- [ ] Exact Kokoro runtime/model license evidence is recorded
- [ ] Redistributed asset/fixture provenance is sufficiently audited to choose a source license
- [ ] Intended clean source snapshot contents are agreed by the release audit

## Then create the clean candidate

Follow `CLEAN_SNAPSHOT_CHECKLIST.md` and `PUBLIC_RELEASE_PLAN.md`. Initialize new Git history, scan it, and execute `RELEASE_CANDIDATE_TEMPLATE.md` against the exact commit.

This entry gate prevents a misleading "RC" label from being attached to a branch that is still known to contain unresolved credential or licensing blockers.