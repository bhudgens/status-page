const fs = require('fs');
const path = require('path');
const { syncLabels } = require('../manage-labels');
const { Octokit } = require('@octokit/rest');

// Mock @octokit/rest
jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    issues: {
      createLabel: jest.fn(),
      updateLabel: jest.fn()
    }
  }))
}));

// Mock fs
jest.mock('fs', () => ({
  readFileSync: jest.fn()
}));

describe('manage-labels', () => {
  let mockLabelsData;
  let mockOctokit;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock labels data
    mockLabelsData = {
      status_labels: [
        {
          name: 'status: investigating',
          color: 'ff0000',
          description: 'Issue is being investigated'
        }
      ],
      severity_labels: [
        {
          name: 'severity: critical',
          color: 'ff0000',
          description: 'Critical severity'
        }
      ],
      system_labels: [
        {
          name: 'system: api',
          color: '0000ff',
          description: 'API system'
        }
      ]
    };

    // Mock fs.readFileSync to return our mock data
    fs.readFileSync.mockReturnValue(JSON.stringify(mockLabelsData));

    // Set up environment variables
    process.env.GITHUB_TOKEN = 'mock-token';
    process.env.GITHUB_REPOSITORY = 'owner/repo';

    // Get reference to mocked Octokit instance
    mockOctokit = new Octokit();
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_REPOSITORY;
  });

  test('creates new labels successfully', async () => {
    // Mock successful label creation
    mockOctokit.issues.createLabel.mockResolvedValue({ data: {} });

    await syncLabels();

    // Should attempt to create all labels
    expect(mockOctokit.issues.createLabel).toHaveBeenCalledTimes(3);
    expect(mockOctokit.issues.updateLabel).not.toHaveBeenCalled();

    // Verify correct parameters for first label
    expect(mockOctokit.issues.createLabel).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      name: 'status: investigating',
      color: 'ff0000',
      description: 'Issue is being investigated'
    });
  });

  test('updates existing labels when they already exist', async () => {
    // Mock label already exists error
    mockOctokit.issues.createLabel.mockRejectedValue({ status: 422 });
    mockOctokit.issues.updateLabel.mockResolvedValue({ data: {} });

    await syncLabels();

    // Should attempt to create and then update all labels
    expect(mockOctokit.issues.createLabel).toHaveBeenCalledTimes(3);
    expect(mockOctokit.issues.updateLabel).toHaveBeenCalledTimes(3);

    // Verify correct parameters for first label update
    expect(mockOctokit.issues.updateLabel).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      name: 'status: investigating',
      color: 'ff0000',
      description: 'Issue is being investigated'
    });
  });

  test('handles missing GITHUB_TOKEN', async () => {
    delete process.env.GITHUB_TOKEN;

    // Ensure script exits with error when run directly
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
    require('../manage-labels');

    expect(mockExit).toHaveBeenCalledWith(1);
    mockExit.mockRestore();
  });

  test('handles missing GITHUB_REPOSITORY', async () => {
    delete process.env.GITHUB_REPOSITORY;

    // Ensure script exits with error when run directly
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
    require('../manage-labels');

    expect(mockExit).toHaveBeenCalledWith(1);
    mockExit.mockRestore();
  });

  test('handles API errors gracefully', async () => {
    // Mock API error
    const apiError = new Error('API Error');
    mockOctokit.issues.createLabel.mockRejectedValue(apiError);

    // Mock console.error to prevent actual logging
    const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    await syncLabels();

    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringContaining('Error processing label'),
      expect.any(Error)
    );

    mockConsoleError.mockRestore();
  });

  test('reads labels from correct file path', async () => {
    await syncLabels();

    expect(fs.readFileSync).toHaveBeenCalledWith(
      expect.stringContaining('labels.json'),
      'utf8'
    );
  });

  test('processes all label types', async () => {
    mockOctokit.issues.createLabel.mockResolvedValue({ data: {} });

    await syncLabels();

    // Verify all label types are processed
    const createLabelCalls = mockOctokit.issues.createLabel.mock.calls;
    expect(createLabelCalls).toHaveLength(3);

    const labelNames = createLabelCalls.map(call => call[0].name);
    expect(labelNames).toContain('status: investigating');
    expect(labelNames).toContain('severity: critical');
    expect(labelNames).toContain('system: api');
  });
});
