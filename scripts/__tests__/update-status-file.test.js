import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fetchOpenIssues, parseIssueLabels, updateStatusData } from '../update-status-file.js';

const mockOctokitInstance = {
  issues: {
    listForRepo: jest.fn()
  }
};

const mockOctokit = jest.fn(() => mockOctokitInstance);

jest.unstable_mockModule('@octokit/rest', () => ({
  Octokit: mockOctokit
}));

// Mock fs module
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  existsSync: jest.fn()
}));

describe('update-status-file', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Set required environment variables
    process.env.GITHUB_TOKEN = 'test-token';
    process.env.GITHUB_REPOSITORY = 'owner/repo';
  });

  describe('fetchOpenIssues', () => {
    test('fetches open issues with correct filters', async () => {
      const mockIssues = [
        { number: 1, title: 'Test Issue 1' },
        { number: 2, title: 'Test Issue 2' }
      ];

      mockOctokitInstance.issues.listForRepo.mockResolvedValue({
        data: mockIssues
      });

      const result = await fetchOpenIssues();

      expect(result).toEqual(mockIssues);
      expect(mockOctokitInstance.issues.listForRepo).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        state: 'open',
        labels: 'status: investigating,status: identified,status: monitoring'
      });
    });

    test('handles API errors', async () => {
      mockOctokitInstance.issues.listForRepo.mockRejectedValue(
        new Error('API Error')
      );

      await expect(fetchOpenIssues()).rejects.toThrow('API Error');
    });
  });

  describe('parseIssueLabels', () => {
    test('parses status, severity, and system labels correctly', () => {
      const mockIssue = {
        number: 1,
        title: 'Test Issue',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T01:00:00Z',
        labels: [
          { name: 'status: investigating' },
          { name: 'severity: critical' },
          { name: 'system: api' },
          { name: 'system: web' }
        ]
      };

      const result = parseIssueLabels(mockIssue);

      expect(result).toEqual({
        id: '1',
        title: 'Test Issue',
        status: 'investigating',
        severity: 'critical',
        systems: ['api', 'web'],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T01:00:00Z',
        resolved_at: null
      });
    });

    test('uses default values for missing labels', () => {
      const mockIssue = {
        number: 1,
        title: 'Test Issue',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T01:00:00Z',
        labels: []
      };

      const result = parseIssueLabels(mockIssue);

      expect(result).toEqual({
        id: '1',
        title: 'Test Issue',
        status: 'investigating',
        severity: 'minor',
        systems: [],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T01:00:00Z',
        resolved_at: null
      });
    });
  });

  describe('updateStatusData', () => {
    test('creates new status data if none exists', () => {
      fs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      const mockIssues = [{
        number: 1,
        title: 'Test Issue',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T01:00:00Z',
        labels: [
          { name: 'status: investigating' },
          { name: 'severity: critical' },
          { name: 'system: api' }
        ]
      }];

      const result = updateStatusData(mockIssues);

      expect(result.systems).toEqual([{
        id: 'api',
        name: 'api',
        description: 'Status for api',
        category: 'default',
        labels: []
      }]);

      expect(result.incidents).toHaveLength(1);
      expect(result.incidents[0]).toMatchObject({
        id: '1',
        status: 'investigating',
        severity: 'critical',
        systems: ['api']
      });
    });

    test('updates existing status data', () => {
      const existingData = {
        systems: [{
          id: 'api',
          name: 'api',
          description: 'Status for api',
          category: 'default',
          labels: []
        }],
        incidents: [{
          id: '1',
          title: 'Old Issue',
          status: 'resolved',
          severity: 'minor',
          systems: ['api']
        }]
      };

      fs.readFileSync.mockReturnValue(JSON.stringify(existingData));

      const mockIssues = [{
        number: 1,
        title: 'Updated Issue',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T01:00:00Z',
        labels: [
          { name: 'status: investigating' },
          { name: 'severity: critical' },
          { name: 'system: api' }
        ]
      }];

      const result = updateStatusData(mockIssues);

      expect(result.systems).toEqual(existingData.systems);
      expect(result.incidents[0]).toMatchObject({
        id: '1',
        title: 'Updated Issue',
        status: 'investigating',
        severity: 'critical'
      });
    });

    test('adds new systems from issues', () => {
      fs.readFileSync.mockReturnValue(JSON.stringify({
        systems: [],
        incidents: []
      }));

      const mockIssues = [{
        number: 1,
        title: 'Test Issue',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T01:00:00Z',
        labels: [
          { name: 'status: investigating' },
          { name: 'system: new-system' }
        ]
      }];

      const result = updateStatusData(mockIssues);

      expect(result.systems).toHaveLength(1);
      expect(result.systems[0]).toEqual({
        id: 'new-system',
        name: 'new-system',
        description: 'Status for new-system',
        category: 'default',
        labels: []
      });
    });
  });
});
