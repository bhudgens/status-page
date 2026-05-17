import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeIssuesToIncidents } from '../src/incidents.js';
import { issue, testConfig } from './fixtures.js';

const now = '2026-05-17T12:00:00Z';

test('maps exact system labels to configured systems', () => {
  const { incidents, warnings } = normalizeIssuesToIncidents([issue()], testConfig(), { now });
  assert.deepEqual(incidents[0].systemIds, ['api']);
  assert.equal(incidents[0].affectsGlobal, false);
  assert.deepEqual(warnings, []);
});

test('supports multiple system labels', () => {
  const { incidents } = normalizeIssuesToIncidents(
    [
      issue({
        labels: ['system:api', 'system:web', 'severity:partial-outage', 'status:monitoring']
      })
    ],
    testConfig(),
    { now }
  );
  assert.deepEqual(incidents[0].systemIds, ['api', 'web']);
  assert.equal(incidents[0].severity, 'partial-outage');
  assert.equal(incidents[0].status, 'monitoring');
});

test('unlabeled issue becomes global', () => {
  const { incidents } = normalizeIssuesToIncidents(
    [issue({ labels: ['severity:degraded'] })],
    testConfig(),
    { now }
  );
  assert.deepEqual(incidents[0].systemIds, []);
  assert.equal(incidents[0].affectsGlobal, true);
});

test('unknown system label warns and renders globally', () => {
  const { incidents, warnings } = normalizeIssuesToIncidents(
    [issue({ labels: ['system:unknown', 'severity:degraded'] })],
    testConfig(),
    { now }
  );
  assert.equal(incidents[0].affectsGlobal, true);
  assert.equal(warnings[0].code, 'unknown-system-label');
});

test('missing severity warns and defaults', () => {
  const { incidents, warnings } = normalizeIssuesToIncidents(
    [issue({ labels: ['system:api'] })],
    testConfig(),
    { now }
  );
  assert.equal(incidents[0].severity, 'degraded');
  assert.equal(warnings[0].code, 'missing-severity');
});

test('latest comment is public message', () => {
  const { incidents } = normalizeIssuesToIncidents(
    [
      issue({
        body: 'Body message',
        comments: [
          { body: 'Earlier update', createdAt: '2026-05-10T13:00:00Z', updatedAt: '2026-05-10T13:00:00Z' },
          { body: 'Final update', createdAt: '2026-05-10T14:00:00Z', updatedAt: '2026-05-10T14:00:00Z' }
        ]
      })
    ],
    testConfig(),
    { now }
  );
  assert.equal(incidents[0].message, 'Final update');
});
