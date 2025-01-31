#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

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

function parseIssue(issue) {
  // Extract status from labels
  const status = Object.keys(STATUS_MAPPING)
    .find(label => issue.labels.some(l => l.name === label)) || 'investigating';

  const severity = Object.keys(SEVERITY_MAPPING)
    .find(label => issue.labels.some(l => l.name === label)) || 'minor';

  // Extract affected systems from labels
  const systems = issue.labels
    .filter(label => label.name.startsWith('system:'))
    .map(label => label.name.replace('system:', ''));

  return {
    id: issue.number.toString(),
    title: issue.title,
    status: STATUS_MAPPING[`status: ${status}`] || status,
    severity: SEVERITY_MAPPING[`severity: ${severity}`] || severity,
    systems: systems,
    created_at: issue.created_at,
    updated_at: issue.updated_at,
    resolved_at: issue.closed_at || null
  };
}

function updateStatusData(issue) {
  // Read existing status data
  const statusDataPath = path.join(__dirname, '..', 'data', 'status.json');
  let statusData = { systems: [], incidents: [] };

  try {
    statusData = JSON.parse(fs.readFileSync(statusDataPath, 'utf8'));
  } catch (error) {
    console.warn('No existing status data found. Creating new file.');
  }

  // Parse the current issue
  const parsedIssue = parseIssue(issue);

  // Add or update the incident
  const existingIncidentIndex = statusData.incidents.findIndex(inc => inc.id === parsedIssue.id);
  
  if (existingIncidentIndex !== -1) {
    // Update existing incident
    statusData.incidents[existingIncidentIndex] = parsedIssue;
  } else {
    // Add new incident
    statusData.incidents.push(parsedIssue);
  }

  // Update systems status based on incidents
  parsedIssue.systems.forEach(systemName => {
    const systemIndex = statusData.systems.findIndex(sys => sys.id === systemName);
    
    if (systemIndex === -1) {
      // Add new system if not exists
      statusData.systems.push({
        id: systemName,
        name: systemName,
        description: `Status for ${systemName}`,
        category: 'default',
        labels: []
      });
    }
  });

  // Write updated status data
  fs.writeFileSync(statusDataPath, JSON.stringify(statusData, null, 2));
  console.log(`Updated status data for issue #${parsedIssue.id}`);
}

// Main function to be called by GitHub Actions
function main() {
  // Read issue data from environment variable or input file
  const issueDataPath = process.env.GITHUB_EVENT_PATH;
  
  if (!issueDataPath) {
    console.error('No GitHub event path provided');
    process.exit(1);
  }

  try {
    const issueData = JSON.parse(fs.readFileSync(issueDataPath, 'utf8'));
    const issue = issueData.issue || issueData.pull_request;

    if (!issue) {
      console.error('No issue or pull request found in event data');
      process.exit(1);
    }

    updateStatusData(issue);
  } catch (error) {
    console.error('Error processing issue:', error);
    process.exit(1);
  }
}

// Only run main if script is called directly
if (require.main === module) {
  main();
}

module.exports = {
  parseIssue,
  updateStatusData
};
