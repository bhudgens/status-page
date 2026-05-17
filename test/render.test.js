import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { renderSite } from '../src/render.js';
import { buildStatusModel } from '../src/status-model.js';
import { issue, testConfig } from './fixtures.js';

test('renderer writes html json and css', async () => {
  const outDir = await fs.mkdtemp(path.join(os.tmpdir(), 'status-page-'));
  const model = buildStatusModel({
    config: testConfig(),
    now: '2026-05-17T12:00:00Z',
    issues: [issue({ title: 'Visible incident', comments: [{ body: 'Latest public update', createdAt: '2026-05-17T11:00:00Z' }] })]
  });

  await renderSite(model, { outDir });

  const html = await fs.readFile(path.join(outDir, 'index.html'), 'utf8');
  const json = JSON.parse(await fs.readFile(path.join(outDir, 'status.json'), 'utf8'));
  await fs.access(path.join(outDir, 'assets', 'status.css'));

  assert.match(html, /Visible incident/);
  assert.match(html, /Latest public update/);
  assert.equal(json.active_incidents[0].title, 'Visible incident');
});
