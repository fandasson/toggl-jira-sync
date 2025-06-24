import inquirer from 'inquirer';
import chalk from 'chalk';
import { formatDuration } from './formatter.js';

export async function promptForJiraAssignment(groupedNonJiraEntries, jiraClient) {
  if (groupedNonJiraEntries.length === 0) {
    return [];
  }

  const { assignUnassigned } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'assignUnassigned',
      message: `You have ${groupedNonJiraEntries.length} group(s) of entries without Jira issue keys. Would you like to assign them to Jira issues?`,
      default: true
    }
  ]);

  if (!assignUnassigned) {
    return [];
  }

  const assignments = [];

  for (const group of groupedNonJiraEntries) {
    console.log('\n' + chalk.cyan(`Group: ${group.description}`));
    console.log(chalk.gray(`  Total time: ${formatDuration(group.totalSeconds)}`));
    console.log(chalk.gray(`  Number of entries: ${group.entries.length}`));
    
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do with this group?',
        choices: [
          { name: 'Assign to Jira issue', value: 'assign' },
          { name: 'Skip this group', value: 'skip' }
        ]
      }
    ]);

    if (action === 'assign') {
      const assignment = await validateAndAssignIssueKey(group, jiraClient);
      if (assignment) {
        assignments.push(assignment);
      }
    }
  }

  return assignments;
}

export async function validateAndAssignIssueKey(group, jiraClient) {
  let validIssueKey = false;
  let issueKey = '';
  
  while (!validIssueKey) {
    const { inputIssueKey } = await inquirer.prompt([
      {
        type: 'input',
        name: 'inputIssueKey',
        message: 'Enter Jira issue key (e.g., PROJ-123):'
      }
    ]);
    
    issueKey = inputIssueKey.toUpperCase();
    
    // Check format first
    if (!issueKey.match(/^[A-Z][A-Z0-9]+-\d+$/)) {
      console.log(chalk.red('Please enter a valid Jira issue key format (e.g., PROJ-123)'));
      continue;
    }
    
    // Validate the issue exists in Jira
    console.log(chalk.gray(`Validating ${issueKey}...`));
    try {
      validIssueKey = await jiraClient.validateIssueKey(issueKey);
      if (!validIssueKey) {
        console.log(chalk.red(`Issue ${issueKey} not found in Jira.`));
      }
    } catch (error) {
      console.log(chalk.red(`Error validating issue: ${error.message}`));
      const { retry } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'retry',
          message: 'Would you like to try another issue key?',
          default: true
        }
      ]);
      if (!retry) {
        return null;
      }
    }
  }
  
  return {
    issueKey,
    entries: group.entries
  };
}

export function convertUnassignedToJiraEntries(assignments) {
  const jiraEntries = {};
  
  assignments.forEach(assignment => {
    // Group entries by date for the assigned issue key
    const entriesByDate = {};
    assignment.entries.forEach(entry => {
      const date = entry.startedAt.split('T')[0];
      const groupKey = `${assignment.issueKey}_${date}`;
      
      if (!entriesByDate[groupKey]) {
        entriesByDate[groupKey] = {
          issueKey: assignment.issueKey,
          date: date,
          entries: [],
          totalSeconds: 0
        };
      }
      
      entriesByDate[groupKey].entries.push(entry);
      entriesByDate[groupKey].totalSeconds += entry.durationSeconds;
    });
    
    // Sort entries within each group by start time
    Object.values(entriesByDate).forEach(group => {
      group.entries.sort((a, b) => 
        new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
      );
    });
    
    // Merge into main jiraEntries object
    Object.assign(jiraEntries, entriesByDate);
  });
  
  return jiraEntries;
}