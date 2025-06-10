import axios from 'axios';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import { config } from '../config.js';

dayjs.extend(utc);

export class JiraClient {
  constructor() {
    this.client = axios.create({
      baseURL: config.jira.apiUrl,
      auth: {
        username: config.jira.email,
        password: config.jira.apiToken
      },
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }

  async createWorkLog(issueKey, timeSpentSeconds, startedAt, comment = '') {
    try {
      // Handle multi-line comments by splitting into paragraphs
      const commentLines = comment.split('\n').filter(line => line.trim());
      const content = commentLines.map(line => ({
        type: 'paragraph',
        content: [{
          text: line,
          type: 'text'
        }]
      }));
      
      const payload = {
        timeSpentSeconds,
        started: dayjs(startedAt).utc().format('YYYY-MM-DDTHH:mm:ss.SSS') + '+0000',
        comment: {
          type: 'doc',
          version: 1,
          content: content.length > 0 ? content : [{
            type: 'paragraph',
            content: [{
              text: 'Logged from Toggl Track',
              type: 'text'
            }]
          }]
        }
      };

      const response = await this.client.post(
        `/issue/${issueKey}/worklog`,
        payload
      );

      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(
          `Failed to create work log for ${issueKey}: ${error.response.status} - ` +
          `${error.response.data.errorMessages?.join(', ') || error.response.statusText}`
        );
      }
      throw error;
    }
  }

  async batchCreateWorkLogs(workLogs) {
    const results = {
      successful: [],
      failed: []
    };

    for (const workLog of workLogs) {
      try {
        const result = await this.createWorkLog(
          workLog.issueKey,
          workLog.timeSpentSeconds,
          workLog.startedAt,
          workLog.comment
        );

        results.successful.push({
          ...workLog,
          workLogId: result.id
        });
      } catch (error) {
        results.failed.push({
          ...workLog,
          error: error.message
        });
      }
    }

    return results;
  }

  async validateIssueKey(issueKey) {
    try {
      await this.client.get(`/issue/${issueKey}`, {
        params: { fields: 'key' }
      });
      return true;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return false;
      }
      throw error;
    }
  }
}
