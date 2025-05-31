import axios from 'axios';
import dayjs from 'dayjs';
import { config } from '../config.js';

export class TogglClient {
  constructor() {
    this.client = axios.create({
      baseURL: config.toggl.apiUrl,
      auth: {
        username: config.toggl.apiToken,
        password: 'api_token'
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async getTimeEntries(startDate, endDate) {
    try {
      const params = {
        start_date: dayjs(startDate).format('YYYY-MM-DDTHH:mm:ss') + 'Z',
        end_date: dayjs(endDate).endOf('day').format('YYYY-MM-DDTHH:mm:ss') + 'Z'
      };

      const response = await this.client.get('/me/time_entries', { params });
      
      // Filter by workspace and project if specified
      const entries = response.data.filter(entry => {
        const matchesWorkspace = !config.toggl.workspaceId || 
          entry.workspace_id === parseInt(config.toggl.workspaceId);
        const matchesProject = !config.toggl.projectId || 
          entry.project_id === parseInt(config.toggl.projectId);
        
        return matchesWorkspace && matchesProject;
      });

      return entries.map(entry => ({
        id: entry.id,
        description: entry.description || '',
        duration: entry.duration,
        start: entry.start,
        stop: entry.stop,
        projectId: entry.project_id,
        workspaceId: entry.workspace_id
      }));
    } catch (error) {
      if (error.response) {
        throw new Error(`Toggl API error: ${error.response.status} - ${error.response.data.message || error.response.statusText}`);
      }
      throw error;
    }
  }

  async getProjectDetails(projectId) {
    if (!projectId) return null;
    
    try {
      const response = await this.client.get(`/workspaces/${config.toggl.workspaceId}/projects/${projectId}`);
      return response.data;
    } catch (error) {
      console.warn(`Failed to fetch project details for ID ${projectId}`);
      return null;
    }
  }
}