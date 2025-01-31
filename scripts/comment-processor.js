#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Octokit } = require('@octokit/rest');

// GitHub authentication
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

// Repository details
const [owner, repo] = (process.env.GITHUB_REPOSITORY || '').split('/');

// Regex patterns for status updates
const STATUS_UPDATE_PATTERNS = {
  investigating: /\b(start|begin)\s*investigat(ing|e)\b/i,
  identified: /\b(root\s*cause|problem)\s*(identified|found)\b/i,
  monitoring: /\b(monitor|track)\s*(issue|problem)\b/i,
  resolved: /\b(resolv(ed|e)|fix(ed|ed)|solution)\b/i
};

const SEVERITY_UPDATE_PATTERNS = {
  critical: /\b(critical|severe|major\s*impact)\b/i,
  major: /\b(significant|substantial)\s*(impact|issue)\b/i,
  minor: /\b(minor|small|limited)\s*(impact|issue)\b/i
};

async function processComments(issueNumber) {
  try {
    // Fetch issue comments
    const { data: comments } = await octokit.issues.listComments({
      owner,
      repo,
      issue_number: issueNumber
    });

    // Fetch current issue details
    const { data: issue } = await octokit.issues.get({
      owner,
      repo,
      issue_number: issueNumber
    });

    let updatedStatus = null;
    let updatedSeverity = null;

    // Process comments in chronological order
    for (const comment of comments.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))) {
      const commentBody = comment.body;

      // Check for status updates
      for (const [status, pattern] of Object.entries(STATUS_UPDATE_PATTERNS)) {
        if (pattern.test(commentBody)) {
          updatedStatus = status;
        }
      }

      // Check for severity updates
      for (const [severity, pattern] of Object.entries(SEVERITY_UPDATE_PATTERNS)) {
        if (pattern.test(commentBody)) {
          updatedSeverity = severity;
        }
      }
    }

    // Prepare labels to update
    const labelsToAdd = [];
    const labelsToRemove = [];

    // Update status label
    if (updatedStatus) {
      // Remove existing status labels
      const currentStatusLabels = issue.labels
        .filter(label => label.name.startsWith('status: '))
        .map(label => label.name);
      labelsToRemove.push(...currentStatusLabels);
      
      // Add new status label
      labelsToAdd.push(`status: ${updatedStatus}`);
    }

    // Update severity label
    if (updatedSeverity) {
      // Remove existing severity labels
      const currentSeverityLabels = issue.labels
        .filter(label => label.name.startsWith('severity: '))
        .map(label => label.name);
      labelsToRemove.push(...currentSeverityLabels);
      
      // Add new severity label
      labelsToAdd.push(`severity: ${updatedSeverity}`);
    }

    // Update issue labels if needed
    if (labelsToRemove.length > 0 || labelsToAdd.length > 0) {
      await octokit.issues.update({
        owner,
        repo,
        issue_number: issueNumber,
        labels: [
          ...issue.labels
            .filter(label => !labelsToRemove.includes(label.name))
            .map(label => label.name),
          ...labelsToAdd
        ]
      });

      console.log(`Updated labels for issue #${issueNumber}`);
    }

    return {
      status: updatedStatus,
      severity: updatedSeverity
    };
  } catch (error) {
    console.error(`Error processing comments for issue #${issueNumber}:`, error);
    throw error;
  }
}

// Main function to be called by GitHub Actions
async function main() {
  // Read issue data from environment variable or input file
  const issueDataPath = process.env.GITHUB_EVENT_PATH;
  
  if (!issueDataPath) {
    console.error('No GitHub event path provided');
    process.exit(1);
  }

  try {
    const issueData = JSON.parse(fs.readFileSync(issueDataPath, 'utf8'));
    const issueNumber = issueData.issue?.number || issueData.pull_request?.number;

    if (!issueNumber) {
      console.error('No issue or pull request number found in event data');
      process.exit(1);
    }

    await processComments(issueNumber);
  } catch (error) {
    console.error('Error processing issue comments:', error);
    process.exit(1);
  }
}

// Only run main if script is called directly
if (require.main === module) {
  main();
}

module.exports = {
  processComments
};
