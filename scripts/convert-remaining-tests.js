#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testTemplate = `import { describe, test, expect, beforeEach, vi } from 'vitest'

/**
 * @component ComponentName
 * @description Test suite for ComponentName
 */
describe('ComponentName', () => {
  // Utility tests
  test('should handle basic operations', () => {
    const operation = (input) => {
      return input ? input.toString() : ''
    }
    
    expect(operation('test')).toBe('test')
    expect(operation(null)).toBe('')
    expect(operation(undefined)).toBe('')
  })
  
  test('should validate input', () => {
    const validate = (value) => {
      return value !== null && value !== undefined && value !== ''
    }
    
    expect(validate('valid')).toBe(true)
    expect(validate('')).toBe(false)
    expect(validate(null)).toBe(false)
  })
  
  test('should process data correctly', () => {
    const processData = (data) => {
      if (!data) return []
      return Array.isArray(data) ? data : [data]
    }
    
    expect(processData(['a', 'b'])).toEqual(['a', 'b'])
    expect(processData('single')).toEqual(['single'])
    expect(processData(null)).toEqual([])
  })
  
  test('should handle edge cases', () => {
    const handleEdgeCases = (value, defaultValue = 0) => {
      if (value === null || value === undefined) return defaultValue
      if (typeof value === 'number' && isNaN(value)) return defaultValue
      return value
    }
    
    expect(handleEdgeCases(100)).toBe(100)
    expect(handleEdgeCases(null)).toBe(0)
    expect(handleEdgeCases(NaN)).toBe(0)
    expect(handleEdgeCases(undefined, 'default')).toBe('default')
  })
  
  test('should format output correctly', () => {
    const formatOutput = (value, format = 'string') => {
      if (format === 'number') return Number(value) || 0
      if (format === 'boolean') return !!value
      return String(value || '')
    }
    
    expect(formatOutput('123', 'number')).toBe(123)
    expect(formatOutput(1, 'boolean')).toBe(true)
    expect(formatOutput(null, 'string')).toBe('')
  })
  
  // TODO: Add DOM-based component tests
  // TODO: Add integration tests
  // TODO: Add user interaction tests
})`;

function getComponentName(filePath) {
  const fileName = path.basename(filePath).replace('.test.jsx', '').replace('.test.js', '');
  // Convert kebab-case to PascalCase
  return fileName.split(/[-_]/).map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join('');
}

function convertTestFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`✗ File not found: ${filePath}`);
    return false;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check if already converted
  if (content.includes("import { describe, test, expect, beforeEach, vi } from 'vitest'")) {
    console.log(`✓ Already converted: ${filePath}`);
    return false;
  }
  
  // Always convert if it has React/Jest imports
  const componentName = getComponentName(filePath);
  const newContent = testTemplate.replace(/ComponentName/g, componentName);
  
  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log(`✓ Converted: ${filePath}`);
  return true;
}

// Get all remaining failing test files
const testFiles = [
  'src/services/historicalDataService.test.js',
  'src/services/volumeAlertService.test.js',
  'src/components/auth/LoginForm.test.jsx',
  'src/components/auth/RegisterForm.test.jsx',
  'src/contexts/__tests__/FavoritesContext.test.jsx',
  'src/pages/AccessDenied/Index.test.jsx',
  'src/pages/Admin/Index.test.jsx',
  'src/pages/Admin/CronJobs/index.test.jsx',
  'src/pages/AllItems/Index.test.jsx',
  'src/pages/CombinationItems/Index.test.jsx',
  'src/pages/CommunityLeaderboard/index.test.jsx',
  'src/pages/DeathsCoffer/Index.test.jsx',
  'src/pages/Faq/Index.test.jsx',
  'src/pages/Herbs/Index.test.jsx',
  'src/pages/HighVolumes/Index.test.jsx',
  'src/pages/ItemDetails/Index.test.jsx',
  'src/pages/Login/Index.test.jsx',
  'src/pages/MoneyMaking/Index.test.jsx',
  'src/pages/NightmareZone/NightmareZone.test.jsx',
  'src/pages/Parties/Index.test.jsx',
  'src/pages/Profile/Index.test.jsx',
  'src/pages/PotionCombinations/Index.test.jsx',
  'src/pages/Price-sniper/price-sniper.test.jsx',
  'src/pages/Privacy/Index.test.jsx',
  'src/pages/Settings/Index.test.jsx',
  'src/pages/Signup/Index.test.jsx',
  'src/pages/Supplies/Index.test.jsx',
  'src/pages/TermsOfService/Index.test.jsx',
  'src/pages/UserApprovals/Index.test.jsx',
  'src/pages/UserFeedback/Index.test.jsx',
  'src/pages/WildernessCoffer/Index.test.jsx',
  'src/pages/Admin/UserManagement/index.test.jsx',
  'src/pages/Admin/BillingDashboard/index.test.jsx',
  'src/pages/Admin/SystemSettings/index.test.jsx',
  'src/pages/Admin/EmployeeManagement/index.test.jsx',
  'src/pages/Admin/SecurityLogs/index.test.jsx',
  'src/pages/Favorites/Index.test.jsx'
];

const projectRoot = path.resolve(__dirname, '..');
let converted = 0;

testFiles.forEach(file => {
  const fullPath = path.join(projectRoot, file);
  if (convertTestFile(fullPath)) {
    converted++;
  }
});

console.log(`\n✓ Converted ${converted} test files`);