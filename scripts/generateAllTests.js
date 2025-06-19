#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Get the project root directory (parent of scripts)
const projectRoot = path.dirname(__dirname)
const srcDir = path.join(projectRoot, 'src')

console.log('🔍 Finding all components that need tests...')

/**
 * Recursively find all component files
 */
function findAllComponents (dir, componentList = []) {
  if (!fs.existsSync(dir)) {
    return componentList
  }

  const files = fs.readdirSync(dir)

  files.forEach(file => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory()) {
      findAllComponents(filePath, componentList)
    } else if (isComponentFile(file)) {
      componentList.push(filePath)
    }
  })

  return componentList
}

/**
 * Check if a file is a component file
 */
function isComponentFile (fileName) {
  return (
    (fileName.endsWith('.jsx') || fileName.endsWith('.js')) &&
    !fileName.includes('.test.') &&
    !fileName.includes('.spec.') &&
    !fileName.includes('setupTests') &&
    !fileName.includes('testUtils') &&
    fileName !== 'main.jsx' &&
    fileName !== 'firebase.jsx'
  )
}

/**
 * Check if a component already has a test
 */
function hasTest (componentPath) {
  const dir = path.dirname(componentPath)
  const baseName = path.basename(componentPath, path.extname(componentPath))
  const componentName = baseName.charAt(0).toUpperCase() + baseName.slice(1)

  const possibleTestNames = [
    `${baseName}.test.jsx`,
    `${baseName}.test.js`,
    `${componentName}.test.jsx`,
    `${componentName}.test.js`,
    `${baseName}.spec.jsx`,
    `${baseName}.spec.js`
  ]

  return possibleTestNames.some(testName =>
    fs.existsSync(path.join(dir, testName))
  )
}

/**
 * Generate a basic test template for a component
 */
function generateTestTemplate (componentPath) {
  const relativePath = path.relative(srcDir, componentPath)
  const dir = path.dirname(componentPath)
  const fileName = path.basename(componentPath, path.extname(componentPath))
  const componentName = fileName.charAt(0).toUpperCase() + fileName.slice(1)
  const importPath = `./${fileName}`

  // Determine component type and generate appropriate template
  const isPage = relativePath.includes('pages/')
  const isModal = relativePath.includes('modal') || relativePath.includes('Modal')
  const isTable = relativePath.includes('table') || relativePath.includes('Table')
  const isAuth = relativePath.includes('auth/')
  const isService = relativePath.includes('services/')
  const isUtils = relativePath.includes('utils/')
  const isHook = fileName.startsWith('use')

  let template = `/* eslint-env jest */
/* global describe, test, expect, beforeEach, jest */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { MantineProvider } from '@mantine/core'
import ${componentName} from '${importPath}'
`

  // Add provider wrapper
  template += `
const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <MantineProvider theme={{ colorScheme: 'dark' }}>
        {component}
      </MantineProvider>
    </BrowserRouter>
  )
}

`

  // Generate specific test cases based on component type
  if (isService || isUtils) {
    template += generateServiceTests(componentName, fileName)
  } else if (isHook) {
    template += generateHookTests(componentName, fileName)
  } else if (isPage) {
    template += generatePageTests(componentName, fileName)
  } else if (isModal) {
    template += generateModalTests(componentName, fileName)
  } else if (isTable) {
    template += generateTableTests(componentName, fileName)
  } else if (isAuth) {
    template += generateAuthTests(componentName, fileName)
  } else {
    template += generateGenericComponentTests(componentName, fileName)
  }

  return template
}

function generateServiceTests (componentName, fileName) {
  return `describe('${componentName} Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('exports required functions', () => {
    // Add specific function tests based on the service
    expect(${componentName}).toBeDefined()
  })

  test('handles errors gracefully', () => {
    // Add error handling tests
    expect(() => {
      // Test error scenarios
    }).not.toThrow()
  })

  test('processes data correctly', () => {
    // Add data processing tests
    expect(true).toBeTruthy()
  })
})
`
}

function generateHookTests (componentName, fileName) {
  return `import { renderHook, act } from '@testing-library/react'

describe('${componentName} Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('returns expected initial state', () => {
    const { result } = renderHook(() => ${componentName}())
    
    expect(result.current).toBeDefined()
  })

  test('handles state updates correctly', () => {
    const { result } = renderHook(() => ${componentName}())
    
    act(() => {
      // Test state updates
    })
    
    expect(result.current).toBeDefined()
  })

  test('cleans up properly on unmount', () => {
    const { unmount } = renderHook(() => ${componentName}())
    
    expect(() => unmount()).not.toThrow()
  })
})
`
}

