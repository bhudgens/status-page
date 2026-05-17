# Read GitHub State with gh

## Status

Accepted

## Context

The status page is meant to use GitHub as its backend database. The builder must read issues, labels, comments, and recently closed incidents during GitHub Actions runs, while remaining easy to reproduce locally during development.

## Decision

Milestone one will use the `gh` CLI as the primary GitHub data reader. The builder should call commands such as `gh issue list` and `gh issue view` with JSON output, then derive the status model from those results.

## Why

Using `gh` keeps the data path visible, scriptable, and easy to debug from the same repo clone that Actions uses. Direct REST or GraphQL calls would provide more control, but would make the first implementation more opaque and less aligned with the project goal of GitHub as the inspectable backend. The project can add direct API calls later only where `gh` cannot expose required data cleanly.

## Consequences

The builder depends on `gh` being available and authenticated in CI and local runs. Command failures should produce clear diagnostics that include the failed operation and enough context to reproduce it.
