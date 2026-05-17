import { toDate } from './dates.js';

export function normalizeIssuesToIncidents(issues, config, options = {}) {
  const now = toDate(options.now || new Date(), 'now');
  const systemIds = new Set(config.systems.map((system) => system.id));
  const statusByLabel = labelLookup(config.statuses);
  const severityByLabel = labelLookup(config.severities);
  const incidents = [];
  const warnings = [];

  for (const issue of issues) {
    const labels = normalizeLabels(issue.labels);
    const systemLabels = labels.filter((label) => label.startsWith('system:'));
    const knownSystemIds = [];
    const unknownSystemLabels = [];

    for (const label of systemLabels) {
      const systemId = label.slice('system:'.length);
      if (systemIds.has(systemId)) {
        knownSystemIds.push(systemId);
      } else {
        unknownSystemLabels.push(label);
      }
    }

    const status = labels.map((label) => statusByLabel.get(label)).find(Boolean)?.id || config.defaults.status;
    const severity = labels.map((label) => severityByLabel.get(label)).find(Boolean)?.id || config.defaults.severity;

    if (!labels.some((label) => severityByLabel.has(label))) {
      warnings.push({
        code: 'missing-severity',
        issue: issue.number,
        message: `Issue #${issue.number} has no severity label; defaulting to ${config.defaults.severity}.`
      });
    }

    if (unknownSystemLabels.length > 0) {
      warnings.push({
        code: 'unknown-system-label',
        issue: issue.number,
        message: `Issue #${issue.number} has unknown system label(s): ${unknownSystemLabels.join(', ')}. Rendering as a global incident.`
      });
    }

    const createdAt = toDate(issue.createdAt || issue.created_at, `issue #${issue.number} createdAt`);
    const closedAtValue = issue.closedAt || issue.closed_at || null;
    const closedAt = closedAtValue ? toDate(closedAtValue, `issue #${issue.number} closedAt`) : null;
    const isOpen = issue.state === 'OPEN' || issue.state === 'open';
    const affectsGlobal = knownSystemIds.length === 0 || unknownSystemLabels.length > 0;
    const comments = Array.isArray(issue.comments) ? issue.comments : [];
    const latestComment = comments
      .map((comment) => ({
        body: comment.body || '',
        createdAt: comment.createdAt ? toDate(comment.createdAt, `issue #${issue.number} comment createdAt`) : null,
        updatedAt: comment.updatedAt ? toDate(comment.updatedAt, `issue #${issue.number} comment updatedAt`) : null
      }))
      .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))[0];

    incidents.push({
      number: issue.number,
      title: issue.title || `Issue #${issue.number}`,
      url: issue.url || '',
      state: isOpen ? 'open' : 'closed',
      status,
      severity,
      severityRank: config.severities[severity].rank,
      systemIds: unique(knownSystemIds),
      affectsGlobal,
      labels,
      message: latestComment?.body || issue.body || '',
      createdAt: createdAt.toISOString(),
      updatedAt: issue.updatedAt || issue.updated_at || createdAt.toISOString(),
      closedAt: closedAt ? closedAt.toISOString() : null,
      windowStart: createdAt,
      windowEnd: closedAt || now
    });
  }

  return {
    incidents,
    warnings
  };
}

function labelLookup(itemsById) {
  return new Map(Object.values(itemsById).map((item) => [item.label, item]));
}

export function normalizeLabels(labels = []) {
  return labels.map((label) => (typeof label === 'string' ? label : label.name)).filter(Boolean);
}

function unique(items) {
  return [...new Set(items)];
}
