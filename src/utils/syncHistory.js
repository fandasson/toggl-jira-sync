import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const HISTORY_FILE = join(__dirname, '../../.sync-history.json');

export class SyncHistory {
  constructor() {
    this.historyFile = HISTORY_FILE;
    this.history = this.load();
  }

  load() {
    if (!existsSync(this.historyFile)) {
      return { syncedEntries: {} };
    }

    try {
      const content = readFileSync(this.historyFile, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.warn('Failed to load sync history, starting fresh:', error.message);
      return { syncedEntries: {} };
    }
  }

  save() {
    try {
      writeFileSync(this.historyFile, JSON.stringify(this.history, null, 2));
    } catch (error) {
      console.error('Failed to save sync history:', error.message);
    }
  }

  isEntrySynced(togglEntryId) {
    return !!this.history.syncedEntries[togglEntryId];
  }

  getSyncedEntry(togglEntryId) {
    return this.history.syncedEntries[togglEntryId];
  }

  markEntriesAsSynced(entries, jiraIssueKey, workLogId) {
    const syncedAt = new Date().toISOString();
    
    entries.forEach(entry => {
      this.history.syncedEntries[entry.id] = {
        togglId: entry.id,
        description: entry.description,
        durationSeconds: entry.durationSeconds,
        startedAt: entry.startedAt,
        jiraIssueKey,
        jiraWorkLogId: workLogId,
        syncedAt
      };
    });

    this.save();
  }

  filterUnsyncedEntries(entries) {
    const synced = [];
    const unsynced = [];

    entries.forEach(entry => {
      if (this.isEntrySynced(entry.id)) {
        synced.push({
          ...entry,
          syncInfo: this.getSyncedEntry(entry.id)
        });
      } else {
        unsynced.push(entry);
      }
    });

    return { synced, unsynced };
  }

  groupSyncedEntriesByIssue(syncedEntries) {
    const grouped = {};

    syncedEntries.forEach(entry => {
      const issueKey = entry.syncInfo.jiraIssueKey;
      
      if (!grouped[issueKey]) {
        grouped[issueKey] = {
          issueKey,
          entries: [],
          totalSeconds: 0
        };
      }

      grouped[issueKey].entries.push(entry);
      grouped[issueKey].totalSeconds += entry.durationSeconds;
    });

    return grouped;
  }

  clear() {
    this.history = { syncedEntries: {} };
    this.save();
  }

  getStats() {
    const entries = Object.values(this.history.syncedEntries);
    const totalEntries = entries.length;
    const totalSeconds = entries.reduce((sum, entry) => sum + entry.durationSeconds, 0);
    const issueKeys = [...new Set(entries.map(e => e.jiraIssueKey))];

    return {
      totalEntries,
      totalSeconds,
      uniqueIssues: issueKeys.length,
      issues: issueKeys
    };
  }
}