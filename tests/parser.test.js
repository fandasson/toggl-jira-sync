import { extractJiraIssueKey, parseTimeEntry, groupEntriesByDescription, groupEntriesByIssueKey, groupEntriesByIssueKeyAndDate } from '../src/utils/parser.js';

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

describe('groupEntriesByIssueKeyAndDate', () => {
  test('groups entries by issue key and date', () => {
    const entries = [
      {
        issueKey: 'ABC-123',
        durationSeconds: 1800,
        startedAt: '2024-01-01T10:00:00Z',
        description: 'Morning work'
      },
      {
        issueKey: 'ABC-123',
        durationSeconds: 900,
        startedAt: '2024-01-01T14:00:00Z',
        description: 'Afternoon work'
      },
      {
        issueKey: 'ABC-123',
        durationSeconds: 3600,
        startedAt: '2024-01-02T09:00:00Z',
        description: 'Next day work'
      },
      {
        issueKey: 'DEF-456',
        durationSeconds: 1800,
        startedAt: '2024-01-01T11:00:00Z',
        description: 'Different issue'
      }
    ];

    const grouped = groupEntriesByIssueKeyAndDate(entries);
    
    expect(Object.keys(grouped)).toHaveLength(3);
    
    // Check ABC-123 on 2024-01-01
    expect(grouped['ABC-123_2024-01-01']).toBeDefined();
    expect(grouped['ABC-123_2024-01-01'].issueKey).toBe('ABC-123');
    expect(grouped['ABC-123_2024-01-01'].date).toBe('2024-01-01');
    expect(grouped['ABC-123_2024-01-01'].totalSeconds).toBe(2700);
    expect(grouped['ABC-123_2024-01-01'].entries).toHaveLength(2);
    
    // Check ABC-123 on 2024-01-02
    expect(grouped['ABC-123_2024-01-02']).toBeDefined();
    expect(grouped['ABC-123_2024-01-02'].issueKey).toBe('ABC-123');
    expect(grouped['ABC-123_2024-01-02'].date).toBe('2024-01-02');
    expect(grouped['ABC-123_2024-01-02'].totalSeconds).toBe(3600);
    expect(grouped['ABC-123_2024-01-02'].entries).toHaveLength(1);
    
    // Check DEF-456 on 2024-01-01
    expect(grouped['DEF-456_2024-01-01']).toBeDefined();
    expect(grouped['DEF-456_2024-01-01'].issueKey).toBe('DEF-456');
    expect(grouped['DEF-456_2024-01-01'].date).toBe('2024-01-01');
    expect(grouped['DEF-456_2024-01-01'].totalSeconds).toBe(1800);
  });

  test('sorts entries within each group by start time', () => {
    const entries = [
      {
        issueKey: 'ABC-123',
        durationSeconds: 900,
        startedAt: '2024-01-01T14:00:00Z',
        description: 'Later entry'
      },
      {
        issueKey: 'ABC-123',
        durationSeconds: 1800,
        startedAt: '2024-01-01T10:00:00Z',
        description: 'Earlier entry'
      },
      {
        issueKey: 'ABC-123',
        durationSeconds: 600,
        startedAt: '2024-01-01T12:00:00Z',
        description: 'Middle entry'
      }
    ];

    const grouped = groupEntriesByIssueKeyAndDate(entries);
    const group = grouped['ABC-123_2024-01-01'];
    
    expect(group.entries[0].description).toBe('Earlier entry');
    expect(group.entries[1].description).toBe('Middle entry');
    expect(group.entries[2].description).toBe('Later entry');
  });

  test('ignores entries without issue key', () => {
    const entries = [
      {
        issueKey: null,
        durationSeconds: 1000,
        startedAt: '2024-01-01T10:00:00Z'
      },
      {
        issueKey: undefined,
        durationSeconds: 500,
        startedAt: '2024-01-01T11:00:00Z'
      },
      {
        issueKey: 'ABC-123',
        durationSeconds: 1800,
        startedAt: '2024-01-01T12:00:00Z'
      }
    ];

    const grouped = groupEntriesByIssueKeyAndDate(entries);
    expect(Object.keys(grouped)).toHaveLength(1);
    expect(grouped['ABC-123_2024-01-01']).toBeDefined();
  });

  test('handles entries with same issue key across multiple dates', () => {
    const entries = [
      {
        issueKey: 'ABC-123',
        durationSeconds: 1800,
        startedAt: '2024-01-01T10:00:00Z'
      },
      {
        issueKey: 'ABC-123',
        durationSeconds: 3600,
        startedAt: '2024-01-02T10:00:00Z'
      },
      {
        issueKey: 'ABC-123',
        durationSeconds: 2700,
        startedAt: '2024-01-03T10:00:00Z'
      }
    ];

    const grouped = groupEntriesByIssueKeyAndDate(entries);
    
    expect(Object.keys(grouped)).toHaveLength(3);
    expect(grouped['ABC-123_2024-01-01'].totalSeconds).toBe(1800);
    expect(grouped['ABC-123_2024-01-02'].totalSeconds).toBe(3600);
    expect(grouped['ABC-123_2024-01-03'].totalSeconds).toBe(2700);
  });
});