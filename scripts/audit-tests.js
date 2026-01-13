#!/usr/bin/env node

/**
 * Test Coverage Audit Script
 * Finds all components without test files
 */

import fs from 'fs';
import path from 'path';

// Colors for terminal output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Recursively find files matching pattern
function walkDirectory(dir, pattern, results = []) {
  if (!fs.existsSync(dir)) return results;
  
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filepath = path.join(dir, file);
    const stat = fs.statSync(filepath);
    
    if (stat.isDirectory()) {
      // Skip test directories and node_modules
      if (!file.includes('test') && file !== 'node_modules' && file !== '__tests__') {
        walkDirectory(filepath, pattern, results);
      }
    } else if (stat.isFile()) {
      // Check if file matches pattern and isn't a test file
      if (pattern.test(file) && !file.includes('.test.') && !file.includes('.spec.')) {
        results.push(filepath);
      }
    }
  }
  
  return results;
}

// Find all component files
function findComponents() {
  const componentPattern = /\.(jsx|tsx)$/;
  let components = [];
  
  // Search in components directory
  if (fs.existsSync('src/components')) {
    components = components.concat(walkDirectory('src/components', componentPattern));
  }
  
  // Search in pages directory
  if (fs.existsSync('src/pages')) {
    components = components.concat(walkDirectory('src/pages', componentPattern));
  }
  
  return components;
}

// Check if test file exists for component
function hasTestFile(componentPath) {
  const dir = path.dirname(componentPath);
  const basename = path.basename(componentPath);
  const nameWithoutExt = basename.replace(/\.(jsx|tsx)$/, '');
  
  const testPatterns = [
    `${nameWithoutExt}.test.jsx`,
    `${nameWithoutExt}.test.tsx`,
    `${nameWithoutExt}.spec.jsx`,
    `${nameWithoutExt}.spec.tsx`,
    `${nameWithoutExt}.test.js`,
    `${nameWithoutExt}.spec.js`
  ];
  
  for (const pattern of testPatterns) {
    const testPath = path.join(dir, pattern);
    if (fs.existsSync(testPath)) {
      return testPath;
    }
  }
  
  // Check in __tests__ folder
  const testsDir = path.join(dir, '__tests__');
  if (fs.existsSync(testsDir)) {
    for (const pattern of testPatterns) {
      const testPath = path.join(testsDir, pattern);
      if (fs.existsSync(testPath)) {
        return testPath;
      }
    }
  }
  
  return null;
}

// Main audit function  
function auditTests() {
  console.log(`${colors.blue}═══════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}     📊 Test Coverage Audit Report${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════${colors.reset}\n`);
  
  const components = findComponents();
  const componentsWithTests = [];
  const componentsWithoutTests = [];
  
  components.forEach(component => {
    const testFile = hasTestFile(component);
    if (testFile) {
      componentsWithTests.push({ component, testFile });
    } else {
      componentsWithoutTests.push(component);
    }
  });
  
  // Statistics
  const total = components.length;
  const tested = componentsWithTests.length;
  const untested = componentsWithoutTests.length;
  const coverage = ((tested / total) * 100).toFixed(1);
  
  // Summary
  console.log(`${colors.yellow}📈 Coverage Summary:${colors.reset}`);
  console.log(`   Total Components: ${total}`);
  console.log(`   ${colors.green}✅ With Tests: ${tested}${colors.reset}`);
  console.log(`   ${colors.red}❌ Without Tests: ${untested}${colors.reset}`);
  console.log(`   📊 Coverage: ${coverage}%\n`);
  
  // Progress bar
  const barLength = 40;
  const filledLength = Math.round((tested / total) * barLength);
  const emptyLength = barLength - filledLength;
  const progressBar = '█'.repeat(filledLength) + '░'.repeat(emptyLength);
  console.log(`   [${progressBar}] ${coverage}%\n`);
  
  // Components without tests
  if (componentsWithoutTests.length > 0) {
    console.log(`${colors.red}❌ Components WITHOUT Tests (${untested}):${colors.reset}`);
    console.log(`${colors.red}${'─'.repeat(43)}${colors.reset}`);
    
    // Group by directory
    const byDirectory = {};
    componentsWithoutTests.forEach(component => {
      const dir = path.dirname(component).replace('src/', '');
      if (!byDirectory[dir]) {
        byDirectory[dir] = [];
      }
      byDirectory[dir].push(path.basename(component));
    });
    
    // Display by directory
    Object.keys(byDirectory).sort().forEach(dir => {
      console.log(`\n${colors.yellow}📁 ${dir}/${colors.reset}`);
      byDirectory[dir].forEach(file => {
        console.log(`   ${colors.red}✗${colors.reset} ${file}`);
      });
    });
  }
  
  // High priority components (pages)
  console.log(`\n${colors.yellow}🎯 High Priority Components to Test:${colors.reset}`);
  console.log(`${colors.yellow}${'─'.repeat(43)}${colors.reset}`);
  
  const highPriority = componentsWithoutTests
    .filter(c => c.includes('/pages/'))
    .slice(0, 10);
  
  if (highPriority.length === 0) {
    console.log(`   ${colors.green}✅ All pages have tests!${colors.reset}`);
  } else {
    highPriority.forEach((component, index) => {
      console.log(`   ${index + 1}. ${component.replace('src/', '')}`);
    });
  }
  
  // Test creation commands
  if (componentsWithoutTests.length > 0) {
    console.log(`\n${colors.blue}💡 Quick Test Creation Commands:${colors.reset}`);
    console.log(`${colors.blue}${'─'.repeat(43)}${colors.reset}`);
    
    const first3 = componentsWithoutTests.slice(0, 3);
    first3.forEach(component => {
      const testFile = component.replace(/\.(jsx|tsx)$/, '.test.$1');
      console.log(`\n   # Create test for ${path.basename(component)}`);
      console.log(`   ${colors.green}touch ${testFile}${colors.reset}`);
      console.log(`   ${colors.green}code ${testFile}${colors.reset}`);
    });
  }
  
  // Goal tracking
  console.log(`\n${colors.blue}📅 Coverage Goals:${colors.reset}`);
  console.log(`${colors.blue}${'─'.repeat(43)}${colors.reset}`);
  
  const testsNeeded = untested;
  const testsPerDay = 10;
  const daysToComplete = Math.ceil(testsNeeded / testsPerDay);
  
  console.log(`   Tests needed: ${testsNeeded}`);
  console.log(`   At ${testsPerDay} tests/day: ${daysToComplete} days to 100%`);
  console.log(`   Target date: ${new Date(Date.now() + daysToComplete * 24 * 60 * 60 * 1000).toLocaleDateString()}`);
  
  // Exit code based on coverage
  if (coverage < 100) {
    console.log(`\n${colors.red}⚠️  Coverage is below 100%. Tests required!${colors.reset}`);
    if (process.env.CI) {
      process.exit(1); // Fail in CI if coverage is not 100%
    }
  } else {
    console.log(`\n${colors.green}🎉 Congratulations! 100% test coverage achieved!${colors.reset}`);
  }
  
  // Save report to file
  const report = {
    date: new Date().toISOString(),
    total: total,
    tested: tested,
    untested: untested,
    coverage: parseFloat(coverage),
    componentsWithoutTests: componentsWithoutTests,
    componentsWithTests: componentsWithTests.map(c => c.component)
  };
  
  fs.writeFileSync(
    path.join(process.cwd(), 'test-audit-report.json'),
    JSON.stringify(report, null, 2)
  );
  
  console.log(`\n${colors.green}✅ Report saved to test-audit-report.json${colors.reset}`);
}

// Run audit
auditTests();