# Triage Labels

These skills use canonical category and state roles. Map each role to the labels this repo actually uses.

## Category labels

| Canonical role | Label in repo | Meaning |
| -------------- | ------------- | ------- |
| `bug` | `bug` | User-visible broken behavior |
| `enhancement` | `enhancement` | New capability or changed behavior |

## State labels

| Canonical role | Label in repo | Meaning |
| -------------- | ------------- | ------- |
| `needs-triage` | `needs-triage` | Maintainer needs to evaluate this issue |
| `needs-info` | `needs-info` | Waiting on reporter for more information |
| `ready-for-agent` | `ready-for-agent` | Fully specified, AFK-ready |
| `ready-for-human` | `ready-for-human` | Requires human implementation |
| `wontfix` | `wontfix` | Will not be actioned |

When a skill references a role name, use the mapped label from this table.

Triaged issues should have exactly one category label and exactly one state label.

Rejected enhancement concepts should be recorded in `.out-of-scope/` when `wontfix` is applied.

Edit the right-hand column if your repo uses different naming.
