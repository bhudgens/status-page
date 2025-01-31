#!/usr/bin/env node

const { Octokit } = require('@octokit/rest');

// GitHub authentication
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

// Repository details
const [owner, repo] = (process.env.GITHUB_REPOSITORY || '').split('/');

class ErrorHandler {
  constructor() {
    this.errors = [];
  }

  async createErrorIssue(error, context) {
    try {
      const title = `[Error] ${error.message || 'System Error'}`;
      const body = this.formatErrorBody(error, context);

      const { data: issue } = await octokit.issues.create({
        owner,
        repo,
        title,
        body,
        labels: ['type: error', 'priority: high']
      });

      console.log(`Created error issue #${issue.number}`);
      return issue;
    } catch (err) {
      console.error('Failed to create error issue:', err);
      throw err;
    }
  }

  formatErrorBody(error, context) {
    return `## Error Details

### Context
${context}

### Error Message
\`\`\`
${error.message}
\`\`\`

### Stack Trace
\`\`\`
${error.stack}
\`\`\`

### Additional Information
- Timestamp: ${new Date().toISOString()}
- Action: ${process.env.GITHUB_ACTION || 'N/A'}
- Workflow: ${process.env.GITHUB_WORKFLOW || 'N/A'}
- Event: ${process.env.GITHUB_EVENT_NAME || 'N/A'}

### System Information
- Node Version: ${process.version}
- Platform: ${process.platform}
- Architecture: ${process.arch}
`;
  }

  async notifySlack(error, context) {
    if (!process.env.SLACK_WEBHOOK_URL) {
      console.warn('Slack webhook URL not configured, skipping notification');
      return;
    }

    try {
      const response = await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: `🚨 Error in Status Page System\n*${error.message}*\n\`\`\`${context}\`\`\``
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to send Slack notification: ${response.statusText}`);
      }

      console.log('Sent Slack notification');
    } catch (err) {
      console.error('Failed to send Slack notification:', err);
    }
  }

  async handleError(error, context) {
    try {
      // Create GitHub issue
      const issue = await this.createErrorIssue(error, context);

      // Send Slack notification if configured
      await this.notifySlack(error, context);

      // Add error to tracking
      this.errors.push({
        timestamp: new Date(),
        error,
        context,
        issueNumber: issue.number
      });

      return issue;
    } catch (err) {
      console.error('Error handler failed:', err);
      throw err;
    }
  }

  getErrorCount() {
    return this.errors.length;
  }

  clearErrors() {
    this.errors = [];
  }
}

// Export singleton instance
const errorHandler = new ErrorHandler();
module.exports = errorHandler;

// Example usage in other scripts:
/*
const errorHandler = require('./error-handler');

try {
  // Your code here
} catch (error) {
  await errorHandler.handleError(error, 'Context description');
  process.exit(1);
}
*/
