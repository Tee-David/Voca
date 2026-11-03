# Clean Snapshot Checklist

Use this when producing the source tree that will become Voca's new public Git history.

## Include intentionally

- application source required for supported web/mobile behavior;
- optional backend source if it is part of the public release;
- lockfiles and reproducible configuration templates;
- public documentation and community files;
- tests and safe fixtures;
- CI and dependency automation;
- original or license-compatible public assets.

## Exclude intentionally

- `.git` and all private development history;
- `.env*` except explicitly sanitized examples;
- credentials, tokens and production connection strings;
- Android keystores/signing properties;
- downloaded environment-specific certificates;
- build outputs and caches;
- local logs/debug dumps;
- private user documents;
- copyrighted books or unverified fixtures;
- maintainer-only deployment configuration;
- obsolete scripts that exist only to operate private infrastructure;
- generated files that a clean install/build can reproduce.

## After export

1. Inspect the filesystem before `git init`.
2. Run a dedicated secret scan on the tree.
3. Initialize new Git history.
4. Commit the audited snapshot.
5. Run a full-history secret scan on the new history.
6. Run the release-candidate checks from that repository.
7. Review the diff/tree independently against this checklist.

The clean snapshot is not considered safe merely because `.git` was removed. Source files and generated assets still require inspection.