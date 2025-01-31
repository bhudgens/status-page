#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Octokit } from '@octokit/rest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// GitHub authentication
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

// Repository details
const [owner, repo] = (process.env.GITHUB_REPOSITORY || '').split('/');

// Mapping of GitHub issue labels to status and severity
const STATUS_MAPPING = {
  'status: investigating': 'investigating',
  'status: identified': 'identified',
  'status: monitoring': 'monitoring',
  'status: resolved': 'resolved'
};

const SEVERITY_MAPPING = {
  'severity: critical': 'critical',
  'severity: major': 'major',
  'severity: minor': 'minor'
};

async function fetchOpenIssues() {
  try {
    const { data: issues } = await octokit.issues.listForRepo({
      owner,
      repo,
      state: 'open',
      labels: 'status: investigating,status: identified,status: monitoring'
    });

    return issues;
  } catch (error) {
    console.error('Error fetching open issues:', error);
    throw error;
  }
}

function parseIssueLabels(issue) {
  // Extract status from labels
  const status = issue.labels
    .find(label => label.name.startsWith('status: '))?.name
    .replace('status: ', '') || 'investigating';

  // Extract severity from labels
  const severity = issue.labels
    .find(label => label.name.startsWith('severity: '))?.name
    .replace('severity: ', '') || 'minor';

  // Extract affected systems from labels
  const systems = issue.labels
    .filter(label => label.name.startsWith('system: '))
    .map(label => label.name.replace('system: ', ''));

  return {
    id: issue.number.toString(),
    title: issue.title,
    status: STATUS_MAPPING[`status: ${status}`] || status,
    severity: SEVERITY_MAPPING[`severity: ${severity}`] || severity,
    systems: systems,
    created_at: issue.created_at,
    updated_at: issue.updated_at,
    resolved_at: null
  };
}

function updateStatusData(issues) {
  // Read existing status data
  const statusDataPath = path.join(__dirname, '..', 'data', 'status.json');
  let statusData = { systems: [], incidents: [] };

  try {
    statusData = JSON.parse(fs.readFileSync(statusDataPath, 'utf8'));
  } catch (error) {
    console.warn('No existing status data found. Creating new file.');
  }

  // Update systems based on issues
  const systemsToAdd = new Set();
  issues.forEach(issue => {
    const parsedIssue = parseIssueLabels(issue);
    parsedIssue.systems.forEach(systemName => systemsToAdd.add(systemName));
  });

  // Add new systems if they don't exist
  systemsToAdd.forEach(systemName => {
    if (!statusData.systems.some(sys => sys.id === systemName)) {
      statusData.systems.push({
        id: systemName,
        name: systemName,
        description: `Status for ${systemName}`,
        category: 'default',
        labels: []
      });
    }
  });

  // Update incidents
  const updatedIncidents = issues.map(parseIssueLabels);

  // Replace existing incidents or add new ones
  updatedIncidents.forEach(incident => {
    const existingIndex = statusData.incidents.findIndex(inc => inc.id === incident.id);
    
    if (existingIndex !== -1) {
      // Update existing incident
      statusData.incidents[existingIndex] = incident;
    } else {
      // Add new incident
      statusData.incidents.push(incident);
    }
  });

  // Write updated status data
  fs.writeFileSync(statusDataPath, JSON.stringify(statusData, null, 2));
  console.log('Status data updated successfully');

  return statusData;
}

async function main() {
  try {
    const openIssues = await fetchOpenIssues();
    updateStatusData(openIssues);
  } catch (error) {
    console.error('Error updating status file:', error);
    process.exit(1);
  }
}

// Only run main if script is called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  fetchOpenIssues,
  parseIssueLabels,
  updateStatusData
};