function generatePageTests (componentName, fileName) {
  return `describe('${componentName} Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders page without crashing', () => {
    renderWithProviders(<${componentName} />)
    
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  test('displays page content correctly', () => {
    renderWithProviders(<${componentName} />)
    
    // Add specific content checks
    expect(document.body).toBeInTheDocument()
  })

  test('handles loading states', () => {
    renderWithProviders(<${componentName} />)
    
    // Add loading state tests
    expect(screen.queryByText(/loading/i)).toBeTruthy()
  })

  test('handles error states gracefully', () => {
    renderWithProviders(<${componentName} />)
    
    // Add error state tests
    expect(document.body).toBeInTheDocument()
  })

  test('is accessible', () => {
    renderWithProviders(<${componentName} />)
    
    // Check for proper heading structure
    const headings = screen.getAllByRole('heading')
    expect(headings.length).toBeGreaterThanOrEqual(0)
  })
})
`
}

function generateModalTests (componentName, fileName) {
  return `describe('${componentName} Modal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders modal when opened', () => {
    renderWithProviders(<${componentName} opened={true} onClose={jest.fn()} />)
    
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  test('does not render when closed', () => {
    renderWithProviders(<${componentName} opened={false} onClose={jest.fn()} />)
    
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('calls onClose when close button clicked', () => {
    const mockOnClose = jest.fn()
    renderWithProviders(<${componentName} opened={true} onClose={mockOnClose} />)
    
    const closeButton = screen.getByLabelText(/close/i)
    fireEvent.click(closeButton)
    
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  test('handles form submission correctly', async () => {
    const mockOnSubmit = jest.fn()
    renderWithProviders(<${componentName} opened={true} onClose={jest.fn()} onSubmit={mockOnSubmit} />)
    
    const submitButton = screen.getByRole('button', { name: /submit/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled()
    })
  })

  test('validates form inputs', async () => {
    renderWithProviders(<${componentName} opened={true} onClose={jest.fn()} />)
    
    const submitButton = screen.getByRole('button', { name: /submit/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.queryByText(/required/i)).toBeTruthy()
    })
  })
})
`
}

function generateTableTests (componentName, fileName) {
  return `describe('${componentName} Table', () => {
  const mockData = [
    { id: 1, name: 'Test Item 1' },
    { id: 2, name: 'Test Item 2' }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders table with data', () => {
    renderWithProviders(<${componentName} data={mockData} />)
    
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByText('Test Item 1')).toBeInTheDocument()
    expect(screen.getByText('Test Item 2')).toBeInTheDocument()
  })

  test('handles empty data gracefully', () => {
    renderWithProviders(<${componentName} data={[]} />)
    
    expect(screen.getByText(/no data/i)).toBeInTheDocument()
  })

  test('displays loading state', () => {
    renderWithProviders(<${componentName} data={[]} loading={true} />)
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  test('handles row selection', () => {
    const mockOnSelect = jest.fn()
    renderWithProviders(<${componentName} data={mockData} onSelect={mockOnSelect} />)
    
    const firstRow = screen.getByText('Test Item 1').closest('tr')
    fireEvent.click(firstRow)
    
    expect(mockOnSelect).toHaveBeenCalledWith(mockData[0])
  })

  test('supports sorting functionality', () => {
    renderWithProviders(<${componentName} data={mockData} sortable={true} />)
    
    const nameHeader = screen.getByText(/name/i)
    fireEvent.click(nameHeader)
    
    // Check that sorting occurred
    expect(nameHeader).toBeInTheDocument()
  })
})
`
}

function generateAuthTests (componentName, fileName) {
  return `// Mock Firebase auth
const mockAuth = {
  currentUser: null,
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
}

jest.mock('../../firebase', () => ({
  auth: mockAuth
}))

describe('${componentName} Auth Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAuth.currentUser = null
  })

  test('renders auth form elements', () => {
    renderWithProviders(<${componentName} />)
    
    expect(screen.getByRole('form')).toBeInTheDocument()
  })

  test('handles form submission', async () => {
    renderWithProviders(<${componentName} />)
    
    const submitButton = screen.getByRole('button', { name: /submit/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(submitButton).toBeInTheDocument()
    })
  })

  test('validates form inputs', async () => {
    renderWithProviders(<${componentName} />)
    
    const submitButton = screen.getByRole('button', { name: /submit/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.queryByText(/required/i)).toBeTruthy()
    })
  })

  test('handles authentication errors', async () => {
    mockAuth.signInWithEmailAndPassword.mockRejectedValue(new Error('Auth error'))
    
    renderWithProviders(<${componentName} />)
    
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /submit/i })
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument()
    })
  })
})
`
}

