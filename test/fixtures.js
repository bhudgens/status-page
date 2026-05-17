import { normalizeConfig } from '../src/config.js';

export function testConfig(overrides = {}) {
  return normalizeConfig({
    site: {
      title: 'Test Status',
      description: 'Fixture status page',
      timezone: 'UTC',
      history_days: 30
    },
    categories: [
      { id: 'core', name: 'Core' },
      { id: 'infra', name: 'Infrastructure' }
    ],
    systems: [
      { id: 'api', name: 'API', description: 'API service', category: 'core' },
      { id: 'web', name: 'Web', description: 'Web app', category: 'core' },
      { id: 'db', name: 'Database', description: 'Database', category: 'infra' }
    ],
    statuses: {
      investigating: { label: 'status:investigating', display: 'Investigating' },
      monitoring: { label: 'status:monitoring', display: 'Monitoring' }
    },
    severities: {
      degraded: { label: 'severity:degraded', display: 'Degraded', rank: 1 },
      'partial-outage': { label: 'severity:partial-outage', display: 'Partial outage', rank: 2 },
      'major-outage': { label: 'severity:major-outage', display: 'Major outage', rank: 3 }
    },
    defaults: {
      status: 'investigating',
      severity: 'degraded'
    },
    ...overrides
  });
}

export function issue(overrides = {}) {
  return {
    number: 1,
    title: 'API trouble',
    body: 'Initial body',
    state: 'OPEN',
    labels: [
      { name: 'system:api' },
      { name: 'status:investigating' },
      { name: 'severity:degraded' }
    ],
    url: 'https://github.test/issues/1',
    createdAt: '2026-05-10T12:00:00Z',
    updatedAt: '2026-05-10T12:00:00Z',
    closedAt: null,
    comments: [],
    ...overrides
  };
}
