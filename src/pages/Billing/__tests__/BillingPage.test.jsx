import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { vi } from 'vitest'
import BillingPage from '..' // Assuming this is the path to BillingPage component
import { AuthContext } from '../../../contexts/AuthContext'
import { trpc } from '../../../utils/trpc.jsx'
import { useAuth } from '../../../hooks/useAuth'

// Mocking tRPC hooks
vi.mock('../../../utils/trpc.jsx', () => ({
  trpc: {
    billing: {
      getSubscription: {
        useQuery: vi.fn()
      },
      createCheckoutSession: {
        useMutation: vi.fn()
      }
    },
    auth: {
      me: {
        useQuery: vi.fn()
      }
    }
  }
}))

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: vi.fn()
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const original = await vi.importActual('react-router-dom')
  return {
    ...original,
    useNavigate: () => mockNavigate
  }
})

const renderWithProviders = (ui, { authContextProps = {}, subscriptionData = {} } = {}) => {
  trpc.billing.getSubscription.useQuery.mockReturnValue({
    data: subscriptionData,
    isLoading: false
  })
  const createCheckoutSessionMutation = {
    mutateAsync: vi.fn().mockResolvedValue({ url: 'https://stripe.com/session' })
  }
  trpc.billing.createCheckoutSession.useMutation.mockReturnValue(createCheckoutSessionMutation)

  return render(
    <AuthContext.Provider value={{ user: { id: 'user-123' }, isLoading: false, ...authContextProps }}>
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    </AuthContext.Provider>
  )
}

describe('BillingPage', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state initially', () => {
    useAuth.mockReturnValue({ user: null, isLoading: true })
    trpc.billing.getSubscription.useQuery.mockReturnValue({
      data: null,
      isLoading: true
    })
    renderWithProviders(<BillingPage />)
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('shows upgrade button for new users', () => {
    useAuth.mockReturnValue({ user: { id: 'user-123' }, isLoading: false })
    renderWithProviders(<BillingPage />, { subscriptionData: null })
    expect(screen.getByText('Upgrade to Premium')).toBeInTheDocument()
  })

  it('shows activate subscription for trial users', () => {
    useAuth.mockReturnValue({ user: { id: 'user-123' }, isLoading: false })
    renderWithProviders(<BillingPage />, {
      subscriptionData: { status: 'trialing', stripeCustomerId: null }
    })
    expect(screen.getByText('Activate Subscription')).toBeInTheDocument()
  })

  it('shows manage subscription for active users', () => {
    useAuth.mockReturnValue({ user: { id: 'user-123' }, isLoading: false })
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    renderWithProviders(<BillingPage />, {
      subscriptionData: { status: 'active', stripeCustomerId: 'cus_123', stripeCurrentPeriodEnd: tomorrow.toISOString() }
    })
    expect(screen.getByText('Manage Subscription')).toBeInTheDocument()
  })

  it('redirects to stripe checkout when upgrading', async () => {
    useAuth.mockReturnValue({ user: { id: 'user-123' }, isLoading: false })
    const { getByText } = renderWithProviders(<BillingPage />, { subscriptionData: null })
    const upgradeButton = getByText('Upgrade to Premium')
    fireEvent.click(upgradeButton)
    // We need to find a way to test the redirect
  })
})
