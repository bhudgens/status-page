import fs from 'node:fs/promises';
import path from 'node:path';

export async function renderSite(model, { outDir = '_site' } = {}) {
  await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(path.join(outDir, 'assets'), { recursive: true });
  await fs.writeFile(path.join(outDir, 'status.json'), `${JSON.stringify(model, null, 2)}\n`);
  await fs.writeFile(path.join(outDir, 'index.html'), renderHtml(model));
  await fs.writeFile(path.join(outDir, 'assets', 'status.css'), renderCss());
}

export function renderHtml(model) {
  const hasSystems = model.systems.length > 0;
  const groupedSystems = groupSystems(model);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(model.site.title)}</title>
  <meta name="description" content="${escapeHtml(model.site.description || '')}">
  <link rel="stylesheet" href="assets/status.css">
</head>
<body>
  <main class="page">
    <header class="hero hero-${severityClass(model.overall.severity)}">
      <div>
        <p class="eyebrow">${formatDateTime(model.generated_at)}</p>
        <h1>${escapeHtml(model.site.title)}</h1>
        <p>${escapeHtml(model.site.description || 'Current service status')}</p>
      </div>
      <div class="overall">
        <span class="status-dot ${severityClass(model.overall.severity)}"></span>
        <strong>${escapeHtml(overallText(model))}</strong>
      </div>
    </header>

    <section class="panel">
      <div class="section-heading">
        <h2>Last ${model.history.days.length} days</h2>
        <span>${model.history.days.filter((day) => day.state !== 'operational').length} affected day(s)</span>
      </div>
      ${renderHistory(model.history.days)}
    </section>

    ${hasSystems ? renderSystems(groupedSystems) : ''}

    <section class="grid">
      <div class="panel">
        <div class="section-heading">
          <h2>Active incidents</h2>
          <span>${model.active_incidents.length}</span>
        </div>
        ${renderIncidentList(model.active_incidents, 'No active incidents.')}
      </div>
      <div class="panel">
        <div class="section-heading">
          <h2>Recent resolved incidents</h2>
          <span>${model.recent_incidents.length}</span>
        </div>
        ${renderIncidentList(model.recent_incidents, 'No recently resolved incidents.')}
      </div>
    </section>

    ${model.warnings.length > 0 ? renderWarnings(model.warnings) : ''}
  </main>
</body>
</html>
`;
}

function groupSystems(model) {
  const categoriesById = new Map(model.categories.map((category) => [category.id, category]));
  const groups = new Map();

  for (const system of model.systems) {
    const category = categoriesById.get(system.category) || { id: 'uncategorized', name: 'Other Systems' };
    if (!groups.has(category.id)) {
      groups.set(category.id, { category, systems: [] });
    }
    groups.get(category.id).systems.push(system);
  }

  return [...groups.values()];
}

function renderSystems(groups) {
  return groups
    .map(
      (group) => `<section class="panel">
      <div class="section-heading">
        <h2>${escapeHtml(group.category.name)}</h2>
        ${group.category.description ? `<span>${escapeHtml(group.category.description)}</span>` : ''}
      </div>
      <div class="systems">
        ${group.systems.map(renderSystemCard).join('')}
      </div>
    </section>`
    )
    .join('');
}

function renderSystemCard(system) {
  return `<article class="system-card">
    <div class="system-header">
      <div>
        <h3>${escapeHtml(system.name)}</h3>
        <p>${escapeHtml(system.description || '')}</p>
      </div>
      <span class="badge ${severityClass(system.health.severity)}">${escapeHtml(system.health.display)}</span>
    </div>
    ${renderHistory(system.history)}
  </article>`;
}

function renderHistory(days) {
  return `<div class="history" aria-label="Status history">
    ${days
      .map(
        (day) =>
          `<span class="history-day ${severityClass(day.severity)}" title="${escapeHtml(day.date)}: ${escapeHtml(day.severity || 'operational')}"></span>`
      )
      .join('')}
  </div>`;
}

function renderIncidentList(incidents, emptyText) {
  if (incidents.length === 0) {
    return `<p class="empty">${escapeHtml(emptyText)}</p>`;
  }

  return `<div class="incidents">
    ${incidents
      .map(
        (incident) => `<article class="incident">
        <div class="incident-title">
          <span class="badge ${severityClass(incident.severity)}">${escapeHtml(incident.severity)}</span>
          <h3>${incident.url ? `<a href="${escapeAttribute(incident.url)}">${escapeHtml(incident.title)}</a>` : escapeHtml(incident.title)}</h3>
        </div>
        <p>${escapeHtml(truncate(incident.message || '', 240))}</p>
        <div class="incident-meta">
          <span>#${incident.number}</span>
          <span>${escapeHtml(incident.status)}</span>
          <span>${incident.system_ids.length > 0 ? escapeHtml(incident.system_ids.join(', ')) : 'global'}</span>
          <span>${formatDateTime(incident.created_at)}</span>
        </div>
      </article>`
      )
      .join('')}
  </div>`;
}

function renderWarnings(warnings) {
  return `<section class="panel warnings">
    <div class="section-heading">
      <h2>Status warnings</h2>
      <span>${warnings.length}</span>
    </div>
    <ul>
      ${warnings.map((warning) => `<li>${escapeHtml(warning.message)}</li>`).join('')}
    </ul>
  </section>`;
}

function overallText(model) {
  if (model.active_incidents.length === 0) return 'All systems operational';
  if (model.overall.severity) return `${model.overall.display}: ${model.active_incidents.length} active incident(s)`;
  return `${model.active_incidents.length} active incident(s)`;
}

function severityClass(severity) {
  if (!severity) return 'operational';
  return severity.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC'
  }).format(new Date(value));
}

function truncate(value, maxLength) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('`', '&#96;');
}

