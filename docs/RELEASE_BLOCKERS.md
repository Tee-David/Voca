# Release Blockers

This is the short operational list for the first public Voca release. Detailed evidence lives in `RELEASE_READINESS.md` and `docs/OPEN_SOURCE_AUDIT.md`.

## Blocker 1: rotate historically exposed R2 credentials

A private historical commit confirms that live Cloudflare R2 credentials were once tracked. The source files were removed, but deletion does not revoke a credential. The infrastructure owner must rotate/revoke the affected token and confirm the application uses replacement credentials before publication.

**Owner:** maintainer/infrastructure owner  
**Can repository work alone close this?** No.

## Blocker 2: create a clean public history

The public repository must start from an audited source snapshot with new Git history. Do not change the visibility of the current private development repository and call that the open-source release.

The clean candidate must receive a dedicated full-history secret scan and residue review.

**Owner:** release engineering  
**Can current private branch be published instead?** No.

## Blocker 3: licensing evidence

Verify the exact Kokoro model/weights and all redistributed fonts, icons, Android artwork, fixtures and other assets. Select Voca's source license only after compatibility is established.

**Owner:** release engineering/maintainer  
**Evidence location:** `docs/THIRD_PARTY_AUDIT.md`

## Blocker 4: candidate verification

- Follow setup from a clean environment
- Verify a useful local/core reading path without maintainer cloud credentials
- Pass CI on the exact candidate
- Run final full-history secret scanning
- Review malformed/oversized document handling and security-sensitive flows
- Confirm no Android signing material or maintainer endpoint is embedded

**Owner:** release engineering/independent reviewer

## Blocker 5: final candidate audit and presentation

Complete the release-candidate template, security checklist, rendered README review and public-presentation checklist against the clean repository. Resolve all release-blocking audit findings.

**Owner:** independent reviewer/release engineering

## Final gate

After the blockers above are closed, identify the exact release candidate. Publication then waits for one explicit decision from Taiwo David Dayomola: approve that audited candidate for public release.

## What is no longer a blocker

The initial project identity, architecture documentation, contribution policy, security policy, community templates, governance, testing strategy, CI definition, dependency automation, release process and public-release narrative are now established on the private release-preparation branch.