import { loadConfig } from './config.js';
import { readIssuesWithGh } from './gh.js';
import { buildStatusModel } from './status-model.js';
import { renderSite } from './render.js';
import { syncLabels } from './labels.js';

const command = process.argv[2] || 'build';

try {
  if (command === 'build' || command === 'render') {
    const config = loadConfig();
    const issues = await readIssuesWithGh({ historyDays: config.site.historyDays });
    const model = buildStatusModel({ config, issues });
    await renderSite(model);
    console.log(`Rendered ${model.site.title} with ${model.active_incidents.length} active incident(s).`);
  } else if (command === 'sync-labels') {
    const plan = await syncLabels();
    const summary = plan.reduce((counts, item) => {
      counts[item.action] = (counts[item.action] || 0) + 1;
      return counts;
    }, {});
    console.log(
      `Label sync complete: ${summary.create || 0} created, ${summary.update || 0} updated, ${summary.noop || 0} unchanged.`
    );
  } else {
    throw new Error(`Unknown command: ${command}`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
