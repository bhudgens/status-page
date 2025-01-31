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

// Required sections for a valid incident report
const REQUIRED_SECTIONS = [
  'Affected Systems',
  'Incident Description',
  'Impact',
  'Initial Assessment',
  'Action Items'
];

// Validation function for issue body
function validateIssueBody(body) {
  const errors = [];

  // Check for required sections
  for (const section of REQUIRED_SECTIONS) {
    if (!body.includes(section)) {
      errors.push(`Missing required section: ${section}`);
    }
  }

  // Check for at least one affected system
  const affectedSystemsMatch = body.match(/- \[ \] system: \w+/g);
  if (!affectedSystemsMatch || affectedSystemsMatch.length === 0) {
    errors.push('No affected systems specified');
  }

  // Check for non-empty description
  const descriptionMatch = body.match(/### Incident Description\n(.*)\n/);
  if (!descriptionMatch || descriptionMatch[1].trim().length === 0) {
    errors.push('Incident description is empty');
  }

  return errors;
}

async function validateIssueTemplate(issueNumber) {
  try {
    // Fetch issue details
    const { data: issue } = await octokit.issues.get({
      owner,
      repo,
      issue_number: issueNumber
    });

    // Validate issue body
    const validationErrors = validateIssueBody(issue.body);

    if (validationErrors.length > 0) {
      // Add a comment with validation errors
      await octokit.issues.createComment({
        owner,
        repo,
        issue_number: issueNumber,
        body: `❌ Issue template validation failed:\n\n${validationErrors.map(e => `- ${e}`).join('\n')}\n\nPlease update the issue to include all required information.`
      });

      // Close the issue if it doesn't meet requirements
      await octokit.issues.update({
        owner,
        repo,
        issue_number: issueNumber,
        state: 'closed'
      });

      console.log(`Issue #${issueNumber} closed due to template validation errors`);
      return false;
    }

    console.log(`Issue #${issueNumber} passed template validation`);
    return true;
  } catch (error) {
    console.error(`Error validating issue #${issueNumber}:`, error);
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

    const isValid = await validateIssueTemplate(issueNumber);
    process.exit(isValid ? 0 : 1);
  } catch (error) {
    console.error('Error processing issue template validation:', error);
    process.exit(1);
  }
}

// Only run main if script is called directly
if (require.main === module) {
  main();
}

module.exports = {
  validateIssueBody,
  validateIssueTemplate
};