function renderCss() {
  return `:root {
  color-scheme: light;
  --bg: #f7f8fb;
  --text: #172033;
  --muted: #5d6b82;
  --panel: #ffffff;
  --line: #d9e0ea;
  --operational: #1f9d55;
  --degraded: #d9a400;
  --partial-outage: #d96c00;
  --major-outage: #c92a2a;
}

* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
a { color: inherit; }
.page {
  width: min(1120px, calc(100vw - 32px));
  margin: 0 auto;
  padding: 32px 0;
}
.hero, .panel {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
  box-shadow: 0 18px 50px rgba(31, 45, 61, 0.08);
}
.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 32px;
  margin-bottom: 18px;
}
.hero h1 {
  margin: 0 0 8px;
  font-size: clamp(2rem, 4vw, 3.5rem);
  letter-spacing: 0;
}
.hero p, .system-card p, .incident p, .empty {
  color: var(--muted);
}
.eyebrow {
  margin: 0 0 12px;
  font-size: 0.85rem;
  text-transform: uppercase;
}
.overall {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.15rem;
  white-space: nowrap;
}
.status-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--operational);
}
.panel {
  padding: 22px;
  margin: 18px 0;
}
.section-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}
.section-heading h2, .system-card h3, .incident h3 {
  margin: 0;
}
.section-heading span, .incident-meta {
  color: var(--muted);
  font-size: 0.9rem;
}
.history {
  display: grid;
  grid-template-columns: repeat(30, minmax(6px, 1fr));
  gap: 4px;
}
.history-day {
  height: 28px;
  border-radius: 4px;
  background: var(--operational);
}
.systems {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 14px;
}
.system-card {
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 16px;
}
.system-header, .incident-title {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.badge {
  display: inline-flex;
  border-radius: 999px;
  padding: 4px 9px;
  background: var(--operational);
  color: white;
  font-size: 0.8rem;
  font-weight: 700;
  white-space: nowrap;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 18px;
}
.grid .panel {
  margin: 0;
}
.incident {
  border-top: 1px solid var(--line);
  padding: 16px 0;
}
.incident:first-child {
  border-top: 0;
  padding-top: 0;
}
.incident-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.warnings {
  border-color: #f0c36d;
}
.degraded { background: var(--degraded); }
.partial-outage { background: var(--partial-outage); }
.major-outage { background: var(--major-outage); }
.operational { background: var(--operational); }

@media (max-width: 720px) {
  .hero, .section-heading, .system-header, .incident-title {
    align-items: flex-start;
    flex-direction: column;
  }
  .overall {
    white-space: normal;
  }
  .history-day {
    height: 22px;
  }
}
`;
}
