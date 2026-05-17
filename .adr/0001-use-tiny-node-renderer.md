# Use a Tiny Node Renderer

## Status

Accepted

## Context

The previous prototype used Hugo and committed generated site output, which made the repo heavier than the product idea requires. The new vision is a GitHub-native status page where GitHub Issues provide incident data, GitHub Actions runs the build, and GitHub Pages hosts the static output.

## Decision

Milestone one will use a tiny Node.js renderer with no frontend framework and no static site generator. The renderer may shell out to `gh` to read issue data, load `config/status-page.yml`, derive a status model, and write static output.

## Why

Node.js is already well-supported in GitHub Actions, works cleanly with small test suites, and leaves room for simple browser-side code later if needed. A custom renderer keeps the repository focused on the GitHub-as-backend concept instead of framework conventions. Hugo, Deno, and Python were plausible alternatives, but Node gives the best fork-and-go path with the least extra explanation.

## Consequences

The project owns a small amount of rendering code. That code should stay boring, tested, and scoped to config parsing, GitHub issue ingestion, status derivation, and static file output.
