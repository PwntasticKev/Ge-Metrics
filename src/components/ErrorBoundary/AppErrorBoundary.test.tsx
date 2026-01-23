import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { AppErrorBoundary, withErrorBoundary } from './AppErrorBoundary'

// Mock Mantine hooks
vi.mock('@mantine/hooks', () => ({
  useMediaQuery: vi.fn(() => false)
}))

// Mock window.matchMedia for media queries
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock console methods to avoid noise in test output
const originalConsoleError = console.error
const originalConsoleGroupCollapsed = console.groupCollapsed
const originalConsoleGroupEnd = console.groupEnd
const originalConsoleLog = console.log

beforeEach(() => {
  console.error = vi.fn()
  console.groupCollapsed = vi.fn()
  console.groupEnd = vi.fn()
  console.log = vi.fn()
})

afterEach(() => {
  console.error = originalConsoleError
  console.groupCollapsed = originalConsoleGroupCollapsed
  console.groupEnd = originalConsoleGroupEnd
  console.log = originalConsoleLog
  vi.clearAllMocks()
})

// Test component that throws an error
const ThrowError: React.FC<{ shouldThrow?: boolean; errorType?: string }> = ({ 
  shouldThrow = false, 
  errorType = 'generic' 
}) => {
  if (shouldThrow) {
    switch (errorType) {
      case 'network':
        throw new Error('Network error: Failed to fetch data')
      case 'rate_limit':
        throw new Error('Rate limit exceeded: Too many requests')
      case 'auth':
        throw new Error('Unauthorized access')
      case 'subscription':
        throw new Error('Premium subscription required')
      case 'chunk':
        throw new Error('Loading chunk failed')
      default:
        throw new Error('Test error message')
    }
  }
  return <div>No error</div>
}

// Wrapper component for testing
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <MantineProvider>
    <Notifications />
    {children}
  </MantineProvider>
)

