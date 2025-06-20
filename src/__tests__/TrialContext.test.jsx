/**
 * TrialContext Tests
 *
 * Tests for the React context that manages trial state
 */

import React from 'react'
import { render, screen, act, waitFor } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { TrialProvider, useTrialContext } from '../contexts/TrialContext'
import trialService from '../services/trialService'

// Mock the trial service
jest.mock('../services/trialService')

// Mock notifications
jest.mock('@mantine/notifications', () => ({
  notifications: {
    show: jest.fn()
  },
  Notifications: ({ children }) => <div>{children}</div>
}))

// Test component that uses the trial context
const TestComponent = () => {
  const {
    trialStatus,
    isTrialActive,
    isTrialExpired,
    daysRemaining,
    initializeTrial,
    endTrial,
    isFeatureAvailable,
    makeApiCall,
    showExpiredModal,
    setShowExpiredModal
  } = useTrialContext()

  return (
    <div>
      <div data-testid="trial-status">{JSON.stringify(trialStatus)}</div>
      <div data-testid="is-active">{isTrialActive.toString()}</div>
      <div data-testid="is-expired">{isTrialExpired.toString()}</div>
      <div data-testid="days-remaining">{daysRemaining}</div>
      <div data-testid="show-modal">{showExpiredModal.toString()}</div>

      <button
        data-testid="init-trial"
        onClick={() => initializeTrial('user123', 'test@example.com')}
      >
        Initialize Trial
      </button>

      <button
        data-testid="end-trial"
        onClick={() => endTrial('upgraded')}
      >
        End Trial
      </button>

      <button
        data-testid="check-feature"
        onClick={() => {
          const available = isFeatureAvailable('aiPredictions')
          screen.getByTestId('feature-result').textContent = available.toString()
        }}
      >
        Check Feature
      </button>

      <div data-testid="feature-result"></div>

      <button
        data-testid="make-api-call"
        onClick={async () => {
          try {
            await makeApiCall(() => Promise.resolve('success'))
            screen.getByTestId('api-result').textContent = 'success'
          } catch (error) {
            screen.getByTestId('api-result').textContent = error.message
          }
        }}
      >
        Make API Call
      </button>

      <div data-testid="api-result"></div>

      <button
        data-testid="toggle-modal"
        onClick={() => setShowExpiredModal(!showExpiredModal)}
      >
        Toggle Modal
      </button>
    </div>
  )
}

const renderWithProviders = (component) => {
  return render(
    <MantineProvider>
      <Notifications />
      <TrialProvider>
        {component}
      </TrialProvider>
    </MantineProvider>
  )
}

