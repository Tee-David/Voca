# Maintainer Actions Required Before RC

Repository preparation can complete many tasks automatically, but these actions require access to external infrastructure or an explicit maintainer decision.

## 1. Cloudflare R2 credential rotation

Rotate or revoke the credential identified by the historical private-repository security finding. Confirm the deployed application uses replacement credentials and the old credential can no longer authenticate.

Do not paste the old or new credential into an issue, pull request or chat transcript used for public release preparation.

## 2. Licensing confirmation where provenance is private

If any icon, font, Android artwork, sample file or other asset was created or obtained outside the repository and its provenance cannot be established from source, provide the ownership/license evidence or replace it with clearly original/compatible material.

## 3. Final publication decision

No intermediate repository-preparation approval is required. Once the clean release candidate has passed all automated and independent checks, the maintainer will be asked once to approve that exact commit for public release.

Everything else should remain part of release engineering until a genuine external-access boundary is reached.