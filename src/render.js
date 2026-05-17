import fs from 'node:fs/promises';
import path from 'node:path';
import MarkdownIt from 'markdown-it';

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
  typographer: true
});

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
  const affectedSystems = model.systems.filter((system) => system.health.state !== 'operational').length;
  const affectedDays = model.history.days.filter((day) => day.state !== 'operational').length;

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
    <nav class="topbar" aria-label="Status page navigation">
      <a class="brand" href="./">${escapeHtml(model.site.title)}</a>
      <div class="topbar-links">
        <a href="status.json">Status JSON</a>
        <span>Backed by GitHub Issues</span>
      </div>
    </nav>

    <header class="hero ${severityClass(model.overall.severity)}-surface">
      <div class="hero-copy">
        <p class="eyebrow">Updated ${formatDateTime(model.generated_at)}</p>
        <h1>${escapeHtml(model.site.title)}</h1>
        <p>${escapeHtml(model.site.description || 'Current service status')}</p>
      </div>
      <div class="overall-card">
        <div class="overall">
          <span class="status-dot ${severityClass(model.overall.severity)}"></span>
          <strong>${escapeHtml(overallText(model))}</strong>
        </div>
        <div class="quick-stats">
          <a href="#active-incidents"><strong>${model.active_incidents.length}</strong><span>Active incidents</span></a>
          <a href="#systems"><strong>${affectedSystems}</strong><span>Affected systems</span></a>
          <a href="#history"><strong>${affectedDays}</strong><span>Affected days</span></a>
        </div>
      </div>
    </header>

    <section class="panel history-panel" id="history">
      <div class="section-heading">
        <div>
          <p class="section-kicker">History</p>
          <h2>Last ${model.history.days.length} days</h2>
        </div>
        <span>${affectedDays} affected day(s)</span>
      </div>
      ${renderHistory(model.history.days)}
      <div class="history-foot">
        <span>${escapeHtml(model.history.days[0]?.date || '')}</span>
        <div class="legend">
          <span><i class="legend-dot operational"></i>Operational</span>
          <span><i class="legend-dot degraded"></i>Degraded</span>
          <span><i class="legend-dot partial-outage"></i>Partial outage</span>
          <span><i class="legend-dot major-outage"></i>Major outage</span>
        </div>
        <span>${escapeHtml(model.history.days.at(-1)?.date || '')}</span>
      </div>
    </section>

    ${hasSystems ? renderSystems(groupedSystems) : ''}

    <section class="grid">
      <div class="panel" id="active-incidents">
        <div class="section-heading">
          <div>
            <p class="section-kicker">Now</p>
            <h2>Active incidents</h2>
          </div>
          <span>${model.active_incidents.length}</span>
        </div>
        ${renderIncidentList(model.active_incidents, 'No active incidents.')}
      </div>
      <div class="panel">
        <div class="section-heading">
          <div>
            <p class="section-kicker">Recently</p>
            <h2>Resolved incidents</h2>
          </div>
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
      (group, index) => `<section class="panel"${index === 0 ? ' id="systems"' : ''}>
      <div class="section-heading">
        <div>
          <p class="section-kicker">Systems</p>
          <h2>${escapeHtml(group.category.name)}</h2>
        </div>
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
    <div class="system-meta">
      <span>${system.active_incident_numbers.length} active incident(s)</span>
      <span>${system.history.filter((day) => day.state !== 'operational').length} affected day(s)</span>
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
          <div>
            <span class="badge ${severityClass(incident.severity)}">${escapeHtml(labelText(incident.severity))}</span>
            <h3>${escapeHtml(incident.title)}</h3>
          </div>
          ${incident.url ? `<a class="detail-link" href="${escapeAttribute(incident.url)}">View issue #${incident.number}</a>` : ''}
        </div>
        <div class="incident-meta">
          <span>${escapeHtml(labelText(incident.status))}</span>
          <span>${incident.system_ids.length > 0 ? escapeHtml(incident.system_ids.join(', ')) : 'Global incident'}</span>
          <span>Opened ${formatDateTime(incident.created_at)}</span>
          ${incident.closed_at ? `<span>Resolved ${formatDateTime(incident.closed_at)}</span>` : ''}
        </div>
        <div class="incident-message markdown-body">
          ${renderMarkdown(incident.message || '_No incident details provided._')}
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

