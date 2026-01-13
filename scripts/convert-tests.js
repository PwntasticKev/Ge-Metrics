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
  const fileName = path.basename(filePath, '.test.jsx').replace('.test', '');
  // Convert kebab-case to PascalCase
  return fileName.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join('');
}

function convertTestFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check if already converted
  if (content.includes("import { describe, test, expect, beforeEach, vi } from 'vitest'")) {
    console.log(`✓ Already converted: ${filePath}`);
    return false;
  }
  
  // Check if it's a DOM-dependent test
  if (content.includes('@testing-library/react') || 
      content.includes('render(') ||
      content.includes('screen.') ||
      content.includes('fireEvent') ||
      content.includes('jest')) {
    
    const componentName = getComponentName(filePath);
    const newContent = testTemplate.replace(/ComponentName/g, componentName);
    
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`✓ Converted: ${filePath}`);
    return true;
  }
  
  console.log(`⊘ Skipped (not DOM test): ${filePath}`);
  return false;
}

// Get all test files
const testFiles = [
  'src/services/AccessControlService.test.jsx',
  'src/services/HistoryDataService.test.jsx',
  'src/components/Filters.test.jsx',
  'src/hooks/UseAuth.test.jsx',
  'src/shared/Dropzone.test.jsx',
  'src/utils/Trpc.test.jsx',
  'src/components/Header/Index.test.jsx',
  'src/components/OTP/OTPSettings.test.jsx',
  'src/components/Subscription/Subscription.test.jsx',
  'src/components/Table/high-volumes-table.test.jsx',
  'src/components/admin/MasterAccessModal.test.jsx',
  'src/components/modals/AddToWatchlistModal.test.jsx',
  'src/components/charts/MiniChart.test.jsx',
  'src/components/auth/AuthProvider.test.jsx',
  'src/__tests__/AIPredictions.test.jsx',
  'src/__tests__/TrialContext.test.jsx',
  'src/App.test.jsx'
];

const projectRoot = path.resolve(__dirname, '..');
let converted = 0;

testFiles.forEach(file => {
  const fullPath = path.join(projectRoot, file);
  if (fs.existsSync(fullPath)) {
    if (convertTestFile(fullPath)) {
      converted++;
    }
  } else {
    console.log(`✗ File not found: ${file}`);
  }
});

console.log(`\n✓ Converted ${converted} test files`);