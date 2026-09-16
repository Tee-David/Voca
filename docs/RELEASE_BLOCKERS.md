# Release Blockers

This is the operational list for the first public Voca release. Detailed evidence lives in `RELEASE_READINESS.md` and `docs/OPEN_SOURCE_AUDIT.md`.

## Blocker 1: rotate historically exposed R2 credentials

A private historical commit confirms that live Cloudflare R2 credentials were once tracked. The source files were removed, but deletion does not revoke a credential. The infrastructure owner must rotate or revoke the affected token before publication.

**Owner:** maintainer/infrastructure owner  
**Can repository work alone close this?** No.

## Blocker 2: clean public history

The public repository must start from an audited source snapshot with new Git history. Do not change the visibility of the current private development repository and call that the open-source release.

The clean candidate must receive a dedicated full-history secret scan and residue review.

**Owner:** release engineering  
**Can current private branch be published instead?** No.

## Blocker 3: exact candidate verification

- Follow setup from a clean environment
- Verify a useful local/core reading path without maintainer cloud credentials
- Pass CI on the exact candidate
- Run final full-history secret scanning
- Review malformed/oversized document handling and security-sensitive flows
- Confirm no Android signing material or maintainer endpoint is embedded
- Review generated/bundled asset notices

**Owner:** release engineering/independent reviewer

## Blocker 4: final candidate audit and presentation

Complete the release-candidate template, security checklist, rendered README review and public-presentation checklist against the clean repository. Resolve every release-blocking audit finding.

**Owner:** independent reviewer/release engineering

## Final gate

After the blockers above are closed, identify the exact release candidate. Publication then waits for one explicit decision from Taiwo David Dayomola: approve that audited candidate for public release.

## Closed during release preparation

- Project identity and public narrative established
- Architecture and privacy boundaries documented
- Contribution, security, governance and community files created
- CI, dependency automation and secret scanning established
- Hardcoded hosted mobile API URL removed
- Unverified raster assets removed
- Default framework public assets removed from the candidate branch
- Kokoro runtime/base-model licensing evidence reviewed
- Apache License 2.0 selected and added for Voca application source
- Latest private release-preparation CI and secret scan pass

## Current stopping condition

Repository work continues until the clean release candidate is mechanically ready. Publication remains prohibited until the historical credential is revoked or rotated and the maintainer explicitly approves the exact audited candidate.