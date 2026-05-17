# Derive History from GitHub Issues

## Status

Accepted

## Context

The status page should show a familiar recent-history view, usually around 30 days, while still using GitHub Issues as the backend store. A snapshot file could record daily health, but that would reintroduce generated mutable data and commit churn.

## Decision

Milestone one will derive the recent history window from GitHub issues. An issue is an incident from `createdAt` until `closedAt`; if it is still open, its incident window runs until the build time. The builder will fetch open issues and recently closed issues whose incident windows overlap the configured history window.

Incidents with system labels affect those systems. Incidents without system labels affect the global status page.

## Why

This keeps GitHub Issues as the source of truth while still producing the kind of 30-day visual status history users expect. It avoids snapshot storage until there is a proven need for day-by-day historical reconstruction that cannot be recovered from issue metadata.

## Consequences

Historical display reflects current issue metadata. If labels or issue text are edited after the fact, the rendered history may change on the next build. This is acceptable for milestone one because the project values a simple GitHub-backed model over immutable incident accounting.
