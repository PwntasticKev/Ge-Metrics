/* eslint-env jest */
/* global describe, test, expect, beforeEach, jest */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import SubscriptionModal, { useSubscription } from './index.jsx'

const renderWithProviders = (component) => {
  return render(
    <MantineProvider theme={{ colorScheme: 'dark' }}>
      {component}
    </MantineProvider>
  )
}

describe('SubscriptionModal Component', () => {
  const defaultProps = {
    opened: true,
    onClose: jest.fn(),
    currentPlan: 'free'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders without crashing', () => {
    renderWithProviders(<SubscriptionModal {...defaultProps} />)
    expect(screen.getByText('Upgrade to Premium')).toBeInTheDocument()
  })

  test('displays both plan options', () => {
    renderWithProviders(<SubscriptionModal {...defaultProps} />)

    expect(screen.getByText('Free Tier')).toBeInTheDocument()
    expect(screen.getByText('Premium')).toBeInTheDocument()
    expect(screen.getByText('$3/month')).toBeInTheDocument()
  })

  test('shows premium features correctly', () => {
    renderWithProviders(<SubscriptionModal {...defaultProps} />)

    expect(screen.getByText(/Real-time data updates/)).toBeInTheDocument()
    expect(screen.getByText(/Advanced arbitrage tracking/)).toBeInTheDocument()
    expect(screen.getByText(/Custom price alerts/)).toBeInTheDocument()
  })

  test('shows free tier limitations', () => {
    renderWithProviders(<SubscriptionModal {...defaultProps} />)

    expect(screen.getByText(/No historical data/)).toBeInTheDocument()
    expect(screen.getByText(/Limited market watch access/)).toBeInTheDocument()
    expect(screen.getByText(/No arbitrage tracker/)).toBeInTheDocument()
  })

  test('highlights most popular plan', () => {
    renderWithProviders(<SubscriptionModal {...defaultProps} />)

    expect(screen.getByText('Most Popular')).toBeInTheDocument()
  })

  test('shows secure payment information', () => {
    renderWithProviders(<SubscriptionModal {...defaultProps} />)

    expect(screen.getByText(/Secure Payment/)).toBeInTheDocument()
    expect(screen.getByText(/Stripe/)).toBeInTheDocument()
    expect(screen.getByText(/Cancel anytime/)).toBeInTheDocument()
  })

  test('handles subscription button click', async () => {
    renderWithProviders(<SubscriptionModal {...defaultProps} />)

    const subscribeButton = screen.getByText(/Subscribe Now - \$3\/month/)
    fireEvent.click(subscribeButton)

    await waitFor(() => {
      expect(screen.getByText('Processing...')).toBeInTheDocument()
    })
  })

  test('shows success message after subscription', async () => {
    renderWithProviders(<SubscriptionModal {...defaultProps} />)

    const subscribeButton = screen.getByText(/Subscribe Now - \$3\/month/)
    fireEvent.click(subscribeButton)

    await waitFor(() => {
      expect(screen.getByText('Welcome to Premium! 🎉')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  test('calls onClose when Maybe Later is clicked', () => {
    const mockOnClose = jest.fn()
    renderWithProviders(<SubscriptionModal {...defaultProps} onClose={mockOnClose} />)

    const maybeLaterButton = screen.getByText('Maybe Later')
    fireEvent.click(maybeLaterButton)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  test('does not render when opened is false', () => {
    renderWithProviders(<SubscriptionModal {...defaultProps} opened={false} />)

    expect(screen.queryByText('Upgrade to Premium')).not.toBeInTheDocument()
  })
})

describe('useSubscription Hook', () => {
  test('returns default values', () => {
    const TestComponent = () => {
      const { isSubscribed, plan } = useSubscription()
      return (
        <div>
          <span data-testid="subscription-status">{isSubscribed ? 'subscribed' : 'not-subscribed'}</span>
          <span data-testid="subscription-plan">{plan}</span>
        </div>
      )
    }

    renderWithProviders(<TestComponent />)

    expect(screen.getByTestId('subscription-status')).toHaveTextContent('not-subscribed')
    expect(screen.getByTestId('subscription-plan')).toHaveTextContent('free')
  })

  test('handles localStorage subscription state', () => {
    // Mock localStorage
    const mockLocalStorage = {
      getItem: jest.fn(() => 'true'),
      setItem: jest.fn(),
      removeItem: jest.fn()
    }
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage })

    const TestComponent = () => {
      const { checkSubscriptionStatus, isSubscribed } = useSubscription()
      React.useEffect(() => {
        checkSubscriptionStatus()
      }, [checkSubscriptionStatus])

      return <span data-testid="subscription-status">{isSubscribed ? 'subscribed' : 'not-subscribed'}</span>
    }

    renderWithProviders(<TestComponent />)

    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('premium_subscribed')
  })
})
