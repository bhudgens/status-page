# Map Systems with Exact GitHub Labels

## Status

Accepted

## Context

The status page can represent multiple public systems, and GitHub Issues need a simple way to declare which systems an incident affects. The config could support arbitrary label aliases per system, infer systems from labels dynamically, or require a convention.

## Decision

Milestone one will use exact GitHub labels in the form `system:<id>`, where `<id>` exactly matches a configured system id in `config/status-page.yml`.

## Why

This is the easiest model to implement and the most directly compatible with GitHub labels. GitHub labels are plain strings, so exact `system:<id>` matching keeps issue authoring obvious, parsing simple, and documentation easy to follow. The config still owns display names, categories, descriptions, and ordering, while aliases and dynamic system creation are deferred until there is a real need.

## Consequences

Teams must create labels that match configured system ids exactly. The first builder should fail clearly when an issue uses a `system:*` label that does not map to a configured system.
