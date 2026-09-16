# Public Release Plan

The first public Voca repository should be treated as a release artifact produced from the audited private codebase, not as a visibility toggle.

## Source of truth

Finish engineering and review on the private release-preparation branch. Once the release gate is otherwise ready, export the intended tracked source tree while excluding private history, ignored/generated files and any material rejected by the release audit.

## Clean history

Initialize new Git history for the audited snapshot. The first public commit should describe Voca as the initial open-source release rather than import the private repository's historical commit graph.

This protects users from historical credentials and gives contributors a public history whose commits correspond to the open-source project they are actually joining.

## Candidate checks

Run the release candidate template against that clean repository, including full-history secret scanning. Review the clean tree independently rather than assuming sanitization was correct because the source branch passed CI.

## Repository presentation

Before publication, verify the README rendering, repository description, topics, social preview/artwork, issue forms, security reporting path and release notes. Screenshots or demo material must use safe documents.

## Publication

The clean repository remains private until the exact candidate is approved by Taiwo David Dayomola. After approval, publish that candidate, create the release/tag, then perform a post-publication smoke review from a logged-out/new-contributor perspective.

## Private development repository

Do not delete or expose the private development repository as part of the public launch. It may remain useful for provenance and for verifying what was intentionally excluded from the public history.