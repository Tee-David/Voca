# Release Blockers

This is the short operational list for the first public Voca release. Detailed evidence lives in `RELEASE_READINESS.md` and `docs/OPEN_SOURCE_AUDIT.md`.

## Requires maintainer/infrastructure action

### Rotate historically exposed R2 credentials

A private historical commit confirms that live Cloudflare R2 credentials were once tracked. The source files were removed, but deletion does not revoke a credential. The infrastructure owner must rotate/revoke the affected token and confirm that the application is using replacement credentials before publication.

This cannot be solved by documentation, a later commit or making the repository private again.

## Requires clean candidate creation

The public repository must start from an audited source snapshot with new Git history. Do not change the visibility of the current private development repository and call that the open-source release.

The clean candidate must then receive a full secret scan and residue review.

## Requires licensing evidence

Verify the exact Kokoro model/weights and all redistributed fonts, icons, Android artwork, fixtures and other assets. Select Voca's source license only after compatibility is established.

## Requires candidate verification

- Follow setup from a clean environment
- Verify a useful local/core reading path without maintainer cloud credentials
- Pass CI on the exact candidate
- Run final secret scanning
- Review malformed/oversized document handling and security-sensitive flows
- Confirm no Android signing material or maintainer endpoint is embedded

## Final gate

After the blockers above are closed, identify the release candidate and perform the final independent audit. Publication then waits for one explicit decision from Taiwo David Dayomola: approve the audited candidate for public release.