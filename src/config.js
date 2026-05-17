import fs from 'node:fs';
import yaml from 'js-yaml';

export function loadConfig(configPath = 'config/status-page.yml') {
  const raw = fs.readFileSync(configPath, 'utf8');
  const config = yaml.load(raw);
  return normalizeConfig(config);
}

export function normalizeConfig(config) {
  const errors = [];

  if (!config || typeof config !== 'object') {
    throw new Error('Config must be a YAML object.');
  }

  const site = config.site || {};
  if (!site.title || typeof site.title !== 'string') {
    errors.push('site.title is required.');
  }

  const historyDays = Number(site.history_days);
  if (!Number.isInteger(historyDays) || historyDays < 1) {
    errors.push('site.history_days must be a positive integer.');
  }

  const categories = Array.isArray(config.categories) ? config.categories : [];
  const systems = Array.isArray(config.systems) ? config.systems : [];
  const statuses = config.statuses || {};
  const severities = config.severities || {};
  const defaults = config.defaults || {};

  validateUniqueIds(categories, 'category', errors);
  validateUniqueIds(systems, 'system', errors);

  const categoryIds = new Set(categories.map((category) => category.id));
  for (const system of systems) {
    if (!system.id || typeof system.id !== 'string') {
      errors.push('Every system must have a string id.');
    }
    if (!system.name || typeof system.name !== 'string') {
      errors.push(`System ${system.id || '<unknown>'} must have a name.`);
    }
    if (system.category && !categoryIds.has(system.category)) {
      errors.push(`System ${system.id} references unknown category ${system.category}.`);
    }
  }

  for (const [id, status] of Object.entries(statuses)) {
    if (!status?.label || typeof status.label !== 'string') {
      errors.push(`Status ${id} must have a label.`);
    }
  }

  for (const [id, severity] of Object.entries(severities)) {
    if (!severity?.label || typeof severity.label !== 'string') {
      errors.push(`Severity ${id} must have a label.`);
    }
    if (!Number.isFinite(Number(severity?.rank))) {
      errors.push(`Severity ${id} must have a numeric rank.`);
    }
  }

  if (!defaults.status || !statuses[defaults.status]) {
    errors.push(`defaults.status must reference a configured status.`);
  }
  if (!defaults.severity || !severities[defaults.severity]) {
    errors.push(`defaults.severity must reference a configured severity.`);
  }

  if (errors.length > 0) {
    throw new Error(`Invalid status page config:\n- ${errors.join('\n- ')}`);
  }

  return {
    site: {
      title: site.title,
      description: site.description || '',
      timezone: site.timezone || 'UTC',
      historyDays
    },
    categories,
    systems,
    statuses: normalizeLabelMap(statuses),
    severities: normalizeSeverityMap(severities),
    defaults
  };
}

function validateUniqueIds(items, itemName, errors) {
  const seen = new Set();
  for (const item of items) {
    if (!item?.id) continue;
    if (seen.has(item.id)) {
      errors.push(`Duplicate ${itemName} id: ${item.id}.`);
    }
    seen.add(item.id);
  }
}

function normalizeLabelMap(labels) {
  return Object.fromEntries(
    Object.entries(labels).map(([id, value]) => [
      id,
      {
        ...value,
        id
      }
    ])
  );
}

function normalizeSeverityMap(severities) {
  return Object.fromEntries(
    Object.entries(severities).map(([id, value]) => [
      id,
      {
        ...value,
        id,
        rank: Number(value.rank)
      }
    ])
  );
}
