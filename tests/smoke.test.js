import { spawn } from 'child_process';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CLI_PATH = join(__dirname, '..', 'src', 'index.js');
const packageJson = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));

function runCLI(args = [], timeout = 5000, clearEnv = false) {
  return new Promise((resolve, reject) => {
    let env = { ...process.env, NODE_ENV: 'test' };
    
    if (clearEnv) {
      // Clear only the specific env vars we care about
      delete env.TOGGL_API_TOKEN;
      delete env.TOGGL_WORKSPACE_ID;
      delete env.TOGGL_PROJECT_ID;
      delete env.JIRA_API_TOKEN;
      delete env.JIRA_EMAIL;
      delete env.JIRA_DOMAIN;
    }
    
    const child = spawn('node', [CLI_PATH, ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    const timeoutId = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`Command timed out after ${timeout}ms`));
    }, timeout);

    child.on('close', (code) => {
      clearTimeout(timeoutId);
      resolve({ code, stdout, stderr });
    });

    child.on('error', (error) => {
      clearTimeout(timeoutId);
      reject(error);
    });
  });
}

describe('CLI Smoke Tests', () => {
  test('displays help when no command is provided', async () => {
    const result = await runCLI(['--help']);
    
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Sync time entries from Toggl Track to Jira work logs');
    expect(result.stdout).toContain('Commands:');
    expect(result.stdout).toContain('sync');
    expect(result.stdout).toContain('config');
    expect(result.stdout).toContain('history:view');
    expect(result.stdout).toContain('history:clear');
  });

  test('shows version information', async () => {
    const result = await runCLI(['--version']);
    
    expect(result.code).toBe(0);
    expect(result.stdout).toContain(packageJson.version);
  });

  test('sync command shows help', async () => {
    const result = await runCLI(['sync', '--help']);
    
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Sync time entries to Jira');
    expect(result.stdout).toContain('--from');
    expect(result.stdout).toContain('--to');
    expect(result.stdout).toContain('--dry-run');
  });

  test('config command is callable', async () => {
    const result = await runCLI(['config']);
    
    // Should work if env vars are set, or show config if they are
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Current configuration:');
  });

  test('config command shows configuration', async () => {
    const result = await runCLI(['config'], 5000, true);
    
    // Config command shows current state regardless of validity
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Current configuration:');
    expect(result.stdout).toContain('Toggl:');
    expect(result.stdout).toContain('Jira:');
  });

  test('history:view command is callable', async () => {
    const result = await runCLI(['history:view']);
    
    expect(result.code).toBe(0);
    // Should contain either history stats or no history message
    expect(
      result.stdout.includes('No sync history found') || 
      result.stdout.includes('Sync History Statistics')
    ).toBe(true);
  });

  test('history:clear command shows confirmation prompt', async () => {
    // This will timeout waiting for user input, which is expected behavior
    const promise = runCLI(['history:clear'], 1000);
    
    await expect(promise).rejects.toThrow('Command timed out');
  });

  test('sync command handles missing config appropriately', async () => {
    const result = await runCLI(['sync', '--dry-run'], 5000, true);
    
    // Sync command behavior depends on whether .env file exists
    // If .env exists with valid config, it succeeds (code 0)
    // If .env is missing or invalid, it fails (code 1)
    if (result.code === 0) {
      // Config was loaded from .env file
      expect(
        result.stdout.includes('Dry run mode') || 
        result.stdout.includes('No Jira work logs to create') ||
        result.stdout.includes('Fetching time entries')
      ).toBe(true);
    } else {
      // Config was missing
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('Missing required environment variables');
    }
  });

  test('invalid command shows error', async () => {
    const result = await runCLI(['invalid-command']);
    
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('unknown command');
  });
});

describe('Module Loading Tests', () => {
  test('can import main modules without errors', async () => {
    // Test that core modules can be imported
    const { TogglClient } = await import('../src/api/toggl.js');
    const { JiraClient } = await import('../src/api/jira.js');
    const { SyncHistory } = await import('../src/utils/syncHistory.js');
    const { extractJiraIssueKey, parseTimeEntry } = await import('../src/utils/parser.js');
    const { formatDuration, prepareSummaryData } = await import('../src/utils/formatter.js');
    const { promptForJiraAssignment, validateAndAssignIssueKey, convertUnassignedToJiraEntries } = await import('../src/utils/interactive.js');

    expect(TogglClient).toBeDefined();
    expect(JiraClient).toBeDefined();
    expect(SyncHistory).toBeDefined();
    expect(extractJiraIssueKey).toBeDefined();
    expect(parseTimeEntry).toBeDefined();
    expect(formatDuration).toBeDefined();
    expect(prepareSummaryData).toBeDefined();
    expect(promptForJiraAssignment).toBeDefined();
    expect(validateAndAssignIssueKey).toBeDefined();
    expect(convertUnassignedToJiraEntries).toBeDefined();
  });

  test('can instantiate classes without config', async () => {
    const { SyncHistory } = await import('../src/utils/syncHistory.js');
    
    // SyncHistory should work without config
    const syncHistory = new SyncHistory();
    expect(syncHistory).toBeDefined();
    expect(typeof syncHistory.isEntrySynced).toBe('function');
    expect(typeof syncHistory.markEntriesAsSynced).toBe('function');
  });

  test('utility functions work correctly', async () => {
    const { extractJiraIssueKey } = await import('../src/utils/parser.js');
    const { formatDuration } = await import('../src/utils/formatter.js');
    const { convertUnassignedToJiraEntries } = await import('../src/utils/interactive.js');

    expect(extractJiraIssueKey('ABC-123: Test task')).toBe('ABC-123');
    expect(formatDuration(3600)).toBe('1h 0m');
    
    // Test interactive utility
    const assignments = [
      {
        issueKey: 'TEST-123',
        entries: [
          { id: 1, description: 'Test work', durationSeconds: 3600, startedAt: '2024-01-01T10:00:00Z' }
        ]
      }
    ];
    const result = convertUnassignedToJiraEntries(assignments);
    expect(result['TEST-123_2024-01-01']).toBeDefined();
    expect(result['TEST-123_2024-01-01'].issueKey).toBe('TEST-123');
    expect(result['TEST-123_2024-01-01'].totalSeconds).toBe(3600);
  });
});