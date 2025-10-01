/* eslint-env jest */
/* global describe, test, expect, beforeEach, vi, afterEach */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import Settings from './index'
import { trpc } from '../../utils/trpc.jsx' // Mock this

// Mock the OTPSettings component
vi.mock('../../components/OTP/OTPSettings.jsx', () => ({
  default: function MockOTPSettings ({ user, onUpdate }) {
    return <div data-testid="otp-settings">OTP Settings Component</div>
  }
}))

// Mock tRPC
vi.mock('../../utils/trpc.jsx', () => {
  const mockMeData = {
    data: { name: 'Test User', email: 'test@example.com', id: '1' },
    isLoading: false,
    error: null
  }
  const mockSettingsData = {
    data: {
      emailNotifications: true,
      volumeAlerts: true,
      priceDropAlerts: true,
      cooldownPeriod: 60
    },
    isLoading: false,
    error: null
  }
  const mockUpdateMutation = {
    mutateAsync: vi.fn(),
    isLoading: false
  }

  return {
    trpc: {
      auth: {
        me: {
          useQuery: vi.fn(() => mockMeData)
        }
      },
      settings: {
        get: {
          useQuery: vi.fn(() => mockSettingsData)
        },
        update: {
          useMutation: vi.fn(() => mockUpdateMutation)
        }
      },
      useContext: vi.fn(() => ({
        auth: { me: { invalidate: vi.fn() } },
        settings: { get: { invalidate: vi.fn() } }
      }))
    }
  }
})

const renderWithProviders = (component) => {
  return render(
    <MantineProvider theme={{ colorScheme: 'dark' }}>
      {component}
    </MantineProvider>
  )
}

describe('Settings Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  test('renders settings page with all sections', () => {
    renderWithProviders(<Settings />)

    expect(screen.getByText('User Settings')).toBeInTheDocument()
    expect(screen.getByText('Email Configuration')).toBeInTheDocument()
    expect(screen.getByText('Alert Preferences')).toBeInTheDocument()
  })

  test('shows alert preferences switches', () => {
    renderWithProviders(<Settings />)

    expect(screen.getByRole('switch', { name: /enable email notifications/i })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: /volume dump alerts/i })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: /price drop alerts/i })).toBeInTheDocument()
  })

  test('includes OTP settings component', () => {
    renderWithProviders(<Settings />)
    expect(screen.getByTestId('otp-settings')).toBeInTheDocument()
  })

  test('saves settings when save button clicked', async () => {
    const mockUpdateMutation = trpc.settings.update.useMutation()
    mockUpdateMutation.mutateAsync.mockResolvedValue({ success: true })
    renderWithProviders(<Settings />)

    // Toggle a switch
    const emailSwitch = screen.getByRole('switch', { name: /enable email notifications/i })
    fireEvent.click(emailSwitch)

    // Click save
    const saveButton = screen.getByRole('button', { name: /save settings/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(mockUpdateMutation.mutateAsync).toHaveBeenCalled()
      expect(screen.getByText('Settings saved successfully!')).toBeInTheDocument()
    })

    // Fast-forward time to trigger timeout
    vi.advanceTimersByTime(5000)

    await waitFor(() => {
      expect(screen.queryByText('Settings saved successfully!')).not.toBeInTheDocument()
    })
  })
})