describe('TrialContext', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Reset trial service mocks
    trialService.getTrialStatus.mockReturnValue(null)
    trialService.initializeTrial.mockReturnValue({
      userId: 'user123',
      userEmail: 'test@example.com',
      isActive: true,
      daysRemaining: 14,
      hoursRemaining: 336
    })
    trialService.isFeatureAvailable.mockReturnValue(true)
    trialService.checkApiCallAllowed.mockReturnValue({ allowed: true })
    trialService.shouldShowUpgradePrompt.mockReturnValue(false)
  })

  test('should provide trial context values', () => {
    renderWithProviders(<TestComponent />)

    expect(screen.getByTestId('trial-status')).toHaveTextContent('null')
    expect(screen.getByTestId('is-active')).toHaveTextContent('false')
    expect(screen.getByTestId('is-expired')).toHaveTextContent('false')
    expect(screen.getByTestId('days-remaining')).toHaveTextContent('0')
  })

  test('should initialize trial', async () => {
    const mockTrialData = {
      userId: 'user123',
      userEmail: 'test@example.com',
      isActive: true,
      daysRemaining: 14,
      hoursRemaining: 336
    }

    trialService.initializeTrial.mockReturnValue(mockTrialData)

    renderWithProviders(<TestComponent />)

    act(() => {
      screen.getByTestId('init-trial').click()
    })

    await waitFor(() => {
      expect(trialService.initializeTrial).toHaveBeenCalledWith('user123', 'test@example.com')
    })

    expect(screen.getByTestId('trial-status')).toHaveTextContent(JSON.stringify(mockTrialData))
    expect(screen.getByTestId('is-active')).toHaveTextContent('true')
    expect(screen.getByTestId('days-remaining')).toHaveTextContent('14')
  })

  test('should end trial', async () => {
    // First initialize a trial
    const mockTrialData = {
      userId: 'user123',
      userEmail: 'test@example.com',
      isActive: true,
      daysRemaining: 14
    }

    trialService.getTrialStatus.mockReturnValue(mockTrialData)

    renderWithProviders(<TestComponent />)

    act(() => {
      screen.getByTestId('end-trial').click()
    })

    await waitFor(() => {
      expect(trialService.endTrial).toHaveBeenCalledWith('upgraded')
    })
  })

  test('should check feature availability', async () => {
    trialService.isFeatureAvailable.mockReturnValue(true)

    renderWithProviders(<TestComponent />)

    act(() => {
      screen.getByTestId('check-feature').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('feature-result')).toHaveTextContent('true')
    })

    expect(trialService.isFeatureAvailable).toHaveBeenCalledWith('aiPredictions')
  })

  test('should handle API calls with rate limiting', async () => {
    trialService.checkApiCallAllowed.mockReturnValue({ allowed: true })
    trialService.recordApiCall.mockImplementation(() => {})

    renderWithProviders(<TestComponent />)

    await act(async () => {
      screen.getByTestId('make-api-call').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('api-result')).toHaveTextContent('success')
    })

    expect(trialService.checkApiCallAllowed).toHaveBeenCalled()
    expect(trialService.recordApiCall).toHaveBeenCalled()
  })

  test('should block API calls when trial expired', async () => {
    trialService.checkApiCallAllowed.mockReturnValue({
      allowed: false,
      reason: 'Trial expired'
    })

    renderWithProviders(<TestComponent />)

    await act(async () => {
      screen.getByTestId('make-api-call').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('api-result')).toHaveTextContent('Trial expired')
    })
  })

  test('should block API calls when daily limit reached', async () => {
    trialService.checkApiCallAllowed.mockReturnValue({
      allowed: false,
      reason: 'Daily API limit reached',
      limit: 100
    })

    renderWithProviders(<TestComponent />)

    await act(async () => {
      screen.getByTestId('make-api-call').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('api-result')).toHaveTextContent('Daily API limit reached')
    })
  })

  test('should show expired modal when trial expires', async () => {
    const expiredTrialData = {
      userId: 'user123',
      isActive: false,
      isExpired: true,
      daysRemaining: 0
    }

    trialService.getTrialStatus.mockReturnValue(expiredTrialData)

    renderWithProviders(<TestComponent />)

    // Wait for useEffect to run
    await waitFor(() => {
      expect(screen.getByTestId('show-modal')).toHaveTextContent('true')
    })
  })

  test('should control modal visibility', async () => {
    renderWithProviders(<TestComponent />)

    expect(screen.getByTestId('show-modal')).toHaveTextContent('false')

    act(() => {
      screen.getByTestId('toggle-modal').click()
    })

    expect(screen.getByTestId('show-modal')).toHaveTextContent('true')

    act(() => {
      screen.getByTestId('toggle-modal').click()
    })

    expect(screen.getByTestId('show-modal')).toHaveTextContent('false')
  })

  test('should update trial status periodically', async () => {
    jest.useFakeTimers()

    const mockTrialData = {
      userId: 'user123',
      isActive: true,
      daysRemaining: 14
    }

    trialService.getTrialStatus.mockReturnValue(mockTrialData)

    renderWithProviders(<TestComponent />)

    // Fast-forward time by 1 minute
    act(() => {
      jest.advanceTimersByTime(60000)
    })

    await waitFor(() => {
      expect(trialService.getTrialStatus).toHaveBeenCalledTimes(2) // Initial + interval
    })

    jest.useRealTimers()
  })

  test('should show upgrade prompts when appropriate', async () => {
    const mockTrialData = {
      userId: 'user123',
      isActive: true,
      daysRemaining: 1
    }

    trialService.getTrialStatus.mockReturnValue(mockTrialData)
    trialService.shouldShowUpgradePrompt.mockReturnValue(true)
    trialService.getUpgradeMessage.mockReturnValue({
      title: 'Trial Ending Soon',
      message: 'Upgrade now!',
      color: 'red'
    })

    jest.useFakeTimers()

    renderWithProviders(<TestComponent />)

    // Fast-forward past the 2-second delay
    act(() => {
      jest.advanceTimersByTime(3000)
    })

    await waitFor(() => {
      expect(trialService.shouldShowUpgradePrompt).toHaveBeenCalled()
    })

    jest.useRealTimers()
  })

  test('should handle trial context outside provider', () => {
    // Suppress console.error for this test
    const originalError = console.error
    console.error = jest.fn()

    expect(() => {
      render(<TestComponent />)
    }).toThrow('useTrialContext must be used within a TrialProvider')

    console.error = originalError
  })

  test('should handle trial service errors gracefully', async () => {
    trialService.checkApiCallAllowed.mockImplementation(() => {
      throw new Error('Service error')
    })

    renderWithProviders(<TestComponent />)

    await act(async () => {
      screen.getByTestId('make-api-call').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('api-result')).toHaveTextContent('Service error')
    })
  })
})
