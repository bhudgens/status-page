# Deploy with GitHub Pages Artifacts

## Status

Accepted

## Context

The status page is generated from GitHub issue state by GitHub Actions. The previous prototype committed generated `docs/` output, which made source control noisy and blurred the line between source and build artifacts.

## Decision

GitHub Actions will build the static site into `_site/`, upload it as a GitHub Pages artifact, and deploy it with the official Pages deployment flow.

## Why

Artifact deployment keeps generated files out of the repository while still using GitHub Pages as the public host. It matches the project goal that GitHub Actions renders the page when issue state changes, without requiring commits for every rendered output change.

## Consequences

The repository must configure GitHub Pages for GitHub Actions deployment. `_site/` remains ignored locally, and workflows need `pages: write` and `id-token: write` permissions.
