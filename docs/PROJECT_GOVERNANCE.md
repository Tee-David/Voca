# Project Governance

Voca currently uses a maintainer-led governance model appropriate for an early open-source project.

## Responsibilities

The maintainer sets product and architecture direction, coordinates security response, reviews or delegates contributions, maintains releases and protects the project's local-first and privacy principles.

Contributors influence direction through issues, pull requests, technical evidence and sustained participation. Significant changes should be discussed before a large implementation is submitted.

## Decision making

Routine changes are decided through review. For substantial architecture, privacy, compatibility or security changes, the project should document the problem, alternatives and tradeoffs. Consensus is preferred, but the maintainer may make the final decision when a decision is required.

## Changes that deserve design discussion

- new remote data-processing paths;
- new required hosted infrastructure;
- changes to document or provider interfaces;
- migrations that can affect user libraries or annotations;
- authentication and authorization changes;
- changes to public extension/provider APIs;
- large dependency or platform changes.

## Security authority

The maintainer may temporarily restrict details, revert a change or delay a release when there is a credible security or privacy risk. This should not be used to suppress ordinary technical criticism.

## Future governance

If Voca develops a sustained multi-maintainer community, governance should evolve to document maintainer nomination, decision rights and release authority more formally. The project should not invent a complex governance structure before the community exists.