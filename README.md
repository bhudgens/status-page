# GitHub-Native Status Page

This repo builds a static status page from GitHub Issues.

Example status page: https://bhudgens.github.io/status-page/

- Issues are incidents.
- Labels are structured incident metadata.
- `config/status-page.yml` defines public systems and categories.
- GitHub Actions queries issues with `gh`, renders static files, and publishes them with GitHub Pages.

See [VISION.md](VISION.md), [CONTEXT.md](CONTEXT.md), [PLAN.md](PLAN.md), and [.adr/](.adr/) for the product direction and decisions.

## How It Works

An open issue means something is affected. Closing the issue resolves the incident.

Labels make the incident machine-readable:

- `system:<id>` maps the incident to a configured system.
- `status:<state>` tracks lifecycle, such as `status:investigating`.
- `severity:<level>` controls impact, such as `severity:degraded`.

If an issue has no `system:<id>` label, it is shown as a global incident. If an issue has an unknown `system:*` label or no severity label, the page still renders and `status.json` includes a warning.

The generated page is static. The browser does not call GitHub.

## Setup

Install dependencies:

```bash
npm install
```

Authenticate `gh` for local builds and label sync:

```bash
gh auth status
```

Edit [config/status-page.yml](config/status-page.yml) to define the site title, categories, systems, statuses, severities, and defaults.

## Labels

This repo declares expected GitHub labels in [.github/labels.json](.github/labels.json).

Sync labels with:

```bash
npm run sync-labels
```

The sync command creates missing labels and updates colors/descriptions for existing labels. It is intentionally separate from rendering so status builds read issue data without mutating repo settings.

For systems, labels must match configured ids exactly:

```yaml
systems:
  - id: api
    name: API
```

Uses this GitHub label:

```text
system:api
```

## Local Build

Run tests:

```bash
npm test
```

Build the status page from live GitHub Issues:

```bash
npm run build
```

Generated files are written to `_site/`:

```text
_site/
├── index.html
├── status.json
└── assets/status.css
```

`_site/` is ignored and should not be committed.

## Incident Workflow

1. Open a GitHub issue with the incident title and initial description.
2. Add one or more `system:<id>` labels if specific systems are affected.
3. Add one `severity:<level>` label.
4. Add one `status:<state>` label.
5. Post incident updates as issue comments.
6. Close the issue when the incident is resolved.

The public incident message is the latest issue comment when one exists, otherwise the issue body.

## GitHub Pages

The workflow in [.github/workflows/status-page.yml](.github/workflows/status-page.yml) rebuilds on issue and issue-comment changes, then deploys `_site/` using GitHub Pages artifacts.

In repository settings, configure Pages to deploy from GitHub Actions.
