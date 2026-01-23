import React, { Component, ReactNode } from 'react'
import {
  Container,
  Paper,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Alert,
  Code,
  Collapse,
  ThemeIcon,
  Divider,
  ActionIcon,
  Tooltip
} from '@mantine/core'
import {
  IconAlertTriangle,
  IconRefresh,
  IconHome,
  IconBug,
  IconChevronDown,
  IconChevronUp,
  IconCopy,
  IconExternalLink
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'

interface ErrorInfo {
  componentStack: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string
  showDetails: boolean
  retryCount: number
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo, errorId: string) => void
  maxRetries?: number
  level?: 'page' | 'component' | 'section'
}

/**
 * Generate a unique error ID for tracking and debugging
 */
function generateErrorId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `err_${timestamp}_${random}`
}

/**
 * Get user-friendly error message based on error type
 */
function getUserFriendlyMessage(error: Error): string {
  const errorMessage = error.message.toLowerCase()
  
  // Network errors
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return 'Connection issue detected. Please check your internet connection and try again.'
  }
  
  // Rate limiting
  if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
    return 'You\'re making requests too quickly. Please wait a moment and try again.'
  }
  
  // Authentication errors
  if (errorMessage.includes('unauthorized') || errorMessage.includes('forbidden')) {
    return 'Authentication expired. Please refresh the page or log in again.'
  }
  
  // Subscription errors
  if (errorMessage.includes('subscription') || errorMessage.includes('premium')) {
    return 'This feature requires an active subscription. Please check your billing status.'
  }
  
  // Chunk load errors (common in React apps)
  if (errorMessage.includes('loading chunk') || errorMessage.includes('unexpected token')) {
    return 'App update detected. Please refresh the page to get the latest version.'
  }
  
  // Generic fallback
  return 'An unexpected error occurred. Our team has been notified.'
}

/**
 * Enhanced Error Boundary with user-friendly messages, retry logic, and error reporting
 */
