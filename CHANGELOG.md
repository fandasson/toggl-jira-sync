# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-01-06
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
