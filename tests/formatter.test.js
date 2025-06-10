import { formatDuration, formatJiraWorkLog, formatJiraWorkLogWithBreakdown, prepareSummaryData } from '../src/utils/formatter.js';

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

describe('formatJiraWorkLogWithBreakdown', () => {
  test('formats work log with time breakdown for single entry', () => {
    const entries = [
      {
        description: 'ABC-123: Implementing feature',
        durationSeconds: 3600,
        startedAt: '2024-01-01T10:00:00Z'
      }
    ];

    const workLog = formatJiraWorkLogWithBreakdown('ABC-123', entries, '2024-01-01');
    
    expect(workLog).toMatchObject({
      issueKey: 'ABC-123',
      date: '2024-01-01',
      timeSpentSeconds: 3600,
      timeSpentFormatted: '1h 0m',
      startedAt: '2024-01-01T10:00:00Z',
      entryCount: 1
    });
    
    expect(workLog.timeBreakdown).toHaveLength(1);
    expect(workLog.timeBreakdown[0]).toEqual({
      timeRange: '10:00-11:00',
      duration: '1h 0m',
      description: 'ABC-123: Implementing feature'
    });
    
    expect(workLog.comment).toContain('Time breakdown for 1 entry:');
    expect(workLog.comment).toContain('10:00-11:00 (1h 0m): ABC-123: Implementing feature');
    expect(workLog.comment).toContain('Total: 1h 0m');
  });

  test('formats work log with time breakdown for multiple entries', () => {
    const entries = [
      {
        description: 'ABC-123: Morning work',
        durationSeconds: 1800,
        startedAt: '2024-01-01T09:00:00Z'
      },
      {
        description: 'ABC-123: Afternoon work',
        durationSeconds: 2700,
        startedAt: '2024-01-01T14:30:00Z'
      },
      {
        description: 'ABC-123: Evening fixes',
        durationSeconds: 900,
        startedAt: '2024-01-01T18:00:00Z'
      }
    ];

    const workLog = formatJiraWorkLogWithBreakdown('ABC-123', entries, '2024-01-01');
    
    expect(workLog).toMatchObject({
      issueKey: 'ABC-123',
      date: '2024-01-01',
      timeSpentSeconds: 5400,
      timeSpentFormatted: '1h 30m',
      entryCount: 3
    });
    
    expect(workLog.timeBreakdown).toHaveLength(3);
    expect(workLog.timeBreakdown[0]).toEqual({
      timeRange: '09:00-09:30',
      duration: '30m',
      description: 'ABC-123: Morning work'
    });
    expect(workLog.timeBreakdown[1]).toEqual({
      timeRange: '14:30-15:15',
      duration: '45m',
      description: 'ABC-123: Afternoon work'
    });
    expect(workLog.timeBreakdown[2]).toEqual({
      timeRange: '18:00-18:15',
      duration: '15m',
      description: 'ABC-123: Evening fixes'
    });
    
    expect(workLog.comment).toContain('Time breakdown for 3 entries:');
    expect(workLog.comment).toContain('Total: 1h 30m');
  });

  test('handles entries without description', () => {
    const entries = [
      {
        description: '',
        durationSeconds: 1800,
        startedAt: '2024-01-01T10:00:00Z'
      }
    ];

    const workLog = formatJiraWorkLogWithBreakdown('ABC-123', entries, '2024-01-01');
    
    expect(workLog.timeBreakdown[0].description).toBe('(No description)');
    expect(workLog.comment).toContain('(No description)');
  });

  test('correctly calculates end times across hour boundaries', () => {
    const entries = [
      {
        description: 'ABC-123: Cross-hour work',
        durationSeconds: 5400, // 1.5 hours
        startedAt: '2024-01-01T10:45:00Z'
      }
    ];

    const workLog = formatJiraWorkLogWithBreakdown('ABC-123', entries, '2024-01-01');
    
    expect(workLog.timeBreakdown[0]).toEqual({
      timeRange: '10:45-12:15',
      duration: '1h 30m',
      description: 'ABC-123: Cross-hour work'
    });
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
        ],
        totalSeconds: 3600
      },
      'DEF-456': {
        entries: [
          {
            description: 'DEF-456: Bug fix',
            durationSeconds: 1800,
            startedAt: '2024-01-01T14:00:00Z'
          }
        ],
        totalSeconds: 1800
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

  test('prepares summary with daily aggregated entries', () => {
    const jiraEntries = {
      'ABC-123_2024-01-01': {
        issueKey: 'ABC-123',
        date: '2024-01-01',
        entries: [
          {
            description: 'ABC-123: Morning work',
            durationSeconds: 1800,
            startedAt: '2024-01-01T09:00:00Z'
          },
          {
            description: 'ABC-123: Afternoon work',
            durationSeconds: 2700,
            startedAt: '2024-01-01T14:00:00Z'
          }
        ],
        totalSeconds: 4500
      },
      'ABC-123_2024-01-02': {
        issueKey: 'ABC-123',
        date: '2024-01-02',
        entries: [
          {
            description: 'ABC-123: Next day work',
            durationSeconds: 3600,
            startedAt: '2024-01-02T10:00:00Z'
          }
        ],
        totalSeconds: 3600
      }
    };

    const nonJiraEntries = [];

    const summary = prepareSummaryData(jiraEntries, nonJiraEntries);

    expect(summary.jiraWorkLogs).toHaveLength(2);
    
    // Check first day work log
    const firstDayLog = summary.jiraWorkLogs.find(log => log.date === '2024-01-01');
    expect(firstDayLog).toBeDefined();
    expect(firstDayLog.issueKey).toBe('ABC-123');
    expect(firstDayLog.timeSpentSeconds).toBe(4500);
    expect(firstDayLog.timeBreakdown).toHaveLength(2);
    
    // Check second day work log
    const secondDayLog = summary.jiraWorkLogs.find(log => log.date === '2024-01-02');
    expect(secondDayLog).toBeDefined();
    expect(secondDayLog.issueKey).toBe('ABC-123');
    expect(secondDayLog.timeSpentSeconds).toBe(3600);
    expect(secondDayLog.timeBreakdown).toHaveLength(1);
    
    // Check totals
    expect(summary.totals.jiraTimeSeconds).toBe(8100);
    expect(summary.totals.jiraTime).toBe('2h 15m');
  });

  test('handles mixed format entries (with and without date)', () => {
    const jiraEntries = {
      'ABC-123': {
        issueKey: 'ABC-123',
        entries: [
          {
            description: 'ABC-123: Old format entry',
            durationSeconds: 1800,
            startedAt: '2024-01-01T10:00:00Z'
          }
        ],
        totalSeconds: 1800
      },
      'DEF-456_2024-01-01': {
        issueKey: 'DEF-456',
        date: '2024-01-01',
        entries: [
          {
            description: 'DEF-456: New format entry',
            durationSeconds: 3600,
            startedAt: '2024-01-01T14:00:00Z'
          }
        ],
        totalSeconds: 3600
      }
    };

    const nonJiraEntries = [];

    const summary = prepareSummaryData(jiraEntries, nonJiraEntries);

    expect(summary.jiraWorkLogs).toHaveLength(2);
    
    // Old format should not have timeBreakdown
    const oldFormatLog = summary.jiraWorkLogs.find(log => log.issueKey === 'ABC-123' && !log.date);
    expect(oldFormatLog).toBeDefined();
    expect(oldFormatLog.timeBreakdown).toBeUndefined();
    
    // New format should have timeBreakdown
    const newFormatLog = summary.jiraWorkLogs.find(log => log.issueKey === 'DEF-456' && log.date);
    expect(newFormatLog).toBeDefined();
    expect(newFormatLog.timeBreakdown).toBeDefined();
    expect(newFormatLog.timeBreakdown).toHaveLength(1);
  });

  test('handles already synced entries', () => {
    const jiraEntries = {};
    const nonJiraEntries = [];
    const alreadySyncedEntries = {
      'ABC-123': {
        entries: [
          {
            description: 'ABC-123: Already synced work',
            durationSeconds: 3600
          }
        ],
        totalSeconds: 3600
      }
    };

    const summary = prepareSummaryData(jiraEntries, nonJiraEntries, alreadySyncedEntries);

    expect(summary.alreadySynced).toHaveLength(1);
    expect(summary.alreadySynced[0]).toMatchObject({
      issueKey: 'ABC-123',
      timeFormatted: '1h 0m',
      description: 'ABC-123: Already synced work',
      entryCount: 1
    });
    
    expect(summary.totals.alreadySyncedTimeSeconds).toBe(3600);
    expect(summary.totals.alreadySyncedTime).toBe('1h 0m');
    expect(summary.totals.totalTimeSeconds).toBe(3600);
  });
});