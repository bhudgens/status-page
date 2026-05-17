# Rebuild on Issue and Comment Events

## Status

Accepted

## Context

The status page is a static artifact generated from GitHub Issues. Issue metadata controls incident state, affected systems, severity, and timing. Issue comments can provide the public incident message shown on the page.

## Decision

GitHub Actions will rebuild the status page on issue events and issue comment events that can change rendered output: issue opened, edited, labeled, unlabeled, closed, reopened, and issue comment created, edited, or deleted.

## Why

These events cover the GitHub objects that define the status page without adding unrelated scheduled or repository-wide rebuilds. Rebuilding on comments is necessary because the latest issue comment is the public incident message when present.

## Consequences

The workflow should fetch current issue state during each run rather than trusting only the event payload. Manual or scheduled rebuilds can be added later if operational experience shows missed events or recovery needs.
