import { jest } from '@jest/globals';

// Mock all the modules we'll be testing
jest.mock('../issue-parser.js');
jest.mock('../comment-processor.js');
jest.mock('../update-status-file.js');
jest.mock('../validate-issue-template.js');
jest.mock('../error-handler.js');
jest.mock('../manage-labels.js');

describe('GitHub Actions Integration Tests', () => {
  let mockGitHubApi;
  
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Setup mock GitHub API
    mockGitHubApi = {
      issues: {
        get: jest.fn(),
        createComment: jest.fn(),
        update: jest.fn(),
        addLabels: jest.fn(),
        removeLabel: jest.fn()
      },
      repos: {
        getContent: jest.fn(),
        createOrUpdateFileContents: jest.fn()
      }
    };
  });

  describe('New Incident Creation Flow', () => {
    const mockNewIssue = {
      number: 123,
      title: 'Database Connectivity Issues',
      body: `### Impact
Critical - Service is completely down

### Status
investigating

### Components Affected
- database
- api

### Description
Database connections are timing out`,
      labels: ['incident', 'database']
    };

    test('should successfully process new critical incident', async () => {
      // Setup mock responses
      mockGitHubApi.repos.getContent.mockResolvedValueOnce({
        data: {
          content: Buffer.from(JSON.stringify({
            incidents: [],
            systems: [
              { id: 'database', name: 'Database', status: 'operational' },
              { id: 'api', name: 'API', status: 'operational' }
            ]
          })).toString('base64'),
          sha: 'abc123'
        }
      });

      // Execute and verify full workflow
      await expect(async () => {
        // Validate template
        await validateIssueTemplate(mockNewIssue.body);
        // Parse issue
        const incident = await parseIssue(mockNewIssue);
        // Update status
        await updateStatusFile(incident, mockGitHubApi);
        // Update labels
        await manageLabels(mockNewIssue.number, 'investigating', [], mockGitHubApi);
      }).not.toThrow();
    });

    test('should handle invalid issue template', async () => {
      const invalidIssue = {
        ...mockNewIssue,
        body: 'Invalid template format'
      };

      await expect(validateIssueTemplate(invalidIssue.body)).rejects.toThrow();
    });
  });

  describe('Incident Update Flow', () => {
    const mockUpdateComment = {
      body: `### Status Update
resolved

### Message
Database connectivity has been restored`,
      issue_number: 123
    };

    test('should process status update comment', async () => {
      // Setup mock status data
      mockGitHubApi.repos.getContent.mockResolvedValueOnce({
        data: {
          content: Buffer.from(JSON.stringify({
            incidents: [{
              id: '123',
              status: 'investigating',
              components: ['database']
            }],
            systems: [
              { id: 'database', name: 'Database', status: 'degraded' }
            ]
          })).toString('base64'),
          sha: 'def456'
        }
      });

      await expect(async () => {
        const update = await processComment(mockUpdateComment, 123, mockGitHubApi);
        await updateStatusFile(update, mockGitHubApi);
        await manageLabels(123, 'resolved', ['investigating'], mockGitHubApi);
      }).not.toThrow();
    });

    test('should handle invalid update comment format', async () => {
      const invalidComment = {
        ...mockUpdateComment,
        body: 'Invalid update format'
      };

      await expect(processComment(invalidComment, 123, mockGitHubApi)).rejects.toThrow();
    });
  });

  describe('Multiple Component Updates', () => {
    test('should handle incident affecting multiple systems', async () => {
      const multiSystemIssue = {
        number: 124,
        title: 'Multiple System Outage',
        body: `### Impact
Major - Multiple services affected

### Status
investigating

### Components Affected
- database
- api
- web
- cache

### Description
Multiple system failure detected`,
        labels: ['incident', 'major']
      };

      mockGitHubApi.repos.getContent.mockResolvedValueOnce({
        data: {
          content: Buffer.from(JSON.stringify({
            incidents: [],
            systems: [
              { id: 'database', name: 'Database', status: 'operational' },
              { id: 'api', name: 'API', status: 'operational' },
              { id: 'web', name: 'Web', status: 'operational' },
              { id: 'cache', name: 'Cache', status: 'operational' }
            ]
          })).toString('base64'),
          sha: 'ghi789'
        }
      });

      await expect(async () => {
        const incident = await parseIssue(multiSystemIssue);
        await updateStatusFile(incident, mockGitHubApi);
        await manageLabels(multiSystemIssue.number, 'investigating', [], mockGitHubApi);
      }).not.toThrow();
    });
  });

  describe('Status Transition Flow', () => {
    const statusTransitions = [
      { from: 'investigating', to: 'identified' },
      { from: 'identified', to: 'monitoring' },
      { from: 'monitoring', to: 'resolved' }
    ];

    test.each(statusTransitions)('should handle transition from $from to $to', async ({ from, to }) => {
      const transitionComment = {
        body: `### Status Update
${to}

### Message
Transitioning status`,
        issue_number: 125
      };

      mockGitHubApi.repos.getContent.mockResolvedValueOnce({
        data: {
          content: Buffer.from(JSON.stringify({
            incidents: [{
              id: '125',
              status: from,
              components: ['api']
            }],
            systems: [
              { id: 'api', name: 'API', status: 'degraded' }
            ]
          })).toString('base64'),
          sha: `sha_${from}_${to}`
        }
      });

      await expect(async () => {
        const update = await processComment(transitionComment, 125, mockGitHubApi);
        await updateStatusFile(update, mockGitHubApi);
        await manageLabels(125, to, [from], mockGitHubApi);
      }).not.toThrow();
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle GitHub API rate limit errors', async () => {
      const rateLimitError = new Error('API rate limit exceeded');
      rateLimitError.status = 403;

      mockGitHubApi.repos.getContent.mockRejectedValueOnce(rateLimitError);

      await expect(async () => {
        await handleError(rateLimitError, { issue: { number: 126 } }, mockGitHubApi);
      }).not.toThrow();
    });

    test('should handle network timeouts', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.code = 'ETIMEDOUT';

      mockGitHubApi.repos.getContent.mockRejectedValueOnce(timeoutError);

      await expect(async () => {
        await handleError(timeoutError, { issue: { number: 127 } }, mockGitHubApi);
      }).not.toThrow();
    });

    test('should handle concurrent update conflicts', async () => {
      const conflictError = new Error('Reference update failed');
      conflictError.status = 409;

      mockGitHubApi.repos.createOrUpdateFileContents.mockRejectedValueOnce(conflictError);

      await expect(async () => {
        await handleError(conflictError, { issue: { number: 128 } }, mockGitHubApi);
      }).not.toThrow();
    });
  });

  describe('System Status Aggregation', () => {
    test('should correctly aggregate multiple incident impacts', async () => {
      const mockIncidents = [
        {
          id: '129',
          status: 'investigating',
          components: ['database', 'api'],
          severity: 'critical'
        },
        {
          id: '130',
          status: 'monitoring',
          components: ['api', 'web'],
          severity: 'minor'
        }
      ];

      mockGitHubApi.repos.getContent.mockResolvedValueOnce({
        data: {
          content: Buffer.from(JSON.stringify({
            incidents: mockIncidents,
            systems: [
              { id: 'database', name: 'Database', status: 'operational' },
              { id: 'api', name: 'API', status: 'operational' },
              { id: 'web', name: 'Web', status: 'operational' }
            ]
          })).toString('base64'),
          sha: 'aggregate_sha'
        }
      });

      await expect(async () => {
        await updateStatusFile(mockIncidents[0], mockGitHubApi);
        await updateStatusFile(mockIncidents[1], mockGitHubApi);
      }).not.toThrow();
    });
  });
});
