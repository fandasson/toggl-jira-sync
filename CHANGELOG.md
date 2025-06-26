# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2025-06-24

### Added
- **Interactive issue assignment**: Enhanced sync command with ability to assign Jira issue IDs to unassigned Toggl entries
  - Groups unassigned entries by description
  - Prompts for Jira issue ID for each group
  - Validates issue IDs exist in Jira before assignment
  - Shows updated summary after assignments

### Changed
- Default action when prompting for unassigned entries is now "Skip" for safer operation

## [1.2.0] - 2025-06-17
Storing file with sync history in user home directory. The file is newly named `.toggl-jira-history.json`. The previous
solution store the file in the current working directory. There could be even multiple files in case you run this command
from different directories. This change ensures that the sync history is stored in a single, consistent location.

**NOTE**: to keep existing history, copy the old file named `.sync-history.json` from the previous location to the new one. 

### Changed
- **Sync history file location**: Changed from current working directory to user home directory
- **Sync history file name**: Changed from `.sync-history.json` to `.toggl-jira-history.json`

## [1.1.0] - 2025-06-10
Maintained backward compatibility with existing sync history

### Added
- **Daily aggregation**: Time entries are now grouped by both Jira issue key AND date
- **Detailed time breakdowns**: Work logs now include comprehensive time breakdowns showing:
  - Individual time ranges (e.g., "09:00-09:30")
  - Duration for each time entry
  - Description of work performed
  - Total time summary
- New `groupEntriesByIssueKeyAndDate()` function in parser
- New `formatJiraWorkLogWithBreakdown()` function in formatter
- Enhanced summary display with date column and entry preview

### Changed
- Work logs are now created per issue per day instead of per issue only
- Jira work log comments now contain detailed time breakdowns instead of simple concatenated descriptions
- Summary table layout updated to show date, entry count, and preview information
- Enhanced Jira API client to handle multi-line comments with proper Atlassian Document Format

## [1.0.2] - Previous release
- Bug fixes and stability improvements

## [1.0.1] - Previous release  
- Initial release with basic sync functionality
