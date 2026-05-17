# Sync Labels from Repo Declaration

## Status

Accepted

## Context

The status page depends on GitHub labels for incident metadata. Missing or misspelled labels would make issue authoring harder and could produce confusing status output. The repo already has `.github/labels.json` as a declared label set.

## Decision

The project will provide an easy label sync command or workflow that reads `.github/labels.json` and creates or updates GitHub labels with `gh`. Runtime status rendering should read issue labels but should not mutate repository label settings.

## Why

This keeps label setup easy while preserving a clean separation between configuration and rendering. Automatically mutating labels during every status build would be surprising and would require broader permissions than rendering needs. Documenting labels without sync support would leave too much manual setup for new users.

## Consequences

The README must include easy-to-follow label setup instructions. A future implementation issue should add a create-or-update label sync command or workflow backed by `.github/labels.json`.
