# Dependency Policy

Dependencies affect Voca's security, offline capability, bundle size, licensing and contributor experience.

## Adding a dependency

Before adding one, consider whether the platform or an existing dependency already provides the capability. Record why a substantial dependency is preferable to a small local implementation.

Review:

- maintenance activity and release health;
- license compatibility;
- known security advisories;
- browser/server boundary and accidental client bundling;
- package and runtime size;
- transitive dependency cost;
- whether it introduces network or telemetry behavior;
- whether it works in Voca's supported web/mobile environments.

## Versioning

Commit the lockfile. CI uses deterministic installation. Dependabot may propose updates, but automated update availability is not a reason to merge an incompatible major version without review.

## Security advisories

Production dependency audit findings are surfaced in CI and remain part of release readiness. During the initial open-source phase, the audit job is advisory for ordinary pull requests so an upstream advisory does not disable all contribution testing. A release candidate must have its findings reviewed and blocking vulnerabilities resolved or explicitly assessed before publication.

## Models and assets

Model weights, fonts and artwork are not ordinary npm dependencies. Their exact licenses and redistribution terms belong in the third-party audit even when code downloads them automatically.

## Removal

Prefer removing dependencies that are unused, abandoned, duplicated, unexpectedly server-only/client-only or materially harmful to security and performance. Dependency cleanup should be evidence-based rather than churn for its own sake.