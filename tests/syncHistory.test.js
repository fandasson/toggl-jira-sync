import { existsSync, unlinkSync } from 'fs';
import { SyncHistory } from '../src/utils/syncHistory.js';

const TEST_HISTORY_FILE = '.sync-history-test.json';

// Test-specific SyncHistory class that uses a test file
class TestSyncHistory extends SyncHistory {
  constructor() {
    super();
    this.historyFile = TEST_HISTORY_FILE;
    this.history = this.load();
  }
}

describe('SyncHistory', () => {
  let syncHistory;

  beforeEach(() => {
    // Clean up test file
    if (existsSync(TEST_HISTORY_FILE)) {
      unlinkSync(TEST_HISTORY_FILE);
    }
    syncHistory = new TestSyncHistory();
  });

  afterEach(() => {
    // Clean up test file
    if (existsSync(TEST_HISTORY_FILE)) {
      unlinkSync(TEST_HISTORY_FILE);
    }
  });

  describe('initial state', () => {
    test('starts with empty history', () => {
      expect(syncHistory.history.syncedEntries).toEqual({});
    });

    test('loads existing history file', () => {
      // First instance creates and saves data
      const firstInstance = new TestSyncHistory();
      firstInstance.markEntriesAsSynced(
        [{ id: 1, description: 'Test', durationSeconds: 3600, startedAt: '2024-01-01T10:00:00Z' }],
        'ABC-123',
        'worklog-123'
      );

      // Second instance should load the saved data
      const secondInstance = new TestSyncHistory();
      expect(secondInstance.isEntrySynced(1)).toBe(true);
    });
  });

  describe('markEntriesAsSynced', () => {
    test('marks single entry as synced', () => {
      const entries = [
        { id: 1, description: 'ABC-123: Test task', durationSeconds: 3600, startedAt: '2024-01-01T10:00:00Z' }
      ];

      syncHistory.markEntriesAsSynced(entries, 'ABC-123', 'worklog-123');

      expect(syncHistory.isEntrySynced(1)).toBe(true);
      const syncedEntry = syncHistory.getSyncedEntry(1);
      expect(syncedEntry.jiraIssueKey).toBe('ABC-123');
      expect(syncedEntry.jiraWorkLogId).toBe('worklog-123');
    });

    test('marks multiple entries as synced', () => {
      const entries = [
        { id: 1, description: 'ABC-123: Task 1', durationSeconds: 1800, startedAt: '2024-01-01T10:00:00Z' },
        { id: 2, description: 'ABC-123: Task 2', durationSeconds: 1800, startedAt: '2024-01-01T11:00:00Z' }
      ];

      syncHistory.markEntriesAsSynced(entries, 'ABC-123', 'worklog-123');

      expect(syncHistory.isEntrySynced(1)).toBe(true);
      expect(syncHistory.isEntrySynced(2)).toBe(true);
      expect(syncHistory.getSyncedEntry(1).jiraIssueKey).toBe('ABC-123');
      expect(syncHistory.getSyncedEntry(2).jiraIssueKey).toBe('ABC-123');
    });

    test('persists data to file', () => {
      const entries = [
        { id: 1, description: 'Test', durationSeconds: 3600, startedAt: '2024-01-01T10:00:00Z' }
      ];

      syncHistory.markEntriesAsSynced(entries, 'ABC-123', 'worklog-123');

      expect(existsSync(TEST_HISTORY_FILE)).toBe(true);
    });
  });

  describe('filterUnsyncedEntries', () => {
    test('separates synced and unsynced entries', () => {
      // Mark entry 1 as synced
      syncHistory.markEntriesAsSynced(
        [{ id: 1, description: 'Synced task', durationSeconds: 3600, startedAt: '2024-01-01T10:00:00Z' }],
        'ABC-123',
        'worklog-123'
      );

      const entries = [
        { id: 1, description: 'Synced task', durationSeconds: 3600, startedAt: '2024-01-01T10:00:00Z' },
        { id: 2, description: 'New task', durationSeconds: 1800, startedAt: '2024-01-01T11:00:00Z' }
      ];

      const { synced, unsynced } = syncHistory.filterUnsyncedEntries(entries);

      expect(synced).toHaveLength(1);
      expect(unsynced).toHaveLength(1);
      expect(synced[0].id).toBe(1);
      expect(unsynced[0].id).toBe(2);
      expect(synced[0].syncInfo).toBeDefined();
    });

    test('returns all entries as unsynced when none are synced', () => {
      const entries = [
        { id: 1, description: 'Task 1', durationSeconds: 3600, startedAt: '2024-01-01T10:00:00Z' },
        { id: 2, description: 'Task 2', durationSeconds: 1800, startedAt: '2024-01-01T11:00:00Z' }
      ];

      const { synced, unsynced } = syncHistory.filterUnsyncedEntries(entries);

      expect(synced).toHaveLength(0);
      expect(unsynced).toHaveLength(2);
    });
  });

  describe('groupSyncedEntriesByIssue', () => {
    test('groups synced entries by Jira issue', () => {
      // Set up synced entries with different issues
      syncHistory.markEntriesAsSynced(
        [{ id: 1, description: 'ABC-123: Task 1', durationSeconds: 3600, startedAt: '2024-01-01T10:00:00Z' }],
        'ABC-123',
        'worklog-1'
      );
      syncHistory.markEntriesAsSynced(
        [{ id: 2, description: 'DEF-456: Task 2', durationSeconds: 1800, startedAt: '2024-01-01T11:00:00Z' }],
        'DEF-456',
        'worklog-2'
      );

      const syncedEntries = [
        { id: 1, durationSeconds: 3600, syncInfo: { jiraIssueKey: 'ABC-123' } },
        { id: 2, durationSeconds: 1800, syncInfo: { jiraIssueKey: 'DEF-456' } }
      ];

      const grouped = syncHistory.groupSyncedEntriesByIssue(syncedEntries);

      expect(Object.keys(grouped)).toHaveLength(2);
      expect(grouped['ABC-123'].totalSeconds).toBe(3600);
      expect(grouped['DEF-456'].totalSeconds).toBe(1800);
    });
  });

  describe('getStats', () => {
    test('returns correct statistics', () => {
      syncHistory.markEntriesAsSynced(
        [
          { id: 1, description: 'ABC-123: Task 1', durationSeconds: 3600, startedAt: '2024-01-01T10:00:00Z' },
          { id: 2, description: 'ABC-123: Task 2', durationSeconds: 1800, startedAt: '2024-01-01T11:00:00Z' }
        ],
        'ABC-123',
        'worklog-1'
      );
      syncHistory.markEntriesAsSynced(
        [{ id: 3, description: 'DEF-456: Task 3', durationSeconds: 900, startedAt: '2024-01-01T12:00:00Z' }],
        'DEF-456',
        'worklog-2'
      );

      const stats = syncHistory.getStats();

      expect(stats.totalEntries).toBe(3);
      expect(stats.totalSeconds).toBe(6300);
      expect(stats.uniqueIssues).toBe(2);
      expect(stats.issues).toContain('ABC-123');
      expect(stats.issues).toContain('DEF-456');
    });

    test('returns empty stats for no history', () => {
      const stats = syncHistory.getStats();

      expect(stats.totalEntries).toBe(0);
      expect(stats.totalSeconds).toBe(0);
      expect(stats.uniqueIssues).toBe(0);
      expect(stats.issues).toEqual([]);
    });
  });

  describe('clear', () => {
    test('clears all sync history', () => {
      // Add some history
      syncHistory.markEntriesAsSynced(
        [{ id: 1, description: 'Test', durationSeconds: 3600, startedAt: '2024-01-01T10:00:00Z' }],
        'ABC-123',
        'worklog-123'
      );

      expect(syncHistory.isEntrySynced(1)).toBe(true);

      // Clear history
      syncHistory.clear();

      expect(syncHistory.isEntrySynced(1)).toBe(false);
      expect(syncHistory.getStats().totalEntries).toBe(0);
    });
  });
});