# Out-of-Scope Records

Use `.out-of-scope/` to store durable decisions for enhancement ideas that were rejected as `wontfix`.

One file should represent one rejected concept, not one issue.

## Record format

```markdown
# Concept Name

This project does not support <concept>.

## Why this is out of scope

<Short durable rationale. Prefer product, architecture, maintenance, or operational reasons.>

## Prior requests

- #123 - "<issue title>"
```

## Workflow

During triage, check `.out-of-scope/*.md` before evaluating enhancement requests.

If a new enhancement matches an existing rejected concept:

- tell the maintainer which record matched,
- summarize the prior rationale,
- ask whether to close again or reopen the decision.

When closing a new enhancement as `wontfix`:

- create or update the matching `.out-of-scope/*.md` record,
- add the issue to `Prior requests`,
- comment on the issue with a link to the record,
- close the issue.
