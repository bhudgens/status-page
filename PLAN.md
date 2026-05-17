# Implementation Plan

This plan turns `VISION.md`, `CONTEXT.md`, and the ADRs into a first working GitHub-native status page.

## Goal

Build a static status page from GitHub Issues:

- GitHub Issues are incidents.
- GitHub labels provide status, severity, and system metadata.
- GitHub Actions reads issues with `gh`.
- A tiny Node renderer writes `_site/index.html`, `_site/status.json`, and CSS.
- GitHub Pages publishes the generated artifact.

## Acceptance Criteria

- A repo maintainer can edit `config/status-page.yml`, sync labels, open an issue, and see the generated status page reflect the incident.
- Open issues appear as active incidents.
- Closed issues from the configured history window appear as resolved/recent incidents when their incident window overlaps the window.
- The 30-day history shows each day as healthy or affected by the worst overlapping incident severity.
- Multiple incidents and multiple systems are supported at the same time.
- Incidents without `system:<id>` labels affect global status only.
- Incidents with unknown `system:*` labels still render globally and emit warnings.
- Incidents without `severity:*` labels use the configured default severity and emit warnings.
- The browser never calls GitHub; all GitHub reads happen during the build.
- Generated files are deployed through GitHub Pages artifacts and are not committed.

## Phase 1: Project Skeleton

Create the minimal Node project:

- `package.json`
- `package-lock.json`
- `src/`
- `test/`

Add scripts:

- `npm test`
- `npm run build`
- `npm run render`
- `npm run sync-labels`

Use Node's built-in test runner unless a clear need appears for heavier tooling.

Dependencies should stay small. Expected runtime dependency:

- YAML parser for `config/status-page.yml`

## Phase 2: Config Loading and Validation

Implement config loading from `config/status-page.yml`.

Validate:

- `site.title` is present.
- `site.history_days` is a positive integer.
- category ids are unique.
- system ids are unique.
- system categories, when present, reference configured categories.
- severity ids are unique and have numeric ranks.
- default status and severity exist.

Support zero configured systems as global-only mode.

Tests:

- valid example config loads.
- zero systems is valid.
- duplicate ids fail.
- invalid category references fail.
- missing defaults fail.

## Phase 3: GitHub Issue Reader

Implement a `gh`-backed issue reader.

Read:

- open issues.
- recently closed issues whose `closedAt` or `updatedAt` makes them candidates for the history window.
- issue number, title, body, state, labels, URL, created time, updated time, closed time, and comments.

Use `gh issue list` and `gh issue view` with JSON output. Prefer fetching enough candidate issues first, then viewing details only when needed.

Command failures must explain:

- which `gh` command failed.
- whether auth, repo detection, or output parsing seems likely.
- how to reproduce the command locally.

Tests:

- parse representative `gh` JSON.
- latest comment is available for public incident message.
- command failures produce useful errors.

## Phase 4: Incident Normalization

Convert GitHub issues into normalized incidents.

Rules:

- Any open issue is an open incident.
- A closed issue is a resolved incident.
- Incident duration is `createdAt` to `closedAt`, or `createdAt` to build time when still open.
- `system:<id>` labels map by exact configured system id.
- No system labels means global incident.
- Unknown `system:*` labels warn and render the incident globally.
- Missing severity warns and uses default severity.
- Missing status uses default status.
- Public incident message is latest issue comment if present, otherwise issue body.

Tests:

- issue with one system label maps to that system.
- issue with multiple system labels maps to multiple systems.
- unlabeled issue becomes global.
- unknown system label warns and still renders.
- missing severity warns and defaults.
- latest comment wins over body.

## Phase 5: Status Model

Build the `status.json` model as the renderer's stable internal contract.

Suggested shape:

