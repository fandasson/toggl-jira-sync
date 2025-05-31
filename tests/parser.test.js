import { extractJiraIssueKey, parseTimeEntry, groupEntriesByDescription, groupEntriesByIssueKey } from '../src/utils/parser.js';

describe('extractJiraIssueKey', () => {
  test('extracts valid Jira issue keys', () => {
    expect(extractJiraIssueKey('ABC-123: Working on feature')).toBe('ABC-123');
    expect(extractJiraIssueKey('Working on PROJ-4567')).toBe('PROJ-4567');
    expect(extractJiraIssueKey('TEST-1 - implementing tests')).toBe('TEST-1');
    expect(extractJiraIssueKey('[XYZ-999] Bug fix')).toBe('XYZ-999');
  });

  test('returns null for invalid or missing keys', () => {
    expect(extractJiraIssueKey('Working on feature')).toBeNull();
    expect(extractJiraIssueKey('abc-123 lowercase')).toBeNull();
    expect(extractJiraIssueKey('A-123 single letter')).toBeNull();
    expect(extractJiraIssueKey('ABC123 no dash')).toBeNull();
    expect(extractJiraIssueKey('')).toBeNull();
    expect(extractJiraIssueKey(null)).toBeNull();
  });

  test('extracts first key when multiple present', () => {
    expect(extractJiraIssueKey('ABC-123 and DEF-456')).toBe('ABC-123');
  });
});

describe('parseTimeEntry', () => {
  test('parses entry with Jira issue', () => {
    const entry = {
      id: 1,
      description: 'ABC-123: Working on feature',
      duration: 3600,
      start: '2024-01-01T10:00:00Z'
    };

    const parsed = parseTimeEntry(entry);
    expect(parsed).toEqual({
      id: 1,
      description: 'ABC-123: Working on feature',
      durationSeconds: 3600,
      startedAt: '2024-01-01T10:00:00Z',
      issueKey: 'ABC-123',
      hasJiraIssue: true
    });
  });

  test('parses entry without Jira issue', () => {
    const entry = {
      id: 2,
      description: 'Team meeting',
      duration: 1800,
      start: '2024-01-01T14:00:00Z'
    };

    const parsed = parseTimeEntry(entry);
    expect(parsed).toEqual({
      id: 2,
      description: 'Team meeting',
      durationSeconds: 1800,
      startedAt: '2024-01-01T14:00:00Z',
      issueKey: null,
      hasJiraIssue: false
    });
  });

  test('handles negative duration', () => {
    const entry = {
      id: 3,
      description: 'Running timer',
      duration: -1,
      start: '2024-01-01T15:00:00Z'
    };

    const parsed = parseTimeEntry(entry);
    expect(parsed.durationSeconds).toBe(0);
  });
});

describe('groupEntriesByDescription', () => {
  test('groups entries with same description', () => {
    const entries = [
      { description: 'Meeting', durationSeconds: 1800 },
      { description: 'Meeting', durationSeconds: 900 },
      { description: 'Coding', durationSeconds: 3600 }
    ];

    const grouped = groupEntriesByDescription(entries);
    expect(grouped).toHaveLength(2);
    
    const meeting = grouped.find(g => g.description === 'Meeting');
    expect(meeting.totalSeconds).toBe(2700);
    expect(meeting.entries).toHaveLength(2);
    
    const coding = grouped.find(g => g.description === 'Coding');
    expect(coding.totalSeconds).toBe(3600);
    expect(coding.entries).toHaveLength(1);
  });

  test('handles entries without description', () => {
    const entries = [
      { description: '', durationSeconds: 1000 },
      { description: null, durationSeconds: 500 }
    ];

    const grouped = groupEntriesByDescription(entries);
    expect(grouped).toHaveLength(1);
    expect(grouped[0].description).toBe('(No description)');
    expect(grouped[0].totalSeconds).toBe(1500);
  });
});

describe('groupEntriesByIssueKey', () => {
  test('groups entries by issue key', () => {
    const entries = [
      { issueKey: 'ABC-123', durationSeconds: 1800 },
      { issueKey: 'ABC-123', durationSeconds: 900 },
      { issueKey: 'DEF-456', durationSeconds: 3600 },
      { issueKey: null, durationSeconds: 1000 }
    ];

    const grouped = groupEntriesByIssueKey(entries);
    
    expect(Object.keys(grouped)).toHaveLength(2);
    expect(grouped['ABC-123'].totalSeconds).toBe(2700);
    expect(grouped['ABC-123'].entries).toHaveLength(2);
    expect(grouped['DEF-456'].totalSeconds).toBe(3600);
    expect(grouped['DEF-456'].entries).toHaveLength(1);
  });

  test('ignores entries without issue key', () => {
    const entries = [
      { issueKey: null, durationSeconds: 1000 },
      { issueKey: undefined, durationSeconds: 500 }
    ];

    const grouped = groupEntriesByIssueKey(entries);
    expect(Object.keys(grouped)).toHaveLength(0);
  });
});