import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, renameSync } from 'fs';
import { join } from 'path';

describe('Configuration validation', () => {
  let originalEnv;
  const envPath = join(process.cwd(), '.env');
  const envBackupPath = join(process.cwd(), '.env.backup');

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    // Clear module cache to ensure fresh imports
    vi.resetModules();
    
    // Temporarily rename .env file if it exists
    if (existsSync(envPath)) {
      renameSync(envPath, envBackupPath);
    }
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    vi.resetModules();
    
    // Restore .env file if it was renamed
    if (existsSync(envBackupPath)) {
      renameSync(envBackupPath, envPath);
    }
  });

  it('should throw error when required environment variables are missing', async () => {
    // Clear environment variables
    delete process.env.TOGGL_API_TOKEN;
    delete process.env.TOGGL_WORKSPACE_ID;
    delete process.env.TOGGL_PROJECT_ID;
    delete process.env.JIRA_API_TOKEN;
    delete process.env.JIRA_EMAIL;
    delete process.env.JIRA_DOMAIN;

    // Import after clearing env vars
    const { validateConfig } = await import('../src/config.js');

    expect(() => validateConfig()).toThrow('Missing required environment variables');
  });

  it('should not throw error when all required environment variables are set', async () => {
    // Set all required environment variables
    process.env.TOGGL_API_TOKEN = 'test-toggl-token';
    process.env.TOGGL_WORKSPACE_ID = 'test-workspace';
    process.env.TOGGL_PROJECT_ID = 'test-project';
    process.env.JIRA_API_TOKEN = 'test-jira-token';
    process.env.JIRA_EMAIL = 'test@example.com';
    process.env.JIRA_DOMAIN = 'test.atlassian.net';

    // Import after setting env vars
    const { validateConfig } = await import('../src/config.js');

    expect(() => validateConfig()).not.toThrow();
  });
});