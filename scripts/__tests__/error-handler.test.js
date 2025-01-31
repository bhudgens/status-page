const errorHandler = require('../error-handler');

// Mock Octokit
jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    issues: {
      create: jest.fn().mockResolvedValue({
        data: { number: 123 }
      })
    }
  }))
}));

// Mock fetch for Slack notifications
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true
  })
);

describe('ErrorHandler', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    errorHandler.clearErrors();
    
    // Mock environment variables
    process.env.GITHUB_TOKEN = 'mock-token';
    process.env.GITHUB_REPOSITORY = 'owner/repo';
    process.env.GITHUB_ACTION = 'test-action';
    process.env.GITHUB_WORKFLOW = 'test-workflow';
    process.env.GITHUB_EVENT_NAME = 'test-event';
  });

  describe('createErrorIssue', () => {
    test('creates GitHub issue with correct format', async () => {
      const error = new Error('Test error');
      const context = 'Test context';

      const issue = await errorHandler.createErrorIssue(error, context);

      expect(issue.number).toBe(123);
      expect(errorHandler.getErrorCount()).toBe(0); // Should not increment count as it's not using handleError
    });

    test('throws error when GitHub API fails', async () => {
      const { Octokit } = require('@octokit/rest');
      Octokit.mockImplementationOnce(() => ({
        issues: {
          create: jest.fn().mockRejectedValue(new Error('API Error'))
        }
      }));

      const error = new Error('Test error');
      await expect(errorHandler.createErrorIssue(error, 'context'))
        .rejects
        .toThrow('API Error');
    });
  });

  describe('formatErrorBody', () => {
    test('formats error message with all required sections', () => {
      const error = new Error('Test error');
      const context = 'Test context';

      const body = errorHandler.formatErrorBody(error, context);

      expect(body).toContain('## Error Details');
      expect(body).toContain('### Context\nTest context');
      expect(body).toContain('### Error Message\n```\nTest error\n```');
      expect(body).toContain('### Stack Trace');
      expect(body).toContain('### Additional Information');
      expect(body).toContain('### System Information');
      expect(body).toContain('Node Version:');
      expect(body).toContain('Platform:');
      expect(body).toContain('Architecture:');
    });
  });

  describe('notifySlack', () => {
    test('sends notification when webhook URL is configured', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
      const error = new Error('Test error');
      const context = 'Test context';

      await errorHandler.notifySlack(error, context);

      expect(fetch).toHaveBeenCalledWith(
        'https://hooks.slack.com/test',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });

    test('skips notification when webhook URL is not configured', async () => {
      delete process.env.SLACK_WEBHOOK_URL;
      const error = new Error('Test error');
      
      await errorHandler.notifySlack(error, 'context');
      
      expect(fetch).not.toHaveBeenCalled();
    });

    test('handles failed notifications gracefully', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
      global.fetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          statusText: 'Bad Request'
        })
      );

      const error = new Error('Test error');
      await expect(errorHandler.notifySlack(error, 'context'))
        .rejects
        .toThrow('Failed to send Slack notification: Bad Request');
    });
  });

  describe('handleError', () => {
    test('processes error completely', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
      const error = new Error('Test error');
      const context = 'Test context';

      const issue = await errorHandler.handleError(error, context);

      expect(issue.number).toBe(123);
      expect(errorHandler.getErrorCount()).toBe(1);
      expect(fetch).toHaveBeenCalled(); // Slack notification sent
    });

    test('tracks error even if Slack notification fails', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
      global.fetch.mockImplementationOnce(() => Promise.reject(new Error('Network error')));
      
      const error = new Error('Test error');
      const issue = await errorHandler.handleError(error, 'context');

      expect(issue.number).toBe(123);
      expect(errorHandler.getErrorCount()).toBe(1);
    });
  });

  describe('error tracking', () => {
    test('tracks errors correctly', async () => {
      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');

      await errorHandler.handleError(error1, 'context1');
      await errorHandler.handleError(error2, 'context2');

      expect(errorHandler.getErrorCount()).toBe(2);
    });

    test('clears errors correctly', async () => {
      const error = new Error('Test error');
      await errorHandler.handleError(error, 'context');
      expect(errorHandler.getErrorCount()).toBe(1);

      errorHandler.clearErrors();
      expect(errorHandler.getErrorCount()).toBe(0);
    });
  });
});
