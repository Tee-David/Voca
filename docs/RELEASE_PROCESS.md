# Release Process

Voca uses a deliberate release process because the project originated as a private application connected to real infrastructure.

## Before a release candidate

1. Complete the checklist in `RELEASE_READINESS.md`.
2. Confirm credentials that ever appeared in Git history have been revoked or rotated.
3. Produce the public source from a clean history that does not contain the private repository's historical secrets or infrastructure residue.
4. Verify third-party source, model, font, icon and asset licenses.
5. Run a clean install using only documented configuration.
6. Verify local/core reading behavior without maintainer cloud credentials.
7. Run type checking, security regression tests, production build and dependency audit.
8. Review Android configuration and ensure signing material and maintainer endpoints are absent.
9. Review repository fixtures and examples for copyright and personal data.
10. Update changelog and documentation.

## Release candidate

A release candidate is a specific clean commit that has passed the automated checks and the manual release-readiness review. Release candidates should be tagged using `vX.Y.Z-rc.N` once public versioning begins.

The release candidate is then subjected to an independent review focused on security, privacy, setup reproducibility, architecture, documentation and accidental private-infrastructure coupling.

## Publication gate

Passing CI is necessary but not sufficient. The first public release requires explicit approval from the maintainer, Taiwo David Dayomola.

No automation may make the private development repository public as a side effect of CI or release preparation.

## Stable release

After approval, create the public release from the audited clean history, tag the approved commit, publish release notes based on `CHANGELOG.md`, and verify the public repository from the perspective of a new contributor.