import test from 'node:test';
import assert from 'node:assert/strict';
import { planLabelSync, validateLabelDefinitions } from '../src/labels.js';

test('plans label create update and noop actions', () => {
  const plan = planLabelSync(
    [
      { name: 'bug', color: 'ff0000', description: 'Bug' },
      { name: 'enhancement', color: '#00ff00', description: 'Enhancement' },
      { name: 'ready', color: '0000ff', description: 'Ready' }
    ],
    [
      { name: 'bug', color: 'ff0000', description: 'Bug' },
      { name: 'enhancement', color: 'cccccc', description: 'Old' }
    ]
  );

  assert.deepEqual(
    plan.map((item) => item.action),
    ['noop', 'update', 'create']
  );
});

test('label definitions reject duplicates', () => {
  assert.throws(
    () =>
      validateLabelDefinitions([
        { name: 'bug', color: 'ff0000', description: 'Bug' },
        { name: 'bug', color: '00ff00', description: 'Bug again' }
      ]),
    /Duplicate/
  );
});