export class AppErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null

  constructor(props: ErrorBoundaryProps) {
    super(props)
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      showDetails: false,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: generateErrorId(),
      retryCount: 0
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorId = this.state.errorId
    
    // Log error to console for development
    console.error(`[ErrorBoundary:${errorId}] Caught error:`, error, errorInfo)
    
    this.setState({
      error,
      errorInfo
    })

    // Report error to analytics/monitoring
    this.reportError(error, errorInfo, errorId)
    
    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo, errorId)
    }
  }

  private reportError = async (error: Error, errorInfo: ErrorInfo, errorId: string) => {
    try {
      // Get additional context
      const context = {
        errorId,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        userId: (window as any).userId || null, // If you store user ID globally
        level: this.props.level || 'component',
        retryCount: this.state.retryCount,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      }

      // Log to browser console with structured data
      console.groupCollapsed(`🚨 Error Report: ${errorId}`)
      console.error('Error:', error)
      console.error('Component Stack:', errorInfo.componentStack)
      console.log('Context:', context)
      console.groupEnd()

      // TODO: Send to analytics service when implemented
      // analytics.reportError({ error, context })
      
      // TODO: Send to admin dashboard via WebSocket when implemented
      // websocket.send('error_report', { error: error.message, context })
      
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError)
    }
  }

  private handleRetry = () => {
    const { maxRetries = 3 } = this.props
    
    if (this.state.retryCount < maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: '',
        showDetails: false,
        retryCount: prevState.retryCount + 1
      }))
      
      notifications.show({
        title: 'Retrying...',
        message: `Attempt ${this.state.retryCount + 1} of ${maxRetries}`,
        color: 'blue',
        autoClose: 3000
      })
    }
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      showDetails: false,
      retryCount: 0
    })
  }

  private handleRefresh = () => {
    window.location.reload()
  }

  private handleGoHome = () => {
    window.location.href = '/'
  }

  private copyErrorDetails = () => {
    const { error, errorInfo, errorId } = this.state
    const errorDetails = `
Error ID: ${errorId}
Time: ${new Date().toLocaleString()}
URL: ${window.location.href}
Error: ${error?.message}
Stack: ${error?.stack}
Component Stack: ${errorInfo?.componentStack}
    `.trim()

    navigator.clipboard.writeText(errorDetails).then(() => {
      notifications.show({
        title: 'Copied!',
        message: 'Error details copied to clipboard',
        color: 'green',
        autoClose: 3000
      })
    }).catch(() => {
      notifications.show({
        title: 'Copy failed',
        message: 'Please copy the error details manually',
        color: 'red',
        autoClose: 3000
      })
    })
  }

  private reportBug = () => {
    const { errorId, error } = this.state
    const subject = `Bug Report: ${error?.message || 'Error'} (${errorId})`
    const body = `Please describe what you were doing when this error occurred:\n\n[Your description here]\n\nError ID: ${errorId}\nTime: ${new Date().toLocaleString()}\nURL: ${window.location.href}`
    
    const mailtoUrl = `mailto:support@ge-metrics.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(mailtoUrl)
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    // Use custom fallback if provided
    if (this.props.fallback) {
      return this.props.fallback
    }

    const { error, errorId, showDetails, retryCount } = this.state
    const { maxRetries = 3, level = 'component' } = this.props
    const canRetry = retryCount < maxRetries
    const userMessage = error ? getUserFriendlyMessage(error) : 'Something went wrong'

    return (
      <Container size="sm" py="xl" style={{ minHeight: '400px' }}>
        <Paper shadow="xl" p="xl" radius="md" withBorder>
          <Stack spacing="lg" align="center">
            {/* Error Icon */}
            <ThemeIcon size={80} radius="xl" color="red" variant="light">
              <IconAlertTriangle size={40} />
            </ThemeIcon>

            {/* Error Title */}
            <Title order={2} align="center" color="red">
              {level === 'page' ? 'Page Error' : 'Something Went Wrong'}
            </Title>

            {/* User-friendly message */}
            <Alert color="red" icon={<IconAlertTriangle size={16} />} style={{ width: '100%' }}>
              <Text size="sm">{userMessage}</Text>
            </Alert>

            {/* Error ID for support */}
            <Text size="xs" color="dimmed" align="center">
              Error ID: <Code>{errorId}</Code>
            </Text>

            {/* Action buttons */}
            <Group spacing="md">
              {canRetry && (
                <Button 
                  leftIcon={<IconRefresh size={16} />}
                  onClick={this.handleRetry}
                  color="blue"
                  variant="light"
                >
                  Try Again ({maxRetries - retryCount} left)
                </Button>
              )}
              
              <Button
                leftIcon={<IconRefresh size={16} />}
                onClick={this.handleRefresh}
                color="gray"
                variant="outline"
              >
                Refresh Page
              </Button>
              
              <Button
                leftIcon={<IconHome size={16} />}
                onClick={this.handleGoHome}
                color="gray"
                variant="outline"
              >
                Go Home
              </Button>
            </Group>

            <Divider style={{ width: '100%' }} />

            {/* Support actions */}
            <Group spacing="md">
              <Button
                leftIcon={<IconBug size={16} />}
                onClick={this.reportBug}
                color="orange"
                variant="light"
                size="sm"
              >
                Report Bug
              </Button>
              
              <Tooltip label="Copy error details">
                <ActionIcon
                  onClick={this.copyErrorDetails}
                  variant="light"
                  color="gray"
                  size="lg"
                >
                  <IconCopy size={16} />
                </ActionIcon>
              </Tooltip>
              
              <Tooltip label="Toggle error details">
                <ActionIcon
                  onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                  variant="light"
                  color="gray"
                  size="lg"
                >
                  {showDetails ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                </ActionIcon>
              </Tooltip>
            </Group>

            {/* Technical details (collapsible) */}
            <Collapse in={showDetails} style={{ width: '100%' }}>
              <Stack spacing="md">
                <Text size="sm" weight={600} color="dimmed">Technical Details:</Text>
                
                <Code block style={{ fontSize: '12px', maxHeight: '200px', overflow: 'auto' }}>
                  {error?.stack || 'No stack trace available'}
                </Code>
                
                {this.state.errorInfo && (
                  <>
                    <Text size="sm" weight={600} color="dimmed">Component Stack:</Text>
                    <Code block style={{ fontSize: '12px', maxHeight: '150px', overflow: 'auto' }}>
                      {this.state.errorInfo.componentStack}
                    </Code>
                  </>
                )}
              </Stack>
            </Collapse>

            {/* Development helpers */}
            {process.env.NODE_ENV === 'development' && (
              <Text size="xs" color="dimmed" style={{ marginTop: '20px' }}>
                Development mode: Check console for detailed error information
              </Text>
            )}
          </Stack>
        </Paper>
      </Container>
    )
  }
}

/**
 * Functional component wrapper for easier usage
 */
interface ErrorFallbackProps {
  error: Error
  resetError: () => void
  errorId?: string
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({ 
  error, 
  resetError, 
  errorId = 'unknown' 
}) => {
  return (
    <AppErrorBoundary 
      fallback={
        <Container size="sm" py="xl">
          <Text align="center">Something went wrong. Error ID: {errorId}</Text>
          <Button onClick={resetError} mt="md">Try Again</Button>
        </Container>
      }
    >
      <div>Component Error</div>
    </AppErrorBoundary>
  )
}

/**
 * Higher-order component for wrapping components with error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WithErrorBoundaryComponent = (props: P) => (
    <AppErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </AppErrorBoundary>
  )
  
  WithErrorBoundaryComponent.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`
  
  return WithErrorBoundaryComponent
}

export default AppErrorBoundary