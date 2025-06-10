export function extractJiraIssueKey(description) {
  if (!description) return null;
  
  // Match common Jira issue key patterns (e.g., ABC-123, PROJ-1234)
  const jiraKeyPattern = /\b([A-Z][A-Z0-9]+-\d+)\b/;
  const match = description.match(jiraKeyPattern);
  
  return match ? match[1] : null;
}

export function parseTimeEntry(entry) {
  const issueKey = extractJiraIssueKey(entry.description);
  
  return {
    id: entry.id,
    description: entry.description,
    durationSeconds: entry.duration > 0 ? entry.duration : 0,
    startedAt: entry.start,
    issueKey,
    hasJiraIssue: !!issueKey
  };
}

export function groupEntriesByDescription(entries) {
  const grouped = {};
  
  entries.forEach(entry => {
    const key = entry.description || '(No description)';
    
    if (!grouped[key]) {
      grouped[key] = {
        description: key,
        entries: [],
        totalSeconds: 0
      };
    }
    
    grouped[key].entries.push(entry);
    grouped[key].totalSeconds += entry.durationSeconds;
  });
  
  return Object.values(grouped);
}

export function groupEntriesByIssueKey(entries) {
  const grouped = {};
  
  entries.forEach(entry => {
    if (!entry.issueKey) return;
    
    if (!grouped[entry.issueKey]) {
      grouped[entry.issueKey] = {
        issueKey: entry.issueKey,
        entries: [],
        totalSeconds: 0
      };
    }
    
    grouped[entry.issueKey].entries.push(entry);
    grouped[entry.issueKey].totalSeconds += entry.durationSeconds;
  });
  
  return grouped;
}

export function groupEntriesByIssueKeyAndDate(entries) {
  const grouped = {};
  
  entries.forEach(entry => {
    if (!entry.issueKey) return;
    
    // Extract date (YYYY-MM-DD) from the startedAt timestamp
    const date = entry.startedAt.split('T')[0];
    const groupKey = `${entry.issueKey}_${date}`;
    
    if (!grouped[groupKey]) {
      grouped[groupKey] = {
        issueKey: entry.issueKey,
        date: date,
        entries: [],
        totalSeconds: 0
      };
    }
    
    grouped[groupKey].entries.push(entry);
    grouped[groupKey].totalSeconds += entry.durationSeconds;
  });
  
  // Sort entries within each group by start time
  Object.values(grouped).forEach(group => {
    group.entries.sort((a, b) => 
      new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
    );
  });
  
  return grouped;
}