function renderMarkdown(value) {
  return markdown.render(value);
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

function labelText(value) {
  return String(value || '')
    .split('-')
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join(' ');
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
  --bg: #f4f6f8;
  --text: #162033;
  --muted: #627087;
  --panel: #ffffff;
  --line: #dbe2ea;
  --soft-line: #edf1f5;
  --operational: #168a4a;
  --operational-soft: #e8f7ee;
  --degraded: #b77900;
  --degraded-soft: #fff5d6;
  --partial-outage: #c05621;
  --partial-outage-soft: #ffeadb;
  --major-outage: #c53030;
  --major-outage-soft: #ffe1e1;
}

* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  line-height: 1.5;
}
a { color: #155bb5; text-underline-offset: 3px; }
.page {
  width: min(1120px, calc(100vw - 32px));
  margin: 0 auto;
  padding: 36px 0;
}
.topbar {
  align-items: center;
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
}
.brand {
  color: var(--text);
  font-size: 1rem;
  font-weight: 800;
  text-decoration: none;
}
.topbar-links {
  align-items: center;
  color: var(--muted);
  display: flex;
  gap: 14px;
  font-size: 0.9rem;
}
.topbar-links a {
  color: var(--text);
  font-weight: 700;
  text-decoration: none;
}
.hero, .panel {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
  box-shadow: 0 16px 44px rgba(31, 45, 61, 0.07);
}
.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 36px;
  margin-bottom: 20px;
  border-top: 6px solid var(--operational);
}
.hero h1 {
  margin: 0 0 8px;
  font-size: clamp(2.2rem, 4vw, 3.8rem);
  line-height: 1;
  letter-spacing: 0;
}
.hero p, .system-card p, .incident p, .empty {
  color: var(--muted);
}
.hero-copy {
  max-width: 700px;
}
.eyebrow {
  margin: 0 0 12px;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted);
}
.overall {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.15rem;
  white-space: nowrap;
  background: rgba(255,255,255,0.74);
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 10px 14px;
}
.overall-card {
  background: rgba(255,255,255,0.82);
  border: 1px solid var(--line);
  border-radius: 8px;
  min-width: 320px;
  padding: 14px;
}
.quick-stats {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(3, 1fr);
  margin-top: 12px;
}
.quick-stats a {
  border-left: 1px solid var(--line);
  color: var(--text);
  padding-left: 10px;
  text-decoration: none;
}
.quick-stats a:first-child {
  border-left: 0;
  padding-left: 0;
}
.quick-stats a:hover span,
.quick-stats a:focus-visible span {
  color: #0969da;
  text-decoration: underline;
}
.quick-stats strong {
  display: block;
  font-size: 1.4rem;
  line-height: 1;
}
.quick-stats span {
  color: var(--muted);
  display: block;
  font-size: 0.76rem;
  margin-top: 4px;
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
.section-heading h2 {
  font-size: 1.25rem;
}
.section-kicker {
  color: var(--muted);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  margin: 0 0 3px;
  text-transform: uppercase;
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
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.34);
}
.history-foot {
  align-items: center;
  color: var(--muted);
  display: flex;
  font-size: 0.82rem;
  justify-content: space-between;
  margin-top: 12px;
}
.legend {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}
.legend span {
  align-items: center;
  display: inline-flex;
  gap: 5px;
}
.legend-dot {
  border-radius: 50%;
  display: inline-block;
  height: 9px;
  width: 9px;
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
  background: #fbfcfe;
}
.system-header, .incident-title {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.system-header {
  margin-bottom: 10px;
}
.system-meta {
  color: var(--muted);
  display: flex;
  flex-wrap: wrap;
  font-size: 0.84rem;
  gap: 8px;
  margin-bottom: 12px;
}
.system-meta span {
  background: #f6f8fb;
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 3px 8px;
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
  grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
  gap: 18px;
  align-items: start;
}
.grid .panel {
  margin: 0;
}
.incident {
  border-top: 1px solid var(--soft-line);
  padding: 18px 0;
}
.incident:first-child {
  border-top: 0;
  padding-top: 0;
}
.incident-title h3 {
  margin-top: 8px;
  font-size: 1.15rem;
}
.incident-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 10px 0 14px;
}
.incident-meta span {
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 3px 8px;
  background: #fafbfd;
}
.detail-link {
  border: 1px solid var(--line);
  border-radius: 999px;
  color: var(--text);
  display: inline-flex;
  font-size: 0.86rem;
  font-weight: 700;
  padding: 7px 10px;
  text-decoration: none;
  white-space: nowrap;
}
.detail-link:hover {
  border-color: #9fb2ca;
  background: #f6f8fb;
}
.incident-message {
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fbfcfe;
  padding: 16px 18px;
}
.markdown-body > :first-child { margin-top: 0; }
.markdown-body > :last-child { margin-bottom: 0; }
.markdown-body {
  color: #24292f;
  font-size: 0.96rem;
  overflow-wrap: break-word;
}
.markdown-body h1,
.markdown-body h2,
.markdown-body h3 {
  color: #24292f;
  font-weight: 600;
  line-height: 1.2;
  margin: 24px 0 12px;
}
.markdown-body h1,
.markdown-body h2 {
  border-bottom: 1px solid #d8dee4;
  padding-bottom: 0.3em;
}
.markdown-body h1 { font-size: 1.5rem; }
.markdown-body h2 { font-size: 1.25rem; }
.markdown-body h3 { font-size: 1rem; }
.markdown-body p,
.markdown-body ul,
.markdown-body ol,
.markdown-body blockquote,
.markdown-body pre,
.markdown-body table {
  margin: 0 0 16px;
}
.markdown-body p,
.markdown-body li {
  color: #24292f;
}
.markdown-body ul,
.markdown-body ol {
  padding-left: 2em;
}
.markdown-body li + li {
  margin-top: 0.25em;
}
.markdown-body a {
  color: #0969da;
}
.markdown-body strong {
  font-weight: 600;
}
.markdown-body code {
  background: rgba(175, 184, 193, 0.2);
  border-radius: 6px;
  color: #24292f;
  font-size: 85%;
  padding: 0.2em 0.4em;
}
.markdown-body pre {
  background: #f6f8fa;
  border-radius: 6px;
  overflow: auto;
  padding: 16px;
}
.markdown-body pre code {
  background: transparent;
  border-radius: 0;
  display: block;
  font-size: 85%;
  padding: 0;
}
.markdown-body blockquote {
  border-left: 0.25em solid #d0d7de;
  color: #57606a;
  padding: 0 1em;
}
.markdown-body blockquote p {
  color: #57606a;
}
.markdown-body table {
  border-collapse: collapse;
  display: block;
  max-width: 100%;
  overflow: auto;
  width: max-content;
}
.markdown-body th,
.markdown-body td {
  border: 1px solid #d0d7de;
  padding: 6px 13px;
}
.markdown-body tr {
  background: #ffffff;
  border-top: 1px solid #d8dee4;
}
.markdown-body tr:nth-child(2n) {
  background: #f6f8fa;
}
.markdown-body hr {
  background: #d8dee4;
  border: 0;
  height: 0.25em;
  margin: 24px 0;
  padding: 0;
}
.warnings {
  border-color: #f0c36d;
}
.degraded { background: var(--degraded); }
.partial-outage { background: var(--partial-outage); }
.major-outage { background: var(--major-outage); }
.operational { background: var(--operational); }
.operational-surface { border-top-color: var(--operational); background: linear-gradient(135deg, var(--operational-soft), #ffffff 58%); }
.degraded-surface { border-top-color: var(--degraded); background: linear-gradient(135deg, var(--degraded-soft), #ffffff 58%); }
.partial-outage-surface { border-top-color: var(--partial-outage); background: linear-gradient(135deg, var(--partial-outage-soft), #ffffff 58%); }
.major-outage-surface { border-top-color: var(--major-outage); background: linear-gradient(135deg, var(--major-outage-soft), #ffffff 58%); }

@media (max-width: 720px) {
  .topbar, .hero, .section-heading, .system-header, .incident-title, .history-foot {
    align-items: flex-start;
    flex-direction: column;
  }
  .topbar-links {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }
  .grid {
    grid-template-columns: 1fr;
  }
  .overall, .overall-card {
    white-space: normal;
    width: 100%;
  }
  .quick-stats {
    grid-template-columns: 1fr;
  }
  .quick-stats a,
  .quick-stats a:first-child {
    border-left: 0;
    border-top: 1px solid var(--line);
    padding: 10px 0 0;
  }
  .history-day {
    height: 22px;
  }
}
`;
}
