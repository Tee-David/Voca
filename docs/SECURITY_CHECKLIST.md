# Security Review Checklist

Use this checklist for the exact clean release candidate. Do not mark an item complete from documentation alone.

## Repository and credentials

- [ ] Full clean-candidate history scanned with a dedicated secret scanner
- [ ] No `.env`, keystore, signing, private-key or production credential files tracked
- [ ] Historically exposed R2 credential confirmed rotated/revoked
- [ ] No production-only deployment URLs or identifiers unintentionally embedded
- [ ] Generated logs and debug dumps reviewed

## Authentication and authorization

- [ ] Cookie and mobile Bearer paths reviewed
- [ ] Cross-user book, progress, annotation and storage access tested
- [ ] Password and token endpoints rate-limited appropriately for deployment model
- [ ] Error responses do not leak sensitive authentication state

## Network and SSRF

- [ ] Remote URL fetches require appropriate authorization
- [ ] Private/reserved IPv4 and IPv6 destinations rejected
- [ ] Redirect destinations revalidated
- [ ] Response size and content type bounded
- [ ] CORS allows only intentional origins when credentials are enabled

## Documents and uploads

- [ ] File size limits enforced before expensive processing
- [ ] MIME/type confusion reviewed
- [ ] Filenames and paths cannot escape controlled storage
- [ ] Malformed PDF/EPUB/DOCX/TXT cases fail safely
- [ ] OCR inputs and subprocess arguments are controlled
- [ ] Temporary files have a bounded lifecycle
- [ ] Concurrency/resource exhaustion considered

## Storage

- [ ] Object keys are minted/validated server-side where ownership matters
- [ ] Signed operations cannot target another user's object
- [ ] Public bucket/object behavior is intentional and documented
- [ ] Provider credentials remain server-side

## Client and mobile

- [ ] No secrets exposed through `NEXT_PUBLIC_*`
- [x] Maintainer API URL removed from the mobile build script
- [ ] Exact clean candidate contains no maintainer API URL in generated/public mobile configuration
- [ ] No release signing keys or keystore properties tracked
- [ ] Deep links and external URLs reviewed
- [ ] Offline caches do not unintentionally expose sensitive document data across users

## AI and optional providers

- [ ] Remote provider use is optional where documented
- [ ] Data sent to providers is documented
- [ ] Paid-provider abuse paths have quotas/rate controls where needed
- [ ] Logs avoid prompts/document bodies unless explicitly required and protected

## Release

- [ ] Security regression suite passes
- [ ] Production build passes
- [ ] Dependency audit reviewed
- [ ] Final candidate diff reviewed
- [ ] Independent reviewer signs off on unresolved-risk notes