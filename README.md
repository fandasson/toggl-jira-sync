# Toggl-Jira Sync CLI

A CLI tool to sync time entries from Toggl Track to Jira work logs. Created together with Claude code.

## Features

- Fetches time entries from Toggl Track for a specific workspace and project
- Extracts Jira issue IDs from time entry descriptions (e.g., "ABC-123: Working on feature")
- **Daily aggregation** - Groups time entries by Jira issue AND date for better time visibility
- **Detailed time breakdowns** - Each work log shows when work was done throughout the day
- Shows summary of time entries with and without Jira issues
- Creates work logs in Jira with confirmation prompt
- Dry-run mode to preview changes without creating work logs
- **Remembers synced entries** - Automatically ignores already synced Toggl records
- **Sync history management** - View statistics and clear history when needed

## Installation

### From npm (recommended)

```bash
npm install -g toggl-jira-sync
```

#### Set environment Variables

Provide configuration via environment variables. See the configuration section below to know how to get them.

```bash
# Run with all required environment variables
TOGGL_API_TOKEN="your-toggl-token" \
TOGGL_WORKSPACE_ID="workspace-id" \
TOGGL_PROJECT_ID="project-id" \
JIRA_API_TOKEN="your-jira-token" \
JIRA_EMAIL="your-email@example.com" \
JIRA_DOMAIN="your-domain.atlassian.net" \
toggl-jira-sync

# Or export them first
export TOGGL_API_TOKEN="your-toggl-token"
export TOGGL_WORKSPACE_ID="workspace-id"
export TOGGL_PROJECT_ID="project-id"
export JIRA_API_TOKEN="your-jira-token"
export JIRA_EMAIL="your-email@example.com"
export JIRA_DOMAIN="your-domain.atlassian.net"
toggl-jira-sync
```

### From source

1. Clone this repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
4. Fill in your API credentials in the `.env` file

## Configuration

### Toggl API Token
1. Go to https://track.toggl.com/profile
2. Scroll down to "API Token" section
3. Copy your API token

### Toggl Workspace and Project IDs
1. In Toggl Track, navigate to your workspace
2. The workspace ID is in the URL: `https://track.toggl.com/[WORKSPACE_ID]/...`
3. Click on a project to see its ID in the URL

### Jira API Token
1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Create non-scoped token as scoped tokens doesn't work for [bug in JIRA API](https://jira.atlassian.com/browse/JRACLOUD-94545)
2. ~~Create a new scoped API token with the following scopes:~~
     - `read:jira-work`
     - `write:jira-work`
     - `read:issue-worklog:jira`
     - `write:issue-worklog:jira`
     - `read:issue-worklog.property:jira`
     - `write:issue-worklog.property:jira`
3. Copy the token value

## Usage

### Sync today's entries
```bash
# If installed globally via npm
toggl-jira-sync

# If running from source
node src/index.js sync
```

### Sync specific date range
```bash
# If installed globally via npm
toggl-jira-sync --from 2024-01-01 --to 2024-01-31

# If running from source
node src/index.js sync --from 2024-01-01 --to 2024-01-31
```

### Dry run (preview without creating work logs)
```bash
# If installed globally via npm
toggl-jira-sync --dry-run

# If running from source
node src/index.js sync --dry-run
```

### Show configuration
```bash
# If installed globally via npm
toggl-jira-sync config

# If running from source
node src/index.js config
```

### Manage sync history
```bash
# View sync history statistics
toggl-jira-sync history:view  # (or node src/index.js history:view from source)

# Clear all sync history (requires confirmation)
toggl-jira-sync history:clear  # (or node src/index.js history:clear from source)
```

## How it works

1. The tool fetches time entries from Toggl for the specified date range
2. It filters out entries that have already been synced (stored in local `~/.toggl-jira-history.json`)
3. It parses each remaining entry's description looking for Jira issue keys (e.g., ABC-123)
4. **Entries with Jira keys are grouped by issue AND date** for daily aggregation
5. A summary table is displayed showing:
   - Already synced entries (ignored)
   - Work logs to be created in Jira (grouped by issue/date with entry count)
   - Time entries without Jira issue keys
   - Total time breakdown
6. You're prompted to confirm before creating work logs in Jira
7. Work logs are created with **detailed time breakdowns** showing when work happened
8. Successfully synced entries are saved to local history to prevent re-syncing

### Work Log Format in Jira

Each work log includes a detailed breakdown of your time entries:

```
Time breakdown for 3 entries:

• 09:00-09:30 (30m): Morning standup and planning
• 10:15-11:00 (45m): Bug investigation and analysis  
• 14:00-15:15 (1h 15m): Implementation and testing

Total: 2h 30m
```

This preserves the exact timing of when work was performed, making time tracking more accurate and transparent.

## Testing

Run tests:
```bash
pnpm test
```

## Jira Issue Key Format

The tool recognizes Jira issue keys in the format: `[A-Z][A-Z0-9]+-\d+`

Examples:
- ABC-123
- PROJ-4567
- TEST-1

The issue key can appear anywhere in the description.

## Troubleshooting

### Jira API Errors

If you encounter "400 Bad Request" errors when creating work logs:

1. **Verify Issue Access**: Make sure the Jira issue exists and you have permission to log work on it

2. **Check Issue Status**: Some Jira workflows prevent work logging on closed or certain status issues

3. **Date Format Issues**: The tool automatically formats dates to ISO format (e.g., `2024-01-01T10:30:00.000Z`) which should work with all Jira instances

4. **Test with Dry Run**: Use `--dry-run` flag first to verify the tool can fetch and parse your Toggl entries correctly

### Common Issues

- **"No time entries found"**: Check your Toggl workspace and project IDs in the `.env` file
- **"Missing required environment variables"**: Ensure all required variables are set in your `.env` file
- **Permission errors**: Verify your API tokens have the necessary scopes and permissions

## Note on Sync History

The tool automatically tracks synced entries in `~/.toggl-jira-history.json` to prevent duplicate work logs. This file is gitignored and stays local to your machine. You can safely run the sync multiple times without worrying about creating duplicate entries in Jira.
