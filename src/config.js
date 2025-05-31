import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

export const config = {
  toggl: {
    apiToken: process.env.TOGGL_API_TOKEN,
    workspaceId: process.env.TOGGL_WORKSPACE_ID,
    projectId: process.env.TOGGL_PROJECT_ID,
    apiUrl: 'https://api.track.toggl.com/api/v9'
  },
  jira: {
    apiToken: process.env.JIRA_API_TOKEN,
    email: process.env.JIRA_EMAIL,
    domain: process.env.JIRA_DOMAIN,
    get apiUrl() {
      return `https://${this.domain}/rest/api/3`;
    }
  }
};

export function validateConfig() {
  const required = [
    { key: 'TOGGL_API_TOKEN', value: config.toggl.apiToken },
    { key: 'TOGGL_WORKSPACE_ID', value: config.toggl.workspaceId },
    { key: 'TOGGL_PROJECT_ID', value: config.toggl.projectId },
    { key: 'JIRA_API_TOKEN', value: config.jira.apiToken },
    { key: 'JIRA_EMAIL', value: config.jira.email },
    { key: 'JIRA_DOMAIN', value: config.jira.domain }
  ];

  const missing = required.filter(item => !item.value);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.map(item => item.key).join(', ')}\n` +
      'Please check your .env file or set these environment variables.'
    );
  }
}