describe.skip('AppErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <TestWrapper>
        <AppErrorBoundary>
          <ThrowError shouldThrow={false} />
        </AppErrorBoundary>
      </TestWrapper>
    )
    
    expect(screen.getByText('No error')).toBeInTheDocument()
  })

  it('catches errors and displays error boundary UI', () => {
    render(
      <TestWrapper>
        <AppErrorBoundary>
          <ThrowError shouldThrow={true} />
        </AppErrorBoundary>
      </TestWrapper>
    )
    
    expect(screen.getByText('Something Went Wrong')).toBeInTheDocument()
    expect(screen.getByText('An unexpected error occurred. Our team has been notified.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /refresh page/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /go home/i })).toBeInTheDocument()
  })

  it('displays user-friendly message for network errors', () => {
    render(
      <TestWrapper>
        <AppErrorBoundary>
          <ThrowError shouldThrow={true} errorType="network" />
        </AppErrorBoundary>
      </TestWrapper>
    )
    
    expect(screen.getByText(/connection issue detected/i)).toBeInTheDocument()
  })

  it('displays user-friendly message for rate limit errors', () => {
    render(
      <TestWrapper>
        <AppErrorBoundary>
          <ThrowError shouldThrow={true} errorType="rate_limit" />
        </AppErrorBoundary>
      </TestWrapper>
    )
    
    expect(screen.getByText(/you're making requests too quickly/i)).toBeInTheDocument()
  })

  it('displays user-friendly message for auth errors', () => {
    render(
      <TestWrapper>
        <AppErrorBoundary>
          <ThrowError shouldThrow={true} errorType="auth" />
        </AppErrorBoundary>
      </TestWrapper>
    )
    
    expect(screen.getByText(/authentication expired/i)).toBeInTheDocument()
  })

  it('displays user-friendly message for subscription errors', () => {
    render(
      <TestWrapper>
        <AppErrorBoundary>
          <ThrowError shouldThrow={true} errorType="subscription" />
        </AppErrorBoundary>
      </TestWrapper>
    )
    
    expect(screen.getByText(/this feature requires an active subscription/i)).toBeInTheDocument()
  })

  it('displays user-friendly message for chunk load errors', () => {
    render(
      <TestWrapper>
        <AppErrorBoundary>
          <ThrowError shouldThrow={true} errorType="chunk" />
        </AppErrorBoundary>
      </TestWrapper>
    )
    
    expect(screen.getByText(/app update detected/i)).toBeInTheDocument()
  })

  it('calls onError callback when error occurs', () => {
    const onError = vi.fn()
    
    render(
      <TestWrapper>
        <AppErrorBoundary onError={onError}>
          <ThrowError shouldThrow={true} />
        </AppErrorBoundary>
      </TestWrapper>
    )
    
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      }),
      expect.stringMatching(/^err_/)
    )
  })

  it('shows error details when toggle is clicked', async () => {
    render(
      <TestWrapper>
        <AppErrorBoundary>
          <ThrowError shouldThrow={true} />
        </AppErrorBoundary>
      </TestWrapper>
    )
    
    const toggleButton = screen.getByRole('button', { name: /toggle error details/i })
    fireEvent.click(toggleButton)
    
    await waitFor(() => {
      expect(screen.getByText('Technical Details:')).toBeInTheDocument()
    })
  })

  it('handles retry functionality', async () => {
    const TestComponent = () => {
      const [shouldThrow, setShouldThrow] = React.useState(true)
      
      React.useEffect(() => {
        // Simulate recovery after retry
        const timer = setTimeout(() => setShouldThrow(false), 100)
        return () => clearTimeout(timer)
      }, [])
      
      return <ThrowError shouldThrow={shouldThrow} />
    }
    
    render(
      <TestWrapper>
        <AppErrorBoundary maxRetries={2}>
          <TestComponent />
        </AppErrorBoundary>
      </TestWrapper>
    )
    
    const retryButton = screen.getByRole('button', { name: /try again \(2 left\)/i })
    fireEvent.click(retryButton)
    
    // After retry, the component should recover
    await waitFor(() => {
      expect(screen.queryByText('Something Went Wrong')).not.toBeInTheDocument()
    })
  })

  it('disables retry button when max retries reached', () => {
    const { rerender } = render(
      <TestWrapper>
        <AppErrorBoundary maxRetries={1}>
          <ThrowError shouldThrow={true} />
        </AppErrorBoundary>
      </TestWrapper>
    )
    
    const retryButton = screen.getByRole('button', { name: /try again \(1 left\)/i })
    fireEvent.click(retryButton)
    
    // Re-render to trigger error again (simulating retry failure)
    rerender(
      <TestWrapper>
        <AppErrorBoundary maxRetries={1}>
          <ThrowError shouldThrow={true} />
        </AppErrorBoundary>
      </TestWrapper>
    )
    
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument()
  })

  it('displays custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>
    
    render(
      <TestWrapper>
        <AppErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </AppErrorBoundary>
      </TestWrapper>
    )
    
    expect(screen.getByText('Custom error message')).toBeInTheDocument()
    expect(screen.queryByText('Something Went Wrong')).not.toBeInTheDocument()
  })

  it('shows page-level error message when level is "page"', () => {
    render(
      <TestWrapper>
        <AppErrorBoundary level="page">
          <ThrowError shouldThrow={true} />
        </AppErrorBoundary>
      </TestWrapper>
    )
    
    expect(screen.getByText('Page Error')).toBeInTheDocument()
  })

  it('copies error details to clipboard when copy button is clicked', async () => {
    // Mock clipboard API
    const mockWriteText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText
      }
    })
    
    render(
      <TestWrapper>
        <AppErrorBoundary>
          <ThrowError shouldThrow={true} />
        </AppErrorBoundary>
      </TestWrapper>
    )
    
    const copyButton = screen.getByRole('button', { name: /copy error details/i })
    fireEvent.click(copyButton)
    
    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(
        expect.stringContaining('Error ID:')
      )
    })
  })

  it('generates unique error IDs for different errors', () => {
    const onError1 = vi.fn()
    const onError2 = vi.fn()
    
    const { rerender } = render(
      <TestWrapper>
        <AppErrorBoundary onError={onError1}>
          <ThrowError shouldThrow={true} />
        </AppErrorBoundary>
      </TestWrapper>
    )
    
    rerender(
      <TestWrapper>
        <AppErrorBoundary onError={onError2}>
          <ThrowError shouldThrow={true} />
        </AppErrorBoundary>
      </TestWrapper>
    )
    
    expect(onError1).toHaveBeenCalledWith(
      expect.any(Error),
      expect.any(Object),
      expect.stringMatching(/^err_/)
    )
    
    expect(onError2).toHaveBeenCalledWith(
      expect.any(Error),
      expect.any(Object),
      expect.stringMatching(/^err_/)
    )
    
    // Error IDs should be different
    const errorId1 = onError1.mock.calls[0][2]
    const errorId2 = onError2.mock.calls[0][2]
    expect(errorId1).not.toBe(errorId2)
  })
})

describe.skip('withErrorBoundary HOC', () => {
  it('wraps component with error boundary', () => {
    const WrappedComponent = withErrorBoundary(ThrowError)
    
    render(
      <TestWrapper>
        <WrappedComponent shouldThrow={true} />
      </TestWrapper>
    )
    
    expect(screen.getByText('Something Went Wrong')).toBeInTheDocument()
  })

  it('passes props correctly to wrapped component', () => {
    const TestComponent: React.FC<{ testProp: string }> = ({ testProp }) => (
      <div>{testProp}</div>
    )
    
    const WrappedComponent = withErrorBoundary(TestComponent)
    
    render(
      <TestWrapper>
        <WrappedComponent testProp="test value" />
      </TestWrapper>
    )
    
    expect(screen.getByText('test value')).toBeInTheDocument()
  })

  it('accepts error boundary props', () => {
    const onError = vi.fn()
    const WrappedComponent = withErrorBoundary(ThrowError, { 
      onError,
      level: 'page',
      maxRetries: 1 
    })
    
    render(
      <TestWrapper>
        <WrappedComponent shouldThrow={true} />
      </TestWrapper>
    )
    
    expect(screen.getByText('Page Error')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again \(1 left\)/i })).toBeInTheDocument()
    expect(onError).toHaveBeenCalled()
  })
})

// Mock window methods for browser API tests
beforeEach(() => {
  // Mock window.location
  Object.defineProperty(window, 'location', {
    value: {
      href: 'http://localhost:3000/test',
      reload: vi.fn()
    },
    writable: true
  })
  
  // Mock navigator
  Object.defineProperty(navigator, 'userAgent', {
    value: 'Mozilla/5.0 (Test Browser)',
    writable: true
  })
})

describe.skip('Error reporting and browser integration', () => {
  it('includes correct context in error reports', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error')
    
    render(
      <TestWrapper>
        <AppErrorBoundary>
          <ThrowError shouldThrow={true} />
        </AppErrorBoundary>
      </TestWrapper>
    )
    
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\[ErrorBoundary:err_/),
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    )
  })

  it('opens mailto link when report bug is clicked', () => {
    const mockOpen = vi.fn()
    window.open = mockOpen
    
    render(
      <TestWrapper>
        <AppErrorBoundary>
          <ThrowError shouldThrow={true} />
        </AppErrorBoundary>
      </TestWrapper>
    )
    
    const reportButton = screen.getByRole('button', { name: /report bug/i })
    fireEvent.click(reportButton)
    
    expect(mockOpen).toHaveBeenCalledWith(
      expect.stringMatching(/^mailto:support@ge-metrics\.com/)
    )
  })
})