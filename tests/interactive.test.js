import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';
import { promptForJiraAssignment, validateAndAssignIssueKey, convertUnassignedToJiraEntries } from '../src/utils/interactive.js';
import inquirer from 'inquirer';

// Mock inquirer
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn()
  }
}));

// Mock JiraClient
const mockJiraClient = {
  validateIssueKey: vi.fn()
};

describe('Interactive Jira Assignment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('promptForJiraAssignment', () => {
    test('prompts user about unassigned entries and processes assignments', async () => {
      const groupedNonJiraEntries = [
        {
          description: 'Team meeting',
          entries: [
            { id: 1, description: 'Team meeting', durationSeconds: 1800, startedAt: '2024-01-01T10:00:00Z' }
          ],
          totalSeconds: 1800
        },
        {
          description: 'Code review',
          entries: [
            { id: 2, description: 'Code review', durationSeconds: 900, startedAt: '2024-01-01T14:00:00Z' }
          ],
          totalSeconds: 900
        }
      ];

      // Mock user responses
      inquirer.prompt
        .mockResolvedValueOnce({ assignUnassigned: true }) // Initial confirmation
        .mockResolvedValueOnce({ action: 'assign' }) // First group action
        .mockResolvedValueOnce({ inputIssueKey: 'PROJ-123' }) // First group issue key
        .mockResolvedValueOnce({ action: 'skip' }); // Second group action

      mockJiraClient.validateIssueKey.mockResolvedValueOnce(true);

      const result = await promptForJiraAssignment(groupedNonJiraEntries, mockJiraClient);

      expect(inquirer.prompt).toHaveBeenCalledTimes(4);
      expect(mockJiraClient.validateIssueKey).toHaveBeenCalledWith('PROJ-123');
      expect(result).toHaveLength(1);
      expect(result[0].issueKey).toBe('PROJ-123');
      expect(result[0].entries).toHaveLength(1);
    });

    test('returns empty array when user declines to assign entries', async () => {
      const groupedNonJiraEntries = [
        {
          description: 'Team meeting',
          entries: [{ id: 1, description: 'Team meeting', durationSeconds: 1800, startedAt: '2024-01-01T10:00:00Z' }],
          totalSeconds: 1800
        }
      ];

      inquirer.prompt.mockResolvedValueOnce({ assignUnassigned: false });

      const result = await promptForJiraAssignment(groupedNonJiraEntries, mockJiraClient);

      expect(inquirer.prompt).toHaveBeenCalledTimes(1);
      expect(mockJiraClient.validateIssueKey).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    test('handles empty groupedNonJiraEntries', async () => {
      const result = await promptForJiraAssignment([], mockJiraClient);
      expect(result).toEqual([]);
      expect(inquirer.prompt).not.toHaveBeenCalled();
    });
  });

  describe('validateAndAssignIssueKey', () => {
    test('successfully validates and assigns issue key', async () => {
      const group = {
        description: 'Team meeting',
        entries: [
          { id: 1, description: 'Team meeting', durationSeconds: 1800, startedAt: '2024-01-01T10:00:00Z' }
        ],
        totalSeconds: 1800
      };

      inquirer.prompt.mockResolvedValueOnce({ inputIssueKey: 'proj-123' });
      mockJiraClient.validateIssueKey.mockResolvedValueOnce(true);

      const result = await validateAndAssignIssueKey(group, mockJiraClient);

      expect(result.issueKey).toBe('PROJ-123'); // Should be uppercase
      expect(result.entries).toEqual(group.entries);
      expect(mockJiraClient.validateIssueKey).toHaveBeenCalledWith('PROJ-123');
    });

    test('retries on invalid issue key format', async () => {
      const group = {
        description: 'Team meeting',
        entries: [{ id: 1, description: 'Team meeting', durationSeconds: 1800, startedAt: '2024-01-01T10:00:00Z' }],
        totalSeconds: 1800
      };

      inquirer.prompt
        .mockResolvedValueOnce({ inputIssueKey: 'invalid-format' }) // Invalid format
        .mockResolvedValueOnce({ inputIssueKey: 'PROJ-123' }); // Valid format

      mockJiraClient.validateIssueKey.mockResolvedValueOnce(true);

      const result = await validateAndAssignIssueKey(group, mockJiraClient);

      expect(result.issueKey).toBe('PROJ-123');
      expect(inquirer.prompt).toHaveBeenCalledTimes(2);
      expect(mockJiraClient.validateIssueKey).toHaveBeenCalledTimes(1);
    });

    test('retries when Jira issue key not found', async () => {
      const group = {
        description: 'Team meeting',
        entries: [{ id: 1, description: 'Team meeting', durationSeconds: 1800, startedAt: '2024-01-01T10:00:00Z' }],
        totalSeconds: 1800
      };

      inquirer.prompt
        .mockResolvedValueOnce({ inputIssueKey: 'NOTFOUND-123' }) // Issue not found
        .mockResolvedValueOnce({ inputIssueKey: 'PROJ-123' }); // Valid issue

      mockJiraClient.validateIssueKey
        .mockResolvedValueOnce(false) // Not found
        .mockResolvedValueOnce(true); // Found

      const result = await validateAndAssignIssueKey(group, mockJiraClient);

      expect(result.issueKey).toBe('PROJ-123');
      expect(mockJiraClient.validateIssueKey).toHaveBeenCalledTimes(2);
    });

    test('handles validation error and allows retry', async () => {
      const group = {
        description: 'Team meeting',
        entries: [{ id: 1, description: 'Team meeting', durationSeconds: 1800, startedAt: '2024-01-01T10:00:00Z' }],
        totalSeconds: 1800
      };

      inquirer.prompt
        .mockResolvedValueOnce({ inputIssueKey: 'ERROR-123' }) // Will cause validation error
        .mockResolvedValueOnce({ retry: true }) // User chooses to retry
        .mockResolvedValueOnce({ inputIssueKey: 'PROJ-123' }); // Valid issue

      mockJiraClient.validateIssueKey
        .mockRejectedValueOnce(new Error('Network error')) // Validation error
        .mockResolvedValueOnce(true); // Success on retry

      const result = await validateAndAssignIssueKey(group, mockJiraClient);

      expect(result.issueKey).toBe('PROJ-123');
      expect(inquirer.prompt).toHaveBeenCalledTimes(3);
    });

    test('returns null when user cancels after validation error', async () => {
      const group = {
        description: 'Team meeting',
        entries: [{ id: 1, description: 'Team meeting', durationSeconds: 1800, startedAt: '2024-01-01T10:00:00Z' }],
        totalSeconds: 1800
      };

      inquirer.prompt
        .mockResolvedValueOnce({ inputIssueKey: 'ERROR-123' }) // Will cause validation error
        .mockResolvedValueOnce({ retry: false }); // User chooses not to retry

      mockJiraClient.validateIssueKey.mockRejectedValueOnce(new Error('Network error'));

      const result = await validateAndAssignIssueKey(group, mockJiraClient);

      expect(result).toBeNull();
      expect(inquirer.prompt).toHaveBeenCalledTimes(2);
    });
  });

  describe('convertUnassignedToJiraEntries', () => {
    test('converts assignments to Jira entries grouped by issue key and date', () => {
      const assignments = [
        {
          issueKey: 'PROJ-123',
          entries: [
            { id: 1, description: 'Work on feature', durationSeconds: 1800, startedAt: '2024-01-01T10:00:00Z' },
            { id: 2, description: 'Work on feature', durationSeconds: 900, startedAt: '2024-01-01T14:00:00Z' }
          ]
        },
        {
          issueKey: 'PROJ-456',
          entries: [
            { id: 3, description: 'Bug fix', durationSeconds: 3600, startedAt: '2024-01-02T09:00:00Z' }
          ]
        }
      ];

      const result = convertUnassignedToJiraEntries(assignments);

      expect(Object.keys(result)).toHaveLength(2);
      expect(result['PROJ-123_2024-01-01']).toBeDefined();
      expect(result['PROJ-123_2024-01-01'].issueKey).toBe('PROJ-123');
      expect(result['PROJ-123_2024-01-01'].date).toBe('2024-01-01');
      expect(result['PROJ-123_2024-01-01'].entries).toHaveLength(2);
      expect(result['PROJ-123_2024-01-01'].totalSeconds).toBe(2700);

      expect(result['PROJ-456_2024-01-02']).toBeDefined();
      expect(result['PROJ-456_2024-01-02'].issueKey).toBe('PROJ-456');
      expect(result['PROJ-456_2024-01-02'].date).toBe('2024-01-02');
      expect(result['PROJ-456_2024-01-02'].entries).toHaveLength(1);
      expect(result['PROJ-456_2024-01-02'].totalSeconds).toBe(3600);
    });

    test('handles entries spanning multiple dates for same issue', () => {
      const assignments = [
        {
          issueKey: 'PROJ-123',
          entries: [
            { id: 1, description: 'Work on feature', durationSeconds: 1800, startedAt: '2024-01-01T10:00:00Z' },
            { id: 2, description: 'Work on feature', durationSeconds: 3600, startedAt: '2024-01-02T09:00:00Z' }
          ]
        }
      ];

      const result = convertUnassignedToJiraEntries(assignments);

      expect(Object.keys(result)).toHaveLength(2);
      expect(result['PROJ-123_2024-01-01'].entries).toHaveLength(1);
      expect(result['PROJ-123_2024-01-01'].totalSeconds).toBe(1800);
      expect(result['PROJ-123_2024-01-02'].entries).toHaveLength(1);
      expect(result['PROJ-123_2024-01-02'].totalSeconds).toBe(3600);
    });

    test('sorts entries within each group by start time', () => {
      const assignments = [
        {
          issueKey: 'PROJ-123',
          entries: [
            { id: 2, description: 'Later work', durationSeconds: 900, startedAt: '2024-01-01T14:00:00Z' },
            { id: 1, description: 'Earlier work', durationSeconds: 1800, startedAt: '2024-01-01T10:00:00Z' }
          ]
        }
      ];

      const result = convertUnassignedToJiraEntries(assignments);
      const group = result['PROJ-123_2024-01-01'];

      expect(group.entries[0].id).toBe(1); // Earlier entry first
      expect(group.entries[1].id).toBe(2); // Later entry second
    });

    test('handles empty assignments', () => {
      const result = convertUnassignedToJiraEntries([]);
      expect(result).toEqual({});
    });
  });
});