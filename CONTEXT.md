# GitHub-Native Status Page

This context describes the domain language for a static status page whose operational data is derived from GitHub Issues in the repository.

## Language

**Status Page**:
A static public site that summarizes service health from GitHub issue state.
_Avoid_: dashboard, monitor

**Status Page Layout**:
A classic public status-page presentation with an overall banner, grouped systems, recent history, active incidents, and resolved incidents.
_Avoid_: operations dashboard, marketing page

**Incident**:
A GitHub issue that represents a service-impacting event from the time it is opened until the time it is closed.
_Avoid_: ticket, alert

**Open Incident**:
An incident whose GitHub issue is still open.
_Avoid_: active ticket

**Resolved Incident**:
An incident whose GitHub issue is closed.
_Avoid_: completed ticket

**System**:
A configured public service or application whose status can be shown separately on the status page.
_Avoid_: component, app, service when used inconsistently

**Global Incident**:
An incident with no configured system label, shown as affecting the overall status page rather than one specific system.
_Avoid_: unlabeled incident

**Global-Only Status Page**:
A status page with no configured systems, showing only overall status, global history, active incidents, and resolved incidents.
_Avoid_: single-system page when no system is configured

**Status Label**:
A GitHub label that describes the incident lifecycle state, such as investigating, identified, or monitoring.
_Avoid_: phase label

**Severity Label**:
A GitHub label that describes user impact and determines the displayed health state while the incident is open.
_Avoid_: priority label

**Status Warning**:
A non-blocking problem found while deriving the status page, included in generated data for maintainers to fix.
_Avoid_: build error when rendering should continue

**System Label**:
A GitHub label in the form `system:<id>` where `<id>` exactly matches a configured system id.
_Avoid_: component label

**History Window**:
The recent time range, normally 30 days, shown on the status page by deriving incident durations from issue open and close times.
_Avoid_: snapshot history

**History Day**:
A calendar day in the history window colored by whether any incident window overlaps that day and by the worst overlapping severity.
_Avoid_: uptime day

**Incident Update**:
Issue body or comment content that describes what changed during an incident.
_Avoid_: log entry

**Public Incident Message**:
The text shown on the status page for an incident, taken from the latest issue comment when present and otherwise from the issue body.
_Avoid_: summary when it could mean issue title

## Relationships

- A **Status Page** shows zero or more **Systems**
- A **Status Page** uses a **Status Page Layout**
- A **Status Page** with zero **Systems** is a **Global-Only Status Page**
- A **System** can have zero or more **Open Incidents**
- An **Incident** can affect zero, one, or many **Systems**
- An **Incident** with zero **System Labels** is a **Global Incident**
- An **Open Incident** makes the overall status non-operational
- A **Global Incident** affects the overall status and global history, but not individual configured **Systems**
- A **Resolved Incident** contributes to the **History Window** when its open-to-close duration overlaps that window
- A **History Window** contains **History Days**
- A **History Day** is healthy when no incident window overlaps it
- A **System Label** maps one **Incident** to one **System** by exact configured system id
- A **Severity Label** determines the displayed health state for an affected **System** or global status
- An **Incident** has one **Public Incident Message**
- A **System** health state is the worst **Severity Label** across all **Open Incidents** affecting it
- The global health state is the worst **Severity Label** across all **Open Incidents**
- An **Open Incident** without a **Severity Label** uses the default severity and produces a **Status Warning**
- An **Incident** with an unknown **System Label** is still shown as affecting global status and produces a **Status Warning**

## Example Dialogue

> **Dev:** "If someone opens an issue without a system label, do we ignore it?"
> **Domain expert:** "No. Any open issue is an incident. Without a system label, it affects the global status instead of a specific system."

## Flagged Ambiguities

- "status" can mean the lifecycle of an **Incident** or the health of a **System**; use **Status Label** for lifecycle labels and health state for the rendered system condition.