```json
{
  "generated_at": "2026-05-17T00:00:00.000Z",
  "site": {},
  "overall": {
    "state": "operational",
    "severity": null,
    "active_incident_numbers": []
  },
  "systems": [],
  "active_incidents": [],
  "recent_incidents": [],
  "history": {
    "days": []
  },
  "warnings": []
}
```

Rules:

- Overall health is worst severity across all open incidents.
- System health is worst severity across open incidents affecting that system.
- Global incidents affect overall health and global history, not individual systems.
- Incident lists sort worst severity first, then newest first.
- History days cover the configured `history_days`, including today.
- Each history day is healthy unless an incident window overlaps that day.
- If several incidents overlap a day, the worst severity determines the day color.

Tests:

- multiple open incidents roll up by worst severity.
- global incidents do not mark every system affected.
- history day overlap handles open, closed, and multi-day incidents.
- recent incidents include closed issues in the history window.
- global-only mode renders an overall model with no systems.

## Phase 6: Static Renderer

Render `_site/`:

- `_site/index.html`
- `_site/status.json`
- `_site/assets/status.css`

Page layout:

- overall status banner.
- grouped systems with colored health indicators.
- 30-day history strip.
- active incidents sorted by worst severity, then newest.
- recent resolved incidents.
- warning section visible enough for maintainers but not dominant for public readers.

Design direction:

- classic public status-page layout.
- clean, polished, easy to scan.
- responsive on mobile.
- accessible colors with text labels, not color alone.

Tests:

- renderer writes all expected files.
- generated HTML contains overall state, system names, active incidents, recent incidents, and warnings.
- generated JSON matches the status model.

## Phase 7: Label Sync

Implement a label sync command that reads `.github/labels.json`.

Behavior:

- list existing labels with `gh label list`.
- create missing labels.
- update existing labels when color or description differs.
- print a concise summary.

Do not run label sync as part of status rendering.

Tests:

- computes create/update/no-op actions from sample labels.
- validates `.github/labels.json`.

README updates:

- document `npm run sync-labels`.
- show expected `gh` auth requirement.
- explain `system:<id>`, `status:<state>`, and `severity:<level>` labels.

## Phase 8: GitHub Actions

Add workflow for status builds and Pages deployment.

Triggers:

- issue opened, edited, labeled, unlabeled, closed, reopened.
- issue comment created, edited, deleted.

Workflow:

1. Checkout.
2. Setup Node.
3. Install dependencies with `npm ci`.
4. Run tests.
5. Build `_site/`.
6. Upload Pages artifact.
7. Deploy Pages artifact.

Permissions:

- `contents: read`
- `issues: read`
- `pages: write`
- `id-token: write`

Do not commit generated files.

## Phase 9: Documentation Pass

Update README with the real user workflow:

- configure systems.
- sync labels.
- enable GitHub Pages with Actions deployment.
- open an incident issue.
- update incidents with comments.
- close issues to resolve incidents.
- run local build.

Update issue template if implementation needs stricter guidance.

Update `VISION.md` only when product direction changes, not for implementation noise.

## Phase 10: Verification

Before calling the first implementation done:

- `npm test` passes.
- `npm run build` writes `_site/index.html`, `_site/status.json`, and CSS.
- local sample/mock build covers:
  - no incidents.
  - one global incident.
  - one system incident.
  - multiple simultaneous incidents.
  - missing severity warning.
  - unknown system warning.
- workflow YAML validates structurally.
- generated `_site/` remains ignored and untracked.

## Suggested Work Order

1. Config loader and validation.
2. Incident normalization with mocked GitHub issue data.
3. Status model and history calculation.
4. Static renderer.
5. `gh` issue reader.
6. Label sync command.
7. GitHub Actions workflow.
8. README and issue template polish.

This order gets most behavior tested before relying on live GitHub state.

## Deferred

- Aliases for system labels.
- Multi-page incident or system detail pages.
- Immutable historical snapshots.
- RSS or Atom feeds.
- Custom domains.
- Subscriptions or notifications.
- Direct REST or GraphQL readers.
