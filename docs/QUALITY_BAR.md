# Voca Quality Bar

A contribution or release should improve Voca without weakening the properties that make the project worth using.

## Product

The reading experience should be understandable without explaining the implementation. Loading, playback, progress and errors should have deliberate states. Accessibility and offline behavior are product requirements, not polish reserved for later.

## Engineering

Prefer explicit boundaries, typed interfaces, deterministic behavior and small changes that can be tested. Do not introduce a framework or abstraction merely because it is fashionable. Dependencies should earn their maintenance and bundle cost.

## Local first

A new capability should not make a previously local workflow require an account or remote API without a compelling reason and explicit design discussion.

## Privacy

Users should be able to understand when document content or derived data leaves their device. Logs should not become a second copy of the user's document.

## Security

Treat documents, URLs and client-supplied identifiers as untrusted. Security fixes should include regression evidence where practical. Removing an exposed credential from source does not unexpose it.

## Testing

Test the behavior and boundary most likely to regress, not only implementation details. Bugs in security-sensitive code deserve a regression test. Release verification includes real representative document flows in addition to unit checks.

## Documentation

A new contributor should be able to understand why a subsystem exists, how to work on it and which assumptions are safe. Documentation must distinguish current behavior from roadmap intent.

## Open-source readiness

No contribution may rely on a maintainer-only credential, private document, inaccessible URL or undocumented production resource to pass its normal development path.

## Release discipline

A green CI run does not override an unresolved credential, licensing, privacy or clean-history blocker. The release gate is evidence-based.