import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const ISSUE_FIELDS = [
  'number',
  'title',
  'body',
  'state',
  'labels',
  'url',
  'createdAt',
  'updatedAt',
  'closedAt',
  'comments'
].join(',');

export async function readIssuesWithGh({ historyDays, cwd = process.cwd(), runner = runGh } = {}) {
  const openIssues = await listIssues({ state: 'open', cwd, runner });
  const closedIssues = await listIssues({
    state: 'closed',
    cwd,
    runner,
    search: `closed:>=${closedSinceDate(historyDays)}`
  });

  return dedupeIssues([...openIssues, ...closedIssues]);
}

async function listIssues({ state, cwd, runner, search }) {
  const args = [
    'issue',
    'list',
    '--state',
    state,
    '--limit',
    '200',
    '--json',
    ISSUE_FIELDS
  ];

  if (search) {
    args.push('--search', search);
  }

  const stdout = await runner(args, { cwd });
  try {
    return JSON.parse(stdout);
  } catch (error) {
    throw new Error(`Failed to parse gh issue list JSON for state ${state}: ${error.message}`);
  }
}

export async function runGh(args, { cwd = process.cwd() } = {}) {
  try {
    const { stdout } = await execFileAsync('gh', args, {
      cwd,
      maxBuffer: 10 * 1024 * 1024
    });
    return stdout;
  } catch (error) {
    const stderr = error.stderr ? String(error.stderr).trim() : '';
    const command = `gh ${args.join(' ')}`;
    throw new Error(
      [
        `GitHub CLI command failed: ${command}`,
        stderr && `gh stderr: ${stderr}`,
        `Reproduce locally from the repo root with: ${command}`,
        'Check that gh is installed, authenticated, and pointed at a GitHub repository.'
      ]
        .filter(Boolean)
        .join('\n')
    );
  }
}

function closedSinceDate(historyDays = 30) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - Number(historyDays || 30));
  return date.toISOString().slice(0, 10);
}

function dedupeIssues(issues) {
  return [...new Map(issues.map((issue) => [issue.number, issue])).values()];
}
