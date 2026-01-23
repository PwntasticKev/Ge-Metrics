#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG_FILE = '.tasktracker.json';
const DEFAULT_CONFIG = {
  enabled: true,
  tasksFile: 'TASKS.md',
  requireTests: true,
  autoStatus: true,
  categories: ['feat', 'fix', 'test', 'docs', 'refactor', 'chore', 'style', 'perf']
};

// Load configuration
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
  } catch (error) {
    console.warn('Warning: Could not load .tasktracker.json, using defaults');
  }
  return DEFAULT_CONFIG;
}

// Get the latest commit info
function getLatestCommit() {
  try {
    const hash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim().substring(0, 7);
    const message = execSync('git log -1 --pretty=%B', { encoding: 'utf8' }).trim();
    const author = execSync('git log -1 --pretty=%an', { encoding: 'utf8' }).trim();
    const date = new Date().toISOString().split('T')[0];
    
    return { hash, message, author, date };
  } catch (error) {
    console.error('Error getting commit info:', error.message);
    return null;
  }
}

// Get modified files in the latest commit
function getModifiedFiles() {
  try {
    const files = execSync('git diff-tree --no-commit-id --name-only -r HEAD', { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(Boolean);
    
    return files;
  } catch (error) {
    console.error('Error getting modified files:', error.message);
    return [];
  }
}

// Parse commit message for type and scope
function parseCommitMessage(message) {
  // Support conventional commit format: type(scope): description [test-status]
  const conventionalRegex = /^(\w+)(?:\(([^)]+)\))?:\s*(.+?)(?:\s*\[test:(\w+)\])?$/;
  const match = message.match(conventionalRegex);
  
  if (match) {
    return {
      type: match[1],
      scope: match[2] || '',
      description: match[3],
      testStatus: match[4] || 'pending'
    };
  }
  
  // Fallback for non-conventional commits
  return {
    type: 'chore',
    scope: '',
    description: message,
    testStatus: 'pending'
  };
}

// Determine test status based on files changed
function determineTestStatus(files, explicitStatus) {
  if (explicitStatus && ['red', 'green', 'complete', 'refactor'].includes(explicitStatus.toLowerCase())) {
    return explicitStatus.toLowerCase();
  }
  
  const hasTestFiles = files.some(f => 
    f.includes('.test.') || 
    f.includes('.spec.') || 
    f.includes('__tests__/')
  );
  
  const hasSourceFiles = files.some(f => 
    (f.endsWith('.jsx') || f.endsWith('.js') || f.endsWith('.ts') || f.endsWith('.tsx')) &&
    !f.includes('.test.') && 
    !f.includes('.spec.') &&
    !f.includes('__tests__/')
  );
  
  if (hasTestFiles && !hasSourceFiles) {
    return 'red'; // Only tests added, likely TDD red phase
  } else if (hasTestFiles && hasSourceFiles) {
    return 'green'; // Both tests and source, likely green phase
  } else if (hasSourceFiles && !hasTestFiles) {
    return 'no-test'; // Source without tests - warning!
  }
  
  return 'pending';
}

// Get status emoji
function getStatusEmoji(status) {
  const statusMap = {
    'red': '🔴 RED',
    'green': '🟢 GREEN',
    'refactor': '🔄 REFACTOR',
    'complete': '✅ COMPLETE',
    'pending': '⏳ PENDING',
    'no-test': '⚠️ NO TEST'
  };
  
  return statusMap[status] || '❓ UNKNOWN';
}

// Find related test files
function findTestFiles(files) {
  const testFiles = files.filter(f => 
    f.includes('.test.') || 
    f.includes('.spec.') || 
    f.includes('__tests__/')
  );
  
  if (testFiles.length > 0) {
    return testFiles.map(f => path.basename(f)).join(', ');
  }
  
  // Look for potential test files based on source files
  const sourceFiles = files.filter(f => 
    (f.endsWith('.jsx') || f.endsWith('.js') || f.endsWith('.ts') || f.endsWith('.tsx')) &&
    !f.includes('.test.') && 
    !f.includes('.spec.')
  );
  
  if (sourceFiles.length > 0) {
    const componentName = path.basename(sourceFiles[0], path.extname(sourceFiles[0]));
    return `${componentName}.test.*`;
  }
  
  return 'N/A';
}

// Update TASKS.md file
function updateTasksFile(config, taskEntry) {
  const tasksFile = config.tasksFile;
  
  try {
    let content = '';
    
    if (fs.existsSync(tasksFile)) {
      content = fs.readFileSync(tasksFile, 'utf8');
    } else {
      // Create new TASKS.md with header
      content = `# 📋 Task Tracker

## Auto-tracked Tasks

| Date | Type | Task | Test File | Status | Commit |
|------|------|------|-----------|--------|--------|
`;
    }
    
    // Find the table or create one
    const tableHeader = '| Date | Type | Task | Test File | Status | Commit |';
    let tableIndex = content.lastIndexOf(tableHeader);
    
    if (tableIndex === -1) {
      // Add table at the end
      content += `\n## Auto-tracked Tasks\n\n${tableHeader}
|------|------|------|-----------|--------|--------|\n`;
      tableIndex = content.lastIndexOf(tableHeader);
    }
    
    // Find the end of the table
    const lines = content.substring(tableIndex).split('\n');
    let insertIndex = 0;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === '' || !lines[i].startsWith('|')) {
        insertIndex = i;
        break;
      }
      insertIndex = i + 1;
    }
    
    // Insert the new entry
    const beforeTable = content.substring(0, tableIndex);
    const tableLines = lines.slice(0, insertIndex);
    const afterTable = lines.slice(insertIndex).join('\n');
    
    tableLines.push(taskEntry);
    
    const newContent = beforeTable + tableLines.join('\n') + '\n' + afterTable;
    
    fs.writeFileSync(tasksFile, newContent);
    console.log(`✅ Task tracked in ${tasksFile}`);
    
  } catch (error) {
    console.error('Error updating TASKS.md:', error.message);
  }
}

// Main execution
function main() {
  const config = loadConfig();
  
  if (!config.enabled) {
    console.log('Task tracking is disabled');
    return;
  }
  
  const commit = getLatestCommit();
  if (!commit) {
    console.error('Could not get commit information');
    return;
  }
  
  const files = getModifiedFiles();
  const parsed = parseCommitMessage(commit.message);
  const testStatus = determineTestStatus(files, parsed.testStatus);
  const testFiles = findTestFiles(files);
  
  // Warn if no tests
  if (testStatus === 'no-test' && config.requireTests) {
    console.warn('⚠️  Warning: Source files modified without tests!');
  }
  
  // Format task entry
  const taskEntry = `| ${commit.date} | ${parsed.type} | ${parsed.description} | ${testFiles} | ${getStatusEmoji(testStatus)} | ${commit.hash} |`;
  
  // Update TASKS.md
  updateTasksFile(config, taskEntry);
  
  // Log summary
  console.log(`📝 Tracked: ${parsed.type}: ${parsed.description}`);
  console.log(`   Status: ${getStatusEmoji(testStatus)}`);
  console.log(`   Tests: ${testFiles}`);
  console.log(`   Commit: ${commit.hash}`);
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main, parseCommitMessage, determineTestStatus };