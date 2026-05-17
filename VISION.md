# Vision

This project should become a status page whose backend is GitHub itself.

The source of truth is not a database server, hosted CMS, incident SaaS, or generated JSON file checked in by hand. The source of truth is the repository:

- GitHub Issues are incident records.
- GitHub labels are structured status metadata.
- A global YAML file defines the public systems, groups, status labels, and display rules.
- GitHub Actions evaluates the repo with `gh`, builds a static status page, and publishes it to GitHub Pages.

The repository should be understandable by opening a few files. No Hugo theme, no generated HTML committed as source, no duplicated package trees, and no framework choice that becomes the point of the project.

## Product Shape

A maintainer configures `config/status-page.yml` with the systems they want to expose publicly. Each system has a stable id, display name, description, and category. A system is affected by labels in the exact form `system:<id>`.

An incident is an open GitHub issue. If an issue is open and has system labels, those systems are not fully operational. Closing the issue resolves the incident. The page is rebuilt from current GitHub state rather than relying on a long-lived mutable status file.

Labels carry the machine-readable parts:

- `system:<id>` links an issue to one or more configured systems.
- `status:<state>` describes the incident lifecycle, such as `investigating`, `identified`, or `monitoring`.
- `severity:<level>` describes impact, such as `degraded`, `partial-outage`, or `major-outage`.
- `category:<id>` can group systems or incidents when useful, but categories should primarily come from global config.

The public page should show:

- Overall status derived from all configured systems.
- Systems grouped by configured category.
- Active incidents with issue titles, labels, timestamps, and links back to GitHub.
- Recent resolved incidents, derived from recently closed issues.
- A simple historical view once there is a deliberate snapshot strategy.

## Architecture Direction

The build should be a small GitHub Actions workflow:

1. Checkout the repository.
2. Install only the minimal runtime needed by the builder.
3. Use `gh issue list` and `gh issue view` to read open and recently closed issues.
4. Load `config/status-page.yml`.
5. Derive a normalized status model in memory.
6. Render static files into a build directory.
7. Deploy that directory with GitHub Pages.

The first real implementation can be plain Node, Deno, Python, or another tiny runtime. The important constraint is that the renderer should be boring and local: config plus GitHub issue data in, static HTML/CSS/JSON out.

Avoid committing generated site output unless GitHub Pages requires it for a specific deployment mode. Prefer Actions artifacts and the official Pages deploy flow.

## Status Rules

Default behavior should be conservative and explainable:

- A configured system with no open incident issue is `operational`.
- An open incident issue with `system:<id>` marks that system affected.
- If multiple open incidents affect a system, the worst severity wins.
- If an issue has no `status:*` label, treat it as `status:investigating`.
- If an issue has no `severity:*` label, treat it as `severity:degraded`.
- If an issue references an unknown system label, the page should still render the incident globally and include a warning in `status.json`.

Severity ordering should live in config so teams can rename or reshape it without code changes.

## Non-Goals

- Do not rebuild a generic incident-management SaaS.
- Do not require a server, database, queue, webhook receiver, or persistent worker.
- Do not preserve Hugo unless a future decision explicitly chooses it again.
- Do not make users edit generated JSON to change state.
- Do not make GitHub Actions commit every issue-state transition back into the repo unless there is a specific historical snapshot feature being implemented.

## First Milestone

The first milestone is a clean repo with:

- A clear vision document.
- Minimal configuration in `config/status-page.yml`.
- Issue templates that encourage correct labels.
- A GitHub Actions workflow that can build and publish a static page from `gh` issue data.
- A tiny renderer with tests for label parsing, config validation, and severity precedence.

When this milestone is done, a user should be able to fork the repo, edit one YAML file, create an incident issue, and see GitHub Pages reflect the derived status.
