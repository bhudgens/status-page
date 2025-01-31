#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Octokit } = require('@octokit/rest');

// Read labels from labels.json
const labelsPath = path.join(__dirname, '..', '.github', 'labels.json');
const labelsData = JSON.parse(fs.readFileSync(labelsPath, 'utf8'));

// GitHub authentication
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

// Repository details
const [owner, repo] = (process.env.GITHUB_REPOSITORY || '').split('/');

async function syncLabels() {
  // Combine all label types
  const allLabels = [
    ...labelsData.status_labels,
    ...labelsData.severity_labels,
    ...labelsData.system_labels
  ];

  try {
    // Sync labels
    for (const label of allLabels) {
      try {
        await octokit.issues.createLabel({
          owner,
          repo,
          name: label.name,
          color: label.color,
          description: label.description
        });
        console.log(`Created/Updated label: ${label.name}`);
      } catch (error) {
        if (error.status === 422) {
          // Label already exists, update it
          await octokit.issues.updateLabel({
            owner,
            repo,
            name: label.name,
            color: label.color,
            description: label.description
          });
          console.log(`Updated existing label: ${label.name}`);
        } else {
          console.error(`Error processing label ${label.name}:`, error);
        }
      }
    }
    console.log('Label synchronization complete');
  } catch (error) {
    console.error('Error synchronizing labels:', error);
    process.exit(1);
  }
}

// Only run if script is called directly
if (require.main === module) {
  if (!process.env.GITHUB_TOKEN) {
    console.error('GITHUB_TOKEN environment variable is required');
    process.exit(1);
  }

  if (!owner || !repo) {
    console.error('GITHUB_REPOSITORY environment variable is required');
    process.exit(1);
  }

  syncLabels();
}

module.exports = { syncLabels };
