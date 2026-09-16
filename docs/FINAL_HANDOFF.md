# Final Open-Source Handoff

This file defines the point at which automated/repository preparation ends and the maintainer is asked for the single publication decision.

Do not request final approval until all release blockers are closed.

## Evidence package

The approval request should contain:

- exact clean release-candidate commit;
- CI/check results;
- full-history secret-scan result;
- confirmation that historically exposed credentials were rotated/revoked;
- completed third-party licensing audit and selected source license;
- clean-install/local-core verification;
- completed security checklist;
- completed public-presentation checklist;
- final independent audit findings;
- final release notes.

## Approval question

The maintainer should receive one unambiguous question tied to the exact commit:

> Approve Voca release candidate `<commit>` for public release?

A yes authorizes publication of that exact audited candidate. It does not authorize unrelated later changes or publication of the historical private repository.

## After approval

Publish the clean repository, create the approved tag/release, enable the intended public security reporting and community settings, then perform a logged-out smoke review. Any material issue discovered during that review should pause announcement/promotion until corrected.