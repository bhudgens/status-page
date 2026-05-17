import fs from 'node:fs';
import { runGh } from './gh.js';

export function readLabelDefinitions(labelsPath = '.github/labels.json') {
  const labels = JSON.parse(fs.readFileSync(labelsPath, 'utf8'));
  validateLabelDefinitions(labels);
  return labels;
}

export function validateLabelDefinitions(labels) {
  if (!Array.isArray(labels)) {
    throw new Error('.github/labels.json must contain an array.');
  }

  const seen = new Set();
  for (const label of labels) {
    if (!label.name || !label.color || !label.description) {
      throw new Error('Every label must include name, color, and description.');
    }
    if (seen.has(label.name)) {
      throw new Error(`Duplicate label definition: ${label.name}`);
    }
    seen.add(label.name);
  }
}

export function planLabelSync(desiredLabels, existingLabels) {
  const existingByName = new Map(existingLabels.map((label) => [label.name, normalizeLabel(label)]));
  return desiredLabels.map((desired) => {
    const normalized = normalizeLabel(desired);
    const existing = existingByName.get(normalized.name);

    if (!existing) {
      return { action: 'create', label: normalized };
    }

    if (existing.color !== normalized.color || existing.description !== normalized.description) {
      return { action: 'update', label: normalized };
    }

    return { action: 'noop', label: normalized };
  });
}

export async function syncLabels({ labelsPath = '.github/labels.json', cwd = process.cwd(), runner = runGh } = {}) {
  const desiredLabels = readLabelDefinitions(labelsPath);
  const existingStdout = await runner(['label', 'list', '--limit', '500', '--json', 'name,color,description'], { cwd });
  const existingLabels = JSON.parse(existingStdout);
  const plan = planLabelSync(desiredLabels, existingLabels);

  for (const item of plan) {
    if (item.action === 'create') {
      await runner(
        [
          'label',
          'create',
          item.label.name,
          '--color',
          item.label.color,
          '--description',
          item.label.description
        ],
        { cwd }
      );
    }
    if (item.action === 'update') {
      await runner(
        [
          'label',
          'edit',
          item.label.name,
          '--color',
          item.label.color,
          '--description',
          item.label.description
        ],
        { cwd }
      );
    }
  }

  return plan;
}

function normalizeLabel(label) {
  return {
    name: label.name,
    color: label.color.replace(/^#/, '').toLowerCase(),
    description: label.description || ''
  };
}
