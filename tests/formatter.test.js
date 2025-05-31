import { formatDuration, formatJiraWorkLog, prepareSummaryData } from '../src/utils/formatter.js';

describe('formatDuration', () => {
  test('formats hours and minutes', () => {
    expect(formatDuration(3600)).toBe('1h 0m');
    expect(formatDuration(5400)).toBe('1h 30m');
    expect(formatDuration(7260)).toBe('2h 1m');
  });

  test('formats minutes only when less than an hour', () => {
    expect(formatDuration(0)).toBe('0m');
    expect(formatDuration(60)).toBe('1m');
    expect(formatDuration(1800)).toBe('30m');
    expect(formatDuration(3599)).toBe('59m');
  });
});

describe('formatJiraWorkLog', () => {
  test('formats work log with single entry', () => {
    const entries = [
      {
        description: 'ABC-123: Implementing feature',
        durationSeconds: 3600,
        startedAt: '2024-01-01T10:00:00Z'
      }
    ];

    const workLog = formatJiraWorkLog('ABC-123', entries);
    expect(workLog).toEqual({
      issueKey: 'ABC-123',
      timeSpentSeconds: 3600,
      timeSpentFormatted: '1h 0m',
      startedAt: '2024-01-01T10:00:00Z',
      comment: 'ABC-123: Implementing feature',
      entryCount: 1
    });
  });

  test('formats work log with multiple entries', () => {
    const entries = [
      {
        description: 'ABC-123: Implementing feature',
        durationSeconds: 1800,
        startedAt: '2024-01-01T10:00:00Z'
      },
      {
        description: 'ABC-123: Testing feature',
        durationSeconds: 900,
        startedAt: '2024-01-01T14:00:00Z'
      }
    ];

    const workLog = formatJiraWorkLog('ABC-123', entries);
    expect(workLog).toEqual({
      issueKey: 'ABC-123',
      timeSpentSeconds: 2700,
      timeSpentFormatted: '45m',
      startedAt: '2024-01-01T10:00:00Z',
      comment: 'ABC-123: Implementing feature; ABC-123: Testing feature',
      entryCount: 2
    });
  });

  test('handles duplicate descriptions', () => {
    const entries = [
      {
        description: 'ABC-123: Working on task',
        durationSeconds: 1000,
        startedAt: '2024-01-01T10:00:00Z'
      },
      {
        description: 'ABC-123: Working on task',
        durationSeconds: 500,
        startedAt: '2024-01-01T11:00:00Z'
      }
    ];

    const workLog = formatJiraWorkLog('ABC-123', entries);
    expect(workLog.comment).toBe('ABC-123: Working on task');
  });
});

describe('prepareSummaryData', () => {
  test('prepares summary with both Jira and non-Jira entries', () => {
    const jiraEntries = {
      'ABC-123': {
        entries: [
          {
            description: 'ABC-123: Feature work',
            durationSeconds: 3600,
            startedAt: '2024-01-01T10:00:00Z'
          }
        ]
      },
      'DEF-456': {
        entries: [
          {
            description: 'DEF-456: Bug fix',
            durationSeconds: 1800,
            startedAt: '2024-01-01T14:00:00Z'
          }
        ]
      }
    };

    const nonJiraEntries = [
      {
        description: 'Team meeting',
        entries: [{ durationSeconds: 900 }],
        totalSeconds: 900
      },
      {
        description: 'Code review',
        entries: [{ durationSeconds: 600 }, { durationSeconds: 600 }],
        totalSeconds: 1200
      }
    ];

    const summary = prepareSummaryData(jiraEntries, nonJiraEntries);

    expect(summary.jiraWorkLogs).toHaveLength(2);
    expect(summary.nonJiraEntries).toHaveLength(2);
    expect(summary.totals.jiraTimeSeconds).toBe(5400);
    expect(summary.totals.nonJiraTimeSeconds).toBe(2100);
    expect(summary.totals.totalTimeSeconds).toBe(7500);
    expect(summary.totals.jiraTime).toBe('1h 30m');
    expect(summary.totals.nonJiraTime).toBe('35m');
    expect(summary.totals.totalTime).toBe('2h 5m');
  });

  test('handles empty data', () => {
    const summary = prepareSummaryData({}, []);

    expect(summary.jiraWorkLogs).toHaveLength(0);
    expect(summary.nonJiraEntries).toHaveLength(0);
    expect(summary.totals.jiraTimeSeconds).toBe(0);
    expect(summary.totals.nonJiraTimeSeconds).toBe(0);
    expect(summary.totals.totalTimeSeconds).toBe(0);
  });
});