# Warn and Default Missing Severity

## Status

Accepted

## Context

Open issues represent incidents, and severity labels determine the displayed health state. During a real incident, a maintainer may forget to add a severity label, but the status page should still show that something is wrong.

## Decision

When an open incident has no `severity:*` label, the builder will default it to the configured default severity and include a non-blocking warning in `status.json`.

## Why

This keeps the status page useful during an outage while still making metadata problems visible. Failing the build would hide an active incident at the worst time, while silently defaulting would make cleanup easy to miss.

## Consequences

The status model needs a warnings collection. Tests should verify that missing severity labels render with the default severity and produce a warning.
