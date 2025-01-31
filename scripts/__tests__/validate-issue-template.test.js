const fs = require('fs');
const { validateIssueBody, validateIssueTemplate } = require('../validate-issue-template');
const { Octokit } = require('@octokit/rest');

// Mock @octokit/rest
jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    issues: {
      get: jest.fn(),
      createComment: jest.fn(),
      update: jest.fn()
    }
  }))
}));

// Mock fs
jest.mock('fs', () => ({
  readFileSync: jest.fn()
}));

describe('validate-issue-template', () => {
  let mockOctokit;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GITHUB_TOKEN = 'mock-token';
    process.env.GITHUB_REPOSITORY = 'owner/repo';
    mockOctokit = new Octokit();
  });

  afterEach(() => {
    delete process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_REPOSITORY;
  });

  describe('validateIssueBody', () => {
    test('accepts valid issue body with all required sections', () => {
      const validBody = `
### Affected Systems
- [ ] system: api
- [ ] system: database

### Incident Description
Test incident description

### Impact
High impact

### Initial Assessment
Initial investigation

### Action Items
- Action 1
- Action 2
      `.trim();

      const errors = validateIssueBody(validBody);
      expect(errors).toHaveLength(0);
    });

    test('detects missing required sections', () => {
      const invalidBody = `
### Affected Systems
- [ ] system: api

### Incident Description
Test description
      `.trim();

      const errors = validateIssueBody(invalidBody);
      expect(errors).toContain('Missing required section: Impact');
      expect(errors).toContain('Missing required section: Initial Assessment');
      expect(errors).toContain('Missing required section: Action Items');
    });

    test('detects missing affected systems', () => {
      const invalidBody = `
### Affected Systems

### Incident Description
Test description

### Impact
High impact

### Initial Assessment
Initial investigation

### Action Items
- Action 1
      `.trim();

      const errors = validateIssueBody(invalidBody);
      expect(errors).toContain('No affected systems specified');
    });

    test('detects empty incident description', () => {
      const invalidBody = `
### Affected Systems
- [ ] system: api

### Incident Description

### Impact
High impact

### Initial Assessment
Initial investigation

### Action Items
- Action 1
      `.trim();

      const errors = validateIssueBody(invalidBody);
      expect(errors).toContain('Incident description is empty');
    });
  });

  describe('validateIssueTemplate', () => {
    test('approves valid issue', async () => {
      const validBody = `
### Affected Systems
- [ ] system: api

### Incident Description
Test description

### Impact
High impact

### Initial Assessment
Initial investigation

### Action Items
- Action 1
      `.trim();

      mockOctokit.issues.get.mockResolvedValue({
        data: { body: validBody }
      });

      const result = await validateIssueTemplate(123);
      expect(result).toBe(true);
      expect(mockOctokit.issues.createComment).not.toHaveBeenCalled();
      expect(mockOctokit.issues.update).not.toHaveBeenCalled();
    });

    test('closes invalid issue with comment', async () => {
      const invalidBody = '### Invalid Template';

      mockOctokit.issues.get.mockResolvedValue({
        data: { body: invalidBody }
      });

      const result = await validateIssueTemplate(123);

      expect(result).toBe(false);
      expect(mockOctokit.issues.createComment).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        issue_number: 123,
        body: expect.stringContaining('Issue template validation failed')
      });
      expect(mockOctokit.issues.update).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        issue_number: 123,
        state: 'closed'
      });
    });

    test('handles API errors gracefully', async () => {
      const error = new Error('API Error');
      mockOctokit.issues.get.mockRejectedValue(error);

      await expect(validateIssueTemplate(123)).rejects.toThrow('API Error');
    });
  });

  describe('main function error handling', () => {
    let mockExit;
    let mockConsoleError;

    beforeEach(() => {
      mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
      mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      mockExit.mockRestore();
      mockConsoleError.mockRestore();
    });

    test('handles missing GITHUB_EVENT_PATH', () => {
      delete process.env.GITHUB_EVENT_PATH;
      require('../validate-issue-template');

      expect(mockConsoleError).toHaveBeenCalledWith('No GitHub event path provided');
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    test('handles invalid event data', () => {
      process.env.GITHUB_EVENT_PATH = '/path/to/event.json';
      fs.readFileSync.mockReturnValue('{}');

      require('../validate-issue-template');

      expect(mockConsoleError).toHaveBeenCalledWith('No issue or pull request number found in event data');
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    test('handles valid event data', () => {
      process.env.GITHUB_EVENT_PATH = '/path/to/event.json';
      fs.readFileSync.mockReturnValue(JSON.stringify({
        issue: { number: 123 }
      }));

      mockOctokit.issues.get.mockResolvedValue({
        data: {
          body: `
### Affected Systems
- [ ] system: api

### Incident Description
Test description

### Impact
High impact

### Initial Assessment
Initial investigation

### Action Items
- Action 1
          `.trim()
        }
      });

      require('../validate-issue-template');
      expect(mockExit).not.toHaveBeenCalled();
    });
  });
});
