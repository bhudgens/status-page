# Warn and Render Unknown System Labels

## Status

Accepted

## Context

System labels map incidents to configured systems, but incident entry can be messy during an outage. A maintainer might apply a `system:*` label that does not exist in `config/status-page.yml`.

## Decision

When an incident has an unknown `system:*` label, the builder will continue rendering the incident. The incident should appear at least as a global incident, and `status.json` should include a warning describing the unknown label.

## Why

Publishing that a problem exists is more important than enforcing perfect metadata during an incident. Failing the build or ignoring the label could hide operational impact. A warning preserves the cleanup signal without blocking the public status update.

## Consequences

The renderer needs a fallback path for incidents with unknown system labels. Tests should verify that unknown labels produce warnings and that the incident still appears in the generated status output.
