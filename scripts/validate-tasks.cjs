#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

// Load configuration
function loadConfig() {
  try {
    if (fs.existsSync('.tasktracker.json')) {
      return JSON.parse(fs.readFileSync('.tasktracker.json', 'utf8'));
    }
  } catch (error) {
    console.warn('Warning: Could not load .tasktracker.json');
  }
  return { enabled: true, tasksFile: 'TASKS.md', validation: {} };
}

// Get current branch commits not yet pushed
function getUnpushedCommits() {
  try {
    const commits = execSync('git log --oneline @{u}.. 2>/dev/null', { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(Boolean);
    
    return commits;
  } catch (error) {
    // No upstream branch or no unpushed commits
    return [];
  }
}

// Check if TASKS.md has been updated
function checkTasksFileUpdated() {
  try {
    const modifiedFiles = execSync('git diff --name-only HEAD~1', { encoding: 'utf8' })
      .trim()
      .split('\n');
    
    return modifiedFiles.includes('TASKS.md');
  } catch (error) {
    return false;
  }
}

// Validate task entries
function validateTaskEntries(config) {
  const tasksFile = config.tasksFile;
  
  if (!fs.existsSync(tasksFile)) {
    console.warn(`⚠️  ${tasksFile} not found`);
    return false;
  }
  
  const content = fs.readFileSync(tasksFile, 'utf8');
  const lines = content.split('\n');
  
  // Look for auto-tracked tasks table
  const tableHeader = '| Date | Type | Task | Test File | Status | Commit |';
  const tableIndex = lines.findIndex(line => line.includes(tableHeader));
  
  if (tableIndex === -1) {
    console.warn('⚠️  No task tracking table found in TASKS.md');
    return false;
  }
  
  // Count task entries
  let taskCount = 0;
  let noTestCount = 0;
  
  for (let i = tableIndex + 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      taskCount++;
      if (line.includes('NO TEST')) {
        noTestCount++;
      }
    } else if (line === '') {
      break;
    }
  }
  
  console.log(`📊 Found ${taskCount} tracked tasks`);
  
  if (noTestCount > 0) {
    console.warn(`⚠️  ${noTestCount} tasks without tests!`);
    if (config.validation?.requireTestsForSource) {
      return false;
    }
  }
  
  return true;
}

// Check for modified source files without tests
function checkSourceWithoutTests() {
  try {
    const modifiedFiles = execSync('git diff --name-only HEAD~1', { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(Boolean);
    
    const sourceFiles = modifiedFiles.filter(f => 
      (f.endsWith('.jsx') || f.endsWith('.js') || f.endsWith('.ts') || f.endsWith('.tsx')) &&
      !f.includes('.test.') && 
      !f.includes('.spec.') &&
      !f.includes('__tests__/') &&
      !f.startsWith('scripts/')
    );
    
    const testFiles = modifiedFiles.filter(f => 
      f.includes('.test.') || 
      f.includes('.spec.') || 
      f.includes('__tests__/')
    );
    
    if (sourceFiles.length > 0 && testFiles.length === 0) {
      console.warn('⚠️  Source files modified without tests:');
      sourceFiles.forEach(f => console.warn(`   - ${f}`));
      return false;
    }
    
    return true;
  } catch (error) {
    return true; // Don't block on error
  }
}

// Main validation
function main() {
  const config = loadConfig();
  
  if (!config.enabled) {
    console.log('Task tracking validation is disabled');
    process.exit(0);
  }
  
  console.log('🔍 Validating task tracking...');
  
  let hasIssues = false;
  
  // Check if TASKS.md was updated
  const unpushedCommits = getUnpushedCommits();
  if (unpushedCommits.length > 0) {
    console.log(`📝 Found ${unpushedCommits.length} unpushed commits`);
    
    if (!checkTasksFileUpdated()) {
      console.warn('⚠️  TASKS.md has not been updated with recent commits');
      hasIssues = true;
    }
  }
  
  // Validate task entries
  if (!validateTaskEntries(config)) {
    hasIssues = true;
  }
  
  // Check for source without tests
  if (config.validation?.requireTestsForSource) {
    if (!checkSourceWithoutTests()) {
      hasIssues = true;
    }
  }
  
  if (hasIssues) {
    console.log('\n⚠️  Task tracking validation found issues');
    if (config.validation?.blockOnFailingTests) {
      process.exit(1);
    }
  } else {
    console.log('✅ Task tracking validation passed');
  }
  
  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };