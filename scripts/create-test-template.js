#!/usr/bin/env node

/**
 * Test Template Generator
 * Creates test files with all required test cases
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

function getComponentInfo(componentPath) {
  const basename = path.basename(componentPath);
  const nameWithoutExt = basename.replace(/\.(jsx|tsx)$/, '');
  const dir = path.dirname(componentPath);
  const isTS = componentPath.endsWith('.tsx');
  
  return {
    componentName: nameWithoutExt,
    componentPath,
    testFileName: `${nameWithoutExt}.test.${isTS ? 'tsx' : 'jsx'}`,
    testPath: path.join(dir, `${nameWithoutExt}.test.${isTS ? 'tsx' : 'jsx'}`),
    isTypeScript: isTS
  };
}

function generateTestTemplate(info) {
  const { componentName, componentPath, isTypeScript } = info;
  
  // Read component file to extract props/exports
  let componentContent = '';
  try {
    componentContent = fs.readFileSync(componentPath, 'utf8');
  } catch (error) {
    console.log(`${colors.yellow}⚠️  Could not read component file, using basic template${colors.reset}`);
  }
  
  // Detect if component uses props, state, forms, etc.
  const hasProps = componentContent.includes('props') || componentContent.includes('Props');
  const hasState = componentContent.includes('useState') || componentContent.includes('state');
  const hasForm = componentContent.includes('form') || componentContent.includes('Form');
  const hasTRPC = componentContent.includes('trpc') || componentContent.includes('useQuery') || componentContent.includes('useMutation');
  const hasRouter = componentContent.includes('useNavigate') || componentContent.includes('useRouter');
  
  const template = `import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@/test/utils/test-utils'${hasForm ? `
import userEvent from '@testing-library/user-event'` : ''}${hasTRPC ? `
import { trpc } from '@/utils/trpc'` : ''}${hasRouter ? `
import { useNavigate } from 'react-router-dom'` : ''}
import ${componentName} from './${componentName}'

${hasTRPC ? `// Mock TRPC
vi.mock('@/utils/trpc', () => ({
  trpc: {
    // Add your TRPC mocks here
  }
}))
` : ''}${hasRouter ? `
// Mock React Router
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: vi.fn()
  }
})
` : ''}
/**
 * @component ${componentName}
 * @description Comprehensive test suite for ${componentName} component
 * @coverage 
 *   - Rendering: ⏳
 *   - Props: ⏳
 *   - Loading: ⏳
 *   - Errors: ⏳
 *   - Interactions: ⏳
 *   - Forms: ⏳
 *   - Accessibility: ⏳
 *   - Mobile: ⏳
 *   - API: ⏳
 */
describe('${componentName}', () => {
  ${hasRouter ? `const mockNavigate = vi.fn()` : ''}

  beforeEach(() => {
    vi.clearAllMocks()${hasRouter ? `
    ;(useNavigate as any).mockReturnValue(mockNavigate)` : ''}
  })

  // 1. REQUIRED: Component renders without crashing
  it('renders without crashing', () => {
    render(<${componentName}${hasProps ? ' {...mockProps}' : ''} />)
    
    // Add specific test for main element
    expect(screen.getByTestId('${componentName.toLowerCase()}')).toBeInTheDocument()
    
    // TODO: Update this test based on actual component structure
  })${hasProps ? `

  // 2. REQUIRED: Props handling
  it('handles props correctly', () => {
    const mockProps = {
      // TODO: Add actual props that your component accepts
    }
    
    render(<${componentName} {...mockProps} />)
    
    // TODO: Add assertions for how props affect the rendered output
    expect(screen.getByTestId('${componentName.toLowerCase()}')).toBeInTheDocument()
  })

  it('handles missing optional props', () => {
    render(<${componentName} />)
    
    // Component should render without errors even with no props
    expect(screen.getByTestId('${componentName.toLowerCase()}')).toBeInTheDocument()
  })` : ''}

  // 3. REQUIRED: Loading states (if component shows loading)
  it('shows loading state while fetching data', async () => {
    ${hasTRPC ? `// Mock TRPC query to be loading
    const mockUseQuery = vi.fn().mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null
    })
    
    render(<${componentName}${hasProps ? ' {...mockProps}' : ''} />)
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
    ` : `render(<${componentName}${hasProps ? ' {...mockProps}' : ''} />)
    
    // TODO: Add loading state test if component has loading
    // expect(screen.getByText(/loading/i)).toBeInTheDocument()
    `}
  })

  // 4. REQUIRED: Error handling
  it('handles and displays errors gracefully', async () => {
    ${hasTRPC ? `// Mock TRPC query to have error
    const mockUseQuery = vi.fn().mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Test error message')
    })
    
    render(<${componentName}${hasProps ? ' {...mockProps}' : ''} />)
    
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument()
    })
    ` : `// TODO: Test error handling if component can have errors
    render(<${componentName}${hasProps ? ' {...mockProps}' : ''} />)
    
    // Mock an error state and verify it's handled gracefully
    `}
  })

  // 5. REQUIRED: User interactions
  it('handles user interactions correctly', async () => {
    const user = userEvent.setup()
    render(<${componentName}${hasProps ? ' {...mockProps}' : ''} />)
    
    // TODO: Add tests for buttons, clicks, hovers, etc.
    // Example:
    // const button = screen.getByRole('button', { name: /click me/i })
    // await user.click(button)
    // expect(mockFunction).toHaveBeenCalled()
  })${hasForm ? `

  // 6. REQUIRED: Form handling (if component has forms)
  it('validates form inputs correctly', async () => {
    const user = userEvent.setup()
    render(<${componentName}${hasProps ? ' {...mockProps}' : ''} />)
    
    // TODO: Test form validation
    // Example:
    // const submitButton = screen.getByRole('button', { name: /submit/i })
    // await user.click(submitButton)
    // expect(screen.getByText(/required/i)).toBeInTheDocument()
  })

  it('submits form with valid data', async () => {
    const user = userEvent.setup()
    const mockSubmit = vi.fn()
    
    render(<${componentName} onSubmit={mockSubmit}${hasProps ? ' {...mockProps}' : ''} />)
    
    // TODO: Fill form and submit
    // const input = screen.getByLabelText(/name/i)
    // await user.type(input, 'test value')
    // await user.click(screen.getByRole('button', { name: /submit/i }))
    // expect(mockSubmit).toHaveBeenCalledWith(expectedData)
  })` : ''}

  // 7. REQUIRED: Accessibility
  it('is fully keyboard accessible', async () => {
    const user = userEvent.setup()
    render(<${componentName}${hasProps ? ' {...mockProps}' : ''} />)
    
    // Test keyboard navigation
    await user.tab()
    
    // TODO: Verify focus moves correctly through interactive elements
    // const firstInteractiveElement = screen.getByRole('button')
    // expect(firstInteractiveElement).toHaveFocus()
  })

  it('has proper ARIA labels and roles', () => {
    render(<${componentName}${hasProps ? ' {...mockProps}' : ''} />)
    
    // TODO: Test ARIA attributes
    // expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Close')
    // expect(screen.getByRole('heading')).toHaveAttribute('aria-level', '2')
  })

  it('supports screen readers', () => {
    render(<${componentName}${hasProps ? ' {...mockProps}' : ''} />)
    
    // TODO: Test screen reader support
    // expect(screen.getByLabelText('User menu')).toBeInTheDocument()
  })

  // 8. REQUIRED: Mobile responsiveness
  it('renders correctly on mobile viewport', () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    })
    
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 667,
    })
    
    render(<${componentName}${hasProps ? ' {...mockProps}' : ''} />)
    
    // TODO: Test mobile-specific behavior
    // expect(screen.getByTestId('mobile-menu')).toBeInTheDocument()
  })

  it('handles touch interactions on mobile', async () => {
    const user = userEvent.setup()
    render(<${componentName}${hasProps ? ' {...mockProps}' : ''} />)
    
    // TODO: Test touch events if component handles them
  })${hasTRPC ? `

  // 9. REQUIRED: API Integration (TRPC)
  it('successfully fetches data from API', async () => {
    const mockData = {
      // TODO: Add mock data structure
    }
    
    const mockUseQuery = vi.fn().mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null
    })
    
    render(<${componentName}${hasProps ? ' {...mockProps}' : ''} />)
    
    await waitFor(() => {
      // TODO: Verify data is displayed correctly
      expect(screen.getByText('Expected Data')).toBeInTheDocument()
    })
  })

  it('handles API mutations correctly', async () => {
    const user = userEvent.setup()
    const mockMutation = vi.fn().mockResolvedValue({ success: true })
    
    render(<${componentName}${hasProps ? ' {...mockProps}' : ''} />)
    
    // TODO: Test mutation (create, update, delete operations)
    // await user.click(screen.getByRole('button', { name: /save/i }))
    // expect(mockMutation).toHaveBeenCalledWith(expectedData)
  })` : ''}

  // 10. Component-specific tests
  describe('${componentName} specific functionality', () => {
    it('handles component-specific behavior', () => {
      render(<${componentName}${hasProps ? ' {...mockProps}' : ''} />)
      
      // TODO: Add tests specific to this component's unique features
    })
  })

  // 11. Edge cases
  describe('Edge cases', () => {
    it('handles empty data gracefully', () => {
      render(<${componentName}${hasProps ? ' {...{ ...mockProps, data: [] }}' : ''} />)
      
      // TODO: Test with empty data
    })

    it('handles null/undefined props', () => {
      render(<${componentName}${hasProps ? ' {...{ ...mockProps, someValue: null }}' : ''} />)
      
      // Component should not crash with null values
      expect(screen.getByTestId('${componentName.toLowerCase()}')).toBeInTheDocument()
    })
  })
})

// Test data and mocks
${hasProps ? `const mockProps = {
  // TODO: Add actual props that your component needs
  // Example:
  // title: 'Test Title',
  // onClick: vi.fn(),
  // items: []
}` : ''}
`

  return template;
}

function createTestFile(componentPath) {
  const info = getComponentInfo(componentPath);
  
  // Check if component file exists
  if (!fs.existsSync(componentPath)) {
    console.log(`${colors.red}❌ Component file not found: ${componentPath}${colors.reset}`);
    return false;
  }
  
  // Check if test file already exists
  if (fs.existsSync(info.testPath)) {
    console.log(`${colors.yellow}⚠️  Test file already exists: ${info.testPath}${colors.reset}`);
    console.log(`   Use --force to overwrite`);
    return false;
  }
  
  try {
    const template = generateTestTemplate(info);
    fs.writeFileSync(info.testPath, template);
    
    console.log(`${colors.green}✅ Created test file: ${info.testPath}${colors.reset}`);
    console.log(`${colors.blue}📝 Next steps:${colors.reset}`);
    console.log(`   1. Update TODO comments in the test`);
    console.log(`   2. Add actual prop types and test data`);
    console.log(`   3. Run test: npm run test:watch ${info.testFileName}`);
    console.log(`   4. Make it fail (RED), then implement (GREEN), then refactor`);
    
    return true;
  } catch (error) {
    console.log(`${colors.red}❌ Error creating test file: ${error.message}${colors.reset}`);
    return false;
  }
}

// Main function
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`${colors.blue}Test Template Generator${colors.reset}`);
    console.log(`\nUsage:`);
    console.log(`  npm run test:create <component-path>`);
    console.log(`  npm run test:create src/components/Button/Button.jsx`);
    console.log(`  npm run test:create src/pages/Profile/ProfileModern.jsx`);
    console.log(`\nOptions:`);
    console.log(`  --force    Overwrite existing test file`);
    process.exit(1);
  }
  
  const componentPath = args[0];
  const force = args.includes('--force');
  
  if (force && fs.existsSync(getComponentInfo(componentPath).testPath)) {
    fs.unlinkSync(getComponentInfo(componentPath).testPath);
    console.log(`${colors.yellow}🔄 Existing test file deleted${colors.reset}`);
  }
  
  const success = createTestFile(componentPath);
  
  if (!success) {
    process.exit(1);
  }
}

// Run script
main();