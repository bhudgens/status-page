import test from 'node:test';
import assert from 'node:assert/strict';
import { readIssuesWithGh } from '../src/gh.js';

test('gh reader combines open and recently closed issues', async () => {
  const calls = [];
  const issues = await readIssuesWithGh({
    historyDays: 30,
    cwd: '/repo',
    runner: async (args, options) => {
      calls.push({ args, options });
      if (args.includes('open')) {
        return JSON.stringify([{ number: 1, title: 'Open incident' }]);
      }
      return JSON.stringify([{ number: 2, title: 'Closed incident' }]);
    }
  });

  assert.deepEqual(
    issues.map((item) => item.number),
    [1, 2]
  );
  assert.equal(calls[0].options.cwd, '/repo');
  assert.ok(calls[1].args.includes('--search'));
});

test('gh reader rejects invalid JSON with context', async () => {
  await assert.rejects(
    () =>
      readIssuesWithGh({
        runner: async () => 'not json'
      }),
    /Failed to parse gh issue list JSON/
  );
});
