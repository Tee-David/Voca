# Configuration

Voca configuration is divided into core application settings and optional hosted-provider settings. The open-source target is that evaluating the core reader does not require accounts with multiple cloud vendors.

## Principles

- Never commit `.env` files or credentials.
- A public example value must be obviously synthetic.
- Optional provider credentials must not be required merely to import and read a local document where the platform supports local processing.
- Public mobile builds must not embed the maintainer's API endpoint.
- A provider that receives document-derived data must be documented as a remote privacy boundary.

## Current private-application variables

The existing application can use variables for database persistence, authentication, S3-compatible/R2 storage, optional AI and optional remote TTS. See the root `.env.example` for the current sanitized names.

These variables describe the existing hosted application. They are not a promise that every variable will remain mandatory in the public architecture.

## Mobile API endpoint

`NEXT_PUBLIC_API_BASE_URL` may be supplied externally when a mobile build is intentionally paired with a hosted Voca API. The build script does not provide a maintainer-owned default.

Example:

```bash
NEXT_PUBLIC_API_BASE_URL=https://your-voca.example npm run mobile:build
```

Leaving a hosted endpoint out should remain a valid architectural choice for local-capable features.

## Optional providers

As provider interfaces are extracted, configuration should move toward capability-specific sections rather than vendor assumptions. Expected capabilities include storage, AI, synchronization, transcription, remote TTS and OCR.

Each provider's documentation should state whether it is optional, which variables it uses, what data leaves the device and its fallback behavior.

## Production

Use the secret-management facility supplied by the deployment platform. Do not bake secrets into frontend environment variables, container images, Android resources, shell scripts or repository files.

Values prefixed with `NEXT_PUBLIC_` are exposed to browser/client code by Next.js and therefore must never contain secrets.