#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import dayjs from 'dayjs';
import inquirer from 'inquirer';
import Table from 'cli-table3';

import { config, validateConfig } from './config.js';
import { TogglClient } from './api/toggl.js';
import { JiraClient } from './api/jira.js';
import { parseTimeEntry, groupEntriesByDescription, groupEntriesByIssueKey } from './utils/parser.js';
import { prepareSummaryData } from './utils/formatter.js';

async function displaySummary(summary) {
  console.log('\n' + chalk.bold('=== SUMMARY ==='));
  
  // Display Jira work logs
  if (summary.jiraWorkLogs.length > 0) {
    console.log('\n' + chalk.green.bold('Work logs to be created in Jira:'));
    const jiraTable = new Table({
      head: ['Issue Key', 'Time', 'Comment', 'Entries'],
      colWidths: [15, 10, 50, 10]
    });
    
    summary.jiraWorkLogs.forEach(log => {
      jiraTable.push([
        log.issueKey,
        log.timeSpentFormatted,
        log.comment.substring(0, 47) + (log.comment.length > 47 ? '...' : ''),
        log.entryCount
      ]);
    });
    
    console.log(jiraTable.toString());
  }
  
  // Display non-Jira entries
  if (summary.nonJiraEntries.length > 0) {
    console.log('\n' + chalk.yellow.bold('Time entries without Jira issue keys:'));
    const nonJiraTable = new Table({
      head: ['Description', 'Total Time', 'Entries'],
      colWidths: [60, 15, 10]
    });
    
    summary.nonJiraEntries.forEach(entry => {
      nonJiraTable.push([
        entry.description.substring(0, 57) + (entry.description.length > 57 ? '...' : ''),
        entry.totalTime,
        entry.entryCount
      ]);
    });
    
    console.log(nonJiraTable.toString());
  }
  
  // Display totals
  console.log('\n' + chalk.bold('Totals:'));
  console.log(`  Jira time: ${chalk.green(summary.totals.jiraTime)}`);
  console.log(`  Non-Jira time: ${chalk.yellow(summary.totals.nonJiraTime)}`);
  console.log(`  Total time: ${chalk.cyan(summary.totals.totalTime)}`);
}

async function syncCommand(options) {
  try {
    validateConfig();
    
    const startDate = dayjs(options.from);
    const endDate = dayjs(options.to);
    
    if (!startDate.isValid() || !endDate.isValid()) {
      console.error(chalk.red('Invalid date format. Please use YYYY-MM-DD format.'));
      process.exit(1);
    }
    
    console.log(chalk.cyan(`Fetching time entries from ${startDate.format('YYYY-MM-DD')} to ${endDate.format('YYYY-MM-DD')}...`));
    
    // Fetch entries from Toggl
    const togglClient = new TogglClient();
    const timeEntries = await togglClient.getTimeEntries(startDate, endDate);
    
    if (timeEntries.length === 0) {
      console.log(chalk.yellow('No time entries found for the specified period.'));
      return;
    }
    
    console.log(chalk.green(`Found ${timeEntries.length} time entries.`));
    
    // Parse and group entries
    const parsedEntries = timeEntries.map(parseTimeEntry);
    const jiraEntries = parsedEntries.filter(e => e.hasJiraIssue);
    const nonJiraEntries = parsedEntries.filter(e => !e.hasJiraIssue);
    
    const groupedJiraEntries = groupEntriesByIssueKey(jiraEntries);
    const groupedNonJiraEntries = groupEntriesByDescription(nonJiraEntries);
    
    // Prepare summary
    const summary = prepareSummaryData(groupedJiraEntries, groupedNonJiraEntries);
    
    // Display summary
    await displaySummary(summary);
    
    if (summary.jiraWorkLogs.length === 0) {
      console.log('\n' + chalk.yellow('No Jira work logs to create.'));
      return;
    }
    
    if (options.dryRun) {
      console.log('\n' + chalk.yellow('Dry run mode - no work logs will be created.'));
      return;
    }
    
    // Ask for confirmation
    const { confirmed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message: `Create ${summary.jiraWorkLogs.length} work log(s) in Jira?`,
        default: false
      }
    ]);
    
    if (!confirmed) {
      console.log(chalk.yellow('Sync cancelled.'));
      return;
    }
    
    // Create work logs in Jira
    console.log('\n' + chalk.cyan('Creating work logs in Jira...'));
    const jiraClient = new JiraClient();
    const results = await jiraClient.batchCreateWorkLogs(summary.jiraWorkLogs);
    
    // Display results
    if (results.successful.length > 0) {
      console.log(chalk.green(`✓ Successfully created ${results.successful.length} work log(s).`));
    }
    
    if (results.failed.length > 0) {
      console.log(chalk.red(`✗ Failed to create ${results.failed.length} work log(s):`));
      results.failed.forEach(failure => {
        console.log(chalk.red(`  - ${failure.issueKey}: ${failure.error}`));
      });
    }
    
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

async function configCommand() {
  console.log(chalk.cyan('Current configuration:'));
  console.log('\nToggl:');
  console.log(`  API Token: ${config.toggl.apiToken ? '***' + config.toggl.apiToken.slice(-4) : 'Not set'}`);
  console.log(`  Workspace ID: ${config.toggl.workspaceId || 'Not set'}`);
  console.log(`  Project ID: ${config.toggl.projectId || 'Not set'}`);
  console.log('\nJira:');
  console.log(`  API Token: ${config.jira.apiToken ? '***' + config.jira.apiToken.slice(-4) : 'Not set'}`);
  console.log(`  Email: ${config.jira.email || 'Not set'}`);
  console.log(`  Domain: ${config.jira.domain || 'Not set'}`);
  console.log('\n' + chalk.yellow('To update configuration, please edit the .env file.'));
}

// Set up CLI
program
  .name('toggl-jira')
  .description('Sync time entries from Toggl Track to Jira work logs')
  .version('1.0.0');

program
  .command('sync')
  .description('Sync time entries to Jira')
  .option('-f, --from <date>', 'Start date (YYYY-MM-DD)', dayjs().format('YYYY-MM-DD'))
  .option('-t, --to <date>', 'End date (YYYY-MM-DD)', dayjs().format('YYYY-MM-DD'))
  .option('-d, --dry-run', 'Show what would be synced without creating work logs')
  .action(syncCommand);

program
  .command('config')
  .description('Show current configuration')
  .action(configCommand);

program.parse();