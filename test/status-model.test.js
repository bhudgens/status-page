import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStatusModel } from '../src/status-model.js';
import { issue, testConfig } from './fixtures.js';

const now = '2026-05-17T12:00:00Z';

test('rolls up multiple open incidents by worst severity', () => {
  const model = buildStatusModel({
    config: testConfig(),
    now,
    issues: [
      issue({ number: 1, labels: ['system:api', 'severity:degraded'] }),
      issue({ number: 2, title: 'Worse', labels: ['system:api', 'severity:major-outage'] })
    ]
  });

  assert.equal(model.overall.severity, 'major-outage');
  assert.equal(model.systems.find((system) => system.id === 'api').health.severity, 'major-outage');
  assert.deepEqual(
    model.active_incidents.map((incident) => incident.number),
    [2, 1]
  );
});

test('global incidents do not mark every system affected', () => {
  const model = buildStatusModel({
    config: testConfig(),
    now,
    issues: [issue({ number: 5, labels: ['severity:major-outage'] })]
  });

  assert.equal(model.overall.severity, 'major-outage');
  assert.equal(model.systems.find((system) => system.id === 'api').health.state, 'operational');
});

test('history days reflect incident window overlap', () => {
  const model = buildStatusModel({
    config: testConfig(),
    now,
    issues: [
      issue({
        number: 9,
        state: 'CLOSED',
        labels: ['system:api', 'severity:partial-outage'],
        createdAt: '2026-05-15T23:00:00Z',
        closedAt: '2026-05-16T01:00:00Z'
      })
    ]
  });

  const api = model.systems.find((system) => system.id === 'api');
  assert.equal(api.history.find((day) => day.date === '2026-05-15').severity, 'partial-outage');
  assert.equal(api.history.find((day) => day.date === '2026-05-16').severity, 'partial-outage');
});

test('global-only mode renders no systems', () => {
  const model = buildStatusModel({
    config: testConfig({ systems: [] }),
    now,
    issues: [issue({ labels: ['severity:degraded'] })]
  });

  assert.deepEqual(model.systems, []);
  assert.equal(model.overall.severity, 'degraded');
});
