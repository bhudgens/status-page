# Roll Up Health by Worst Severity

## Status

Accepted

## Context

The status page must support multiple open incidents at once and multiple configured systems. A single incident can affect several systems, and a single system can be affected by several incidents. The page still needs concise headline health indicators for each system and for the overall status.

## Decision

The page will treat incidents and systems as many-to-many. Each system's headline health state is the worst severity across all open incidents affecting that system. The global headline health state is the worst severity across all open incidents, including incidents without system labels. Open incident lists should sort worst severity first, then newest first.

## Why

This preserves the full set of active incidents while keeping the page easy to scan. Worst-severity rollup matches how users expect status pages to communicate risk: a severe unresolved incident should not be hidden by a newer or milder one. Sorting by worst impact first keeps the most important operational information visible.

## Consequences

The status model needs to keep both incident lists and computed health rollups. Tests should cover multiple simultaneous incidents, incidents affecting multiple systems, unlabeled global incidents, and severity tie-breaking.
