import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration.js';
import utc from 'dayjs/plugin/utc.js';

dayjs.extend(duration);
dayjs.extend(utc);

export function formatDuration(seconds) {
  const dur = dayjs.duration(seconds, 'seconds');
  const hours = Math.floor(dur.asHours());
  const minutes = dur.minutes();
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function formatJiraWorkLog(issueKey, entries) {
  const totalSeconds = entries.reduce((sum, entry) => sum + entry.durationSeconds, 0);
  const descriptions = [...new Set(entries.map(e => e.description))];
  
  return {
    issueKey,
    timeSpentSeconds: totalSeconds,
    timeSpentFormatted: formatDuration(totalSeconds),
    startedAt: entries[0].startedAt,
    comment: descriptions.join('; '),
    entryCount: entries.length
  };
}

export function formatJiraWorkLogWithBreakdown(issueKey, entries, date) {
  const totalSeconds = entries.reduce((sum, entry) => sum + entry.durationSeconds, 0);
  
  // Create detailed breakdown of time entries
  const timeBreakdown = entries.map(entry => {
    const startTime = dayjs.utc(entry.startedAt).format('HH:mm');
    const endTime = dayjs.utc(entry.startedAt).add(entry.durationSeconds, 'seconds').format('HH:mm');
    const duration = formatDuration(entry.durationSeconds);
    
    return {
      timeRange: `${startTime}-${endTime}`,
      duration: duration,
      description: entry.description || '(No description)'
    };
  });
  
  // Create the comment with detailed breakdown
  const comment = formatDetailedComment(timeBreakdown, totalSeconds, entries.length);
  
  return {
    issueKey,
    date,
    timeSpentSeconds: totalSeconds,
    timeSpentFormatted: formatDuration(totalSeconds),
    startedAt: entries[0].startedAt,
    comment: comment,
    entryCount: entries.length,
    timeBreakdown: timeBreakdown
  };
}

function formatDetailedComment(timeBreakdown, totalSeconds, entryCount) {
  // Create a formatted comment with time breakdown
  let comment = `Time breakdown for ${entryCount} ${entryCount === 1 ? 'entry' : 'entries'}:\n\n`;
  
  timeBreakdown.forEach(entry => {
    comment += `• ${entry.timeRange} (${entry.duration}): ${entry.description}\n`;
  });
  
  comment += `\nTotal: ${formatDuration(totalSeconds)}`;
  
  return comment;
}

export function prepareSummaryData(jiraEntries, nonJiraEntries, alreadySyncedEntries = {}) {
  const jiraSummary = Object.entries(jiraEntries).map(([key, group]) => {
    // Handle both old format (issueKey only) and new format (issueKey_date)
    if (group.date) {
      return formatJiraWorkLogWithBreakdown(group.issueKey, group.entries, group.date);
    }
    return formatJiraWorkLog(group.issueKey, group.entries);
  });

  const nonJiraSummary = nonJiraEntries.map(group => ({
    description: group.description,
    totalTime: formatDuration(group.totalSeconds),
    entryCount: group.entries.length
  }));

  const alreadySyncedSummary = Object.entries(alreadySyncedEntries).map(([issueKey, group]) => ({
    issueKey,
    timeFormatted: formatDuration(group.totalSeconds),
    description: [...new Set(group.entries.map(e => e.description))].join('; '),
    entryCount: group.entries.length
  }));

  const totalJiraTime = jiraSummary.reduce((sum, item) => sum + item.timeSpentSeconds, 0);
  const totalNonJiraTime = nonJiraEntries.reduce((sum, group) => sum + group.totalSeconds, 0);
  const totalAlreadySyncedTime = Object.values(alreadySyncedEntries).reduce((sum, group) => sum + group.totalSeconds, 0);

  return {
    jiraWorkLogs: jiraSummary,
    nonJiraEntries: nonJiraSummary,
    alreadySynced: alreadySyncedSummary,
    totals: {
      jiraTime: formatDuration(totalJiraTime),
      jiraTimeSeconds: totalJiraTime,
      nonJiraTime: formatDuration(totalNonJiraTime),
      nonJiraTimeSeconds: totalNonJiraTime,
      alreadySyncedTime: totalAlreadySyncedTime > 0 ? formatDuration(totalAlreadySyncedTime) : null,
      alreadySyncedTimeSeconds: totalAlreadySyncedTime,
      totalTime: formatDuration(totalJiraTime + totalNonJiraTime + totalAlreadySyncedTime),
      totalTimeSeconds: totalJiraTime + totalNonJiraTime + totalAlreadySyncedTime
    }
  };
}