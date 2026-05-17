import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConfig } from '../src/config.js';
import { testConfig } from './fixtures.js';

test('valid config normalizes', () => {
  const config = testConfig();
  assert.equal(config.site.historyDays, 30);
  assert.equal(config.systems.length, 3);
  assert.equal(config.severities.degraded.rank, 1);
});

test('zero systems is valid for global-only mode', () => {
  const config = testConfig({ systems: [] });
  assert.deepEqual(config.systems, []);
});

test('duplicate system ids fail', () => {
  assert.throws(
    () =>
      testConfig({
        systems: [
          { id: 'api', name: 'API' },
          { id: 'api', name: 'Other API' }
        ]
      }),
    /Duplicate system id/
  );
});

test('invalid category references fail', () => {
  assert.throws(
    () =>
      testConfig({
        systems: [{ id: 'api', name: 'API', category: 'missing' }]
      }),
    /unknown category/
  );
});

test('missing defaults fail', () => {
  assert.throws(
    () =>
      normalizeConfig({
        site: { title: 'Bad', history_days: 30 },
        statuses: {},
        severities: {},
        defaults: { status: 'missing', severity: 'missing' }
      }),
    /defaults.status/
  );
});
