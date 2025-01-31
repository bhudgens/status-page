const { parseIssue } = require('../issue-parser');

describe('parseIssue', () => {
  test('parses issue with all labels correctly', () => {
    const mockIssue = {
      number: 123,
      title: 'Test Issue',
      labels: [
        { name: 'status: investigating' },
        { name: 'severity: critical' },
        { name: 'system:api' },
        { name: 'system:database' }
      ],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T01:00:00Z',
      closed_at: null
    };

    const result = parseIssue(mockIssue);

    expect(result).toEqual({
      id: '123',
      title: 'Test Issue',
      status: 'investigating',
      severity: 'critical',
      systems: ['api', 'database'],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T01:00:00Z',
      resolved_at: null
    });
  });

  test('uses default values when labels are missing', () => {
    const mockIssue = {
      number: 456,
      title: 'Issue Without Labels',
      labels: [],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T01:00:00Z',
      closed_at: null
    };

    const result = parseIssue(mockIssue);

    expect(result).toEqual({
      id: '456',
      title: 'Issue Without Labels',
      status: 'investigating',
      severity: 'minor',
      systems: [],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T01:00:00Z',
      resolved_at: null
    });
  });

  test('handles resolved issues correctly', () => {
    const mockIssue = {
      number: 789,
      title: 'Resolved Issue',
      labels: [
        { name: 'status: resolved' },
        { name: 'severity: major' },
        { name: 'system:frontend' }
      ],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T02:00:00Z',
      closed_at: '2024-01-01T02:00:00Z'
    };

    const result = parseIssue(mockIssue);

    expect(result).toEqual({
      id: '789',
      title: 'Resolved Issue',
      status: 'resolved',
      severity: 'major',
      systems: ['frontend'],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T02:00:00Z',
      resolved_at: '2024-01-01T02:00:00Z'
    });
  });

  test('extracts multiple system labels correctly', () => {
    const mockIssue = {
      number: 101,
      title: 'Multi-System Issue',
      labels: [
        { name: 'status: monitoring' },
        { name: 'severity: minor' },
        { name: 'system:api' },
        { name: 'system:database' },
        { name: 'system:frontend' }
      ],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T01:00:00Z',
      closed_at: null
    };

    const result = parseIssue(mockIssue);

    expect(result).toEqual({
      id: '101',
      title: 'Multi-System Issue',
      status: 'monitoring',
      severity: 'minor',
      systems: ['api', 'database', 'frontend'],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T01:00:00Z',
      resolved_at: null
    });
  });
});