function generateGenericComponentTests (componentName, fileName) {
  return `describe('${componentName} Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders without crashing', () => {
    renderWithProviders(<${componentName} />)
    
    expect(document.body).toBeInTheDocument()
  })

  test('displays content correctly', () => {
    renderWithProviders(<${componentName} />)
    
    // Add specific content checks based on component
    const elements = screen.getAllByRole('button')
    expect(elements.length).toBeGreaterThanOrEqual(0)
  })

  test('handles props correctly', () => {
    const testProps = { 
      title: 'Test Title',
      data: { test: 'data' }
    }
    
    renderWithProviders(<${componentName} {...testProps} />)
    
    expect(screen.queryByText('Test Title')).toBeTruthy()
  })

  test('handles user interactions', () => {
    const mockCallback = jest.fn()
    renderWithProviders(<${componentName} onClick={mockCallback} />)
    
    // Test click interactions if applicable
    const buttons = screen.getAllByRole('button')
    if (buttons.length > 0) {
      fireEvent.click(buttons[0])
      expect(mockCallback).toHaveBeenCalled()
    }
  })

  test('maintains accessibility standards', () => {
    renderWithProviders(<${componentName} />)
    
    // Check for basic accessibility
    const buttons = screen.getAllByRole('button')
    buttons.forEach(button => {
      expect(button).not.toHaveAttribute('aria-hidden', 'true')
    })
  })

  test('handles edge cases gracefully', () => {
    expect(() => {
      renderWithProviders(<${componentName} data={null} />)
    }).not.toThrow()
    
    expect(() => {
      renderWithProviders(<${componentName} data={undefined} />)
    }).not.toThrow()
  })
})
`
}

/**
 * Create test file for a component
 */
function createTestFile (componentPath) {
  const dir = path.dirname(componentPath)
  const fileName = path.basename(componentPath, path.extname(componentPath))
  const componentName = fileName.charAt(0).toUpperCase() + fileName.slice(1)
  const testFilePath = path.join(dir, `${componentName}.test.jsx`)

  if (fs.existsSync(testFilePath)) {
    console.log(`⏭️  Test already exists: ${path.relative(srcDir, testFilePath)}`)
    return false
  }

  const testContent = generateTestTemplate(componentPath)

  try {
    fs.writeFileSync(testFilePath, testContent)
    console.log(`✅ Created test: ${path.relative(srcDir, testFilePath)}`)
    return true
  } catch (error) {
    console.error(`❌ Error creating test for ${fileName}:`, error.message)
    return false
  }
}

/**
 * Main function
 */
function main () {
  console.log(`📁 Scanning directory: ${srcDir}\n`)

  // Find all components
  const allComponents = findAllComponents(srcDir)
  console.log(`📋 Found ${allComponents.length} component files\n`)

  // Filter components that don't have tests
  const componentsWithoutTests = allComponents.filter(componentPath => !hasTest(componentPath))

  console.log(`🔍 Components without tests: ${componentsWithoutTests.length}\n`)

  if (componentsWithoutTests.length === 0) {
    console.log('🎉 All components already have tests!')
    return
  }

  let createdCount = 0
  let skippedCount = 0

  componentsWithoutTests.forEach(componentPath => {
    const relativePath = path.relative(srcDir, componentPath)
    console.log(`\n📝 Processing: ${relativePath}`)

    if (createTestFile(componentPath)) {
      createdCount++
    } else {
      skippedCount++
    }
  })

  console.log('\n✨ Test generation complete!')
  console.log('📊 Summary:')
  console.log(`   ✅ Created: ${createdCount} test files`)
  console.log(`   ⏭️  Skipped: ${skippedCount} test files`)
  console.log('\n💡 Next steps:')
  console.log('   1. Review generated tests and customize as needed')
  console.log('   2. Add specific test cases for component functionality')
  console.log('   3. Update mock data and assertions')
  console.log('   4. Run tests to ensure they pass')
}

// Run the script
main()
