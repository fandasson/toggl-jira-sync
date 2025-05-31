# Toggl-Jira Sync CLI

A CLI tool to sync time entries from Toggl Track to Jira work logs.

## Features

- Fetches time entries from Toggl Track for a specific workspace and project
- Extracts Jira issue IDs from time entry descriptions (e.g., "ABC-123: Working on feature")
- Groups time entries by Jira issue key
- Shows summary of time entries with and without Jira issues
- Creates work logs in Jira with confirmation prompt
- Dry-run mode to preview changes without creating work logs
- **Remembers synced entries** - Automatically ignores already synced Toggl records
- **Sync history management** - View statistics and clear history when needed

## Installation

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
2. Create a new scoped API token with the following scopes:
   - `read:jira-work` - Required to read issue information
   - `write:issue-worklog:jira` - Required to create work logs
3. Copy the token value

## Usage

### Sync today's entries
```bash
node src/index.js sync
```

### Sync specific date range
```bash
node src/index.js sync --from 2024-01-01 --to 2024-01-31
```

### Dry run (preview without creating work logs)
```bash
node src/index.js sync --dry-run
```

### Show configuration
```bash
node src/index.js config
```

### Manage sync history
```bash
# View sync history statistics
node src/index.js history:view

# Clear all sync history (requires confirmation)
node src/index.js history:clear
```

## How it works

1. The tool fetches time entries from Toggl for the specified date range
2. It filters out entries that have already been synced (stored in local `.sync-history.json`)
3. It parses each remaining entry's description looking for Jira issue keys (e.g., ABC-123)
4. Entries with Jira keys are grouped by issue
5. A summary table is displayed showing:
   - Already synced entries (ignored)
   - Work logs to be created in Jira
   - Time entries without Jira issue keys
   - Total time breakdown
6. You're prompted to confirm before creating work logs in Jira
7. Work logs are created in batch with results displayed
8. Successfully synced entries are saved to local history to prevent re-syncing

## Testing

Run tests:
```bash
pnpm test
```

**Note:** The project uses ES modules (`import`/`export` syntax) with Jest, which requires the `--experimental-vm-modules` flag. 
This is handled automatically in the test scripts and is a common approach for modern JavaScript projects until Jest has full native ES module support.

## Jira Issue Key Format

The tool recognizes Jira issue keys in the format: `[A-Z][A-Z0-9]+-\d+`

Examples:
- ABC-123
- PROJ-4567
- TEST-1

The issue key can appear anywhere in the description.

## Note on Sync History

The tool automatically tracks synced entries in `.sync-history.json` to prevent duplicate work logs. This file is gitignored and stays local to your machine. You can safely run the sync multiple times without worrying about creating duplicate entries in Jira.
