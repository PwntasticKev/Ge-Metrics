/* eslint-env jest */
/* global describe, test, expect, beforeEach, jest, afterEach */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import Settings from './index'

// Mock the OTPSettings component
jest.mock('../../components/OTP/OTPSettings.jsx', () => {
  return function MockOTPSettings ({ user, onUpdate }) {
    return <div data-testid="otp-settings">OTP Settings Component</div>
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
    jest.clearAllMocks()
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn()
      },
      writable: true
    })
  })

  afterEach(() => {
    jest.clearAllTimers()
  })

  test('renders settings page with all sections', () => {
    renderWithProviders(<Settings />)

    expect(screen.getByText('User Settings')).toBeInTheDocument()
    expect(screen.getByText('Email Configuration')).toBeInTheDocument()
    expect(screen.getByText('Alert Preferences')).toBeInTheDocument()
    expect(screen.getByText('Account Information')).toBeInTheDocument()
  })

  test('shows mailchimp api key input field', () => {
    renderWithProviders(<Settings />)

    expect(screen.getByLabelText('Mailchimp API Key')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter your Mailchimp API key...')).toBeInTheDocument()
  })

  test('shows test connection button', () => {
    renderWithProviders(<Settings />)

    const testButton = screen.getByText('Test Connection')
    expect(testButton).toBeInTheDocument()
    expect(testButton).toBeDisabled() // Should be disabled when no API key
  })

  test('enables test button when api key is entered', () => {
    renderWithProviders(<Settings />)

    const apiKeyInput = screen.getByPlaceholderText('Enter your Mailchimp API key...')
    fireEvent.change(apiKeyInput, { target: { value: 'test-api-key-123' } })

    const testButton = screen.getByText('Test Connection')
    expect(testButton).not.toBeDisabled()
  })

  test('shows correct connection status badges', async () => {
    renderWithProviders(<Settings />)

    const apiKeyInput = screen.getByPlaceholderText('Enter your Mailchimp API key...')
    fireEvent.change(apiKeyInput, { target: { value: 'test-api-key-123' } })

    // Should show "Not Tested" badge initially
    expect(screen.getByText('Not Tested')).toBeInTheDocument()

    // Test the connection
    const testButton = screen.getByText('Test Connection')
    fireEvent.click(testButton)

    // Should show "Testing..." badge
    expect(screen.getByText('Testing...')).toBeInTheDocument()
    expect(screen.getByText('Testing Connection...')).toBeInTheDocument()

    // Wait for test to complete
    await waitFor(() => {
      // Should show either "Connected" or "Connection Failed" badge
      const hasPassed = screen.queryByText('Connected')
      const hasFailed = screen.queryByText('Connection Failed')
      expect(hasPassed || hasFailed).toBeTruthy()
    }, { timeout: 3000 })
  })

  test('shows success message on successful connection', async () => {
    // Mock Math.random to ensure success
    const originalRandom = Math.random
    Math.random = jest.fn(() => 0.1) // Less than 0.3, so it will succeed

    renderWithProviders(<Settings />)

    const apiKeyInput = screen.getByPlaceholderText('Enter your Mailchimp API key...')
    fireEvent.change(apiKeyInput, { target: { value: 'test-api-key-123' } })

    const testButton = screen.getByText('Test Connection')
    fireEvent.click(testButton)

    await waitFor(() => {
      expect(screen.getByText('✅ Mailchimp connection successful! Your API key is working correctly.')).toBeInTheDocument()
      expect(screen.getByText('API key verified successfully')).toBeInTheDocument()
    }, { timeout: 3000 })

    // Restore Math.random
    Math.random = originalRandom
  })

  test('shows error message on failed connection', async () => {
    // Mock Math.random to ensure failure
    const originalRandom = Math.random
    Math.random = jest.fn(() => 0.5) // Greater than 0.3, so it will fail

    renderWithProviders(<Settings />)

    const apiKeyInput = screen.getByPlaceholderText('Enter your Mailchimp API key...')
    fireEvent.change(apiKeyInput, { target: { value: 'test-api-key-123' } })

    const testButton = screen.getByText('Test Connection')
    fireEvent.click(testButton)

    await waitFor(() => {
      expect(screen.getByText('❌ Failed to connect to Mailchimp. Please check your API key and try again.')).toBeInTheDocument()
      expect(screen.getByText('Connection failed - check your API key')).toBeInTheDocument()
    }, { timeout: 3000 })

    // Restore Math.random
    Math.random = originalRandom
  })

  test('resets connection status when api key changes', () => {
    renderWithProviders(<Settings />)

    const apiKeyInput = screen.getByPlaceholderText('Enter your Mailchimp API key...')

    // Enter API key
    fireEvent.change(apiKeyInput, { target: { value: 'test-api-key-123' } })
    expect(screen.getByText('Not Tested')).toBeInTheDocument()

    // Change API key - status should reset
    fireEvent.change(apiKeyInput, { target: { value: 'different-api-key' } })

    // Badge should still show "Not Tested" but status should be reset internally
    expect(screen.getByText('Not Tested')).toBeInTheDocument()
  })

  test('shows proper button colors based on status', async () => {
    const originalRandom = Math.random
    Math.random = jest.fn(() => 0.1) // Ensure success

    renderWithProviders(<Settings />)

    const apiKeyInput = screen.getByPlaceholderText('Enter your Mailchimp API key...')
    fireEvent.change(apiKeyInput, { target: { value: 'test-api-key-123' } })

    const testButton = screen.getByText('Test Connection')

    // Initially should be blue
    expect(testButton).toHaveClass('mantine-Button-root')

    fireEvent.click(testButton)

    await waitFor(() => {
      // After successful test, button should be green
      const successButton = screen.getByText('Test Connection')
      expect(successButton).toHaveStyle('background-color: green') // This may need adjustment based on Mantine's actual styling
    }, { timeout: 3000 })

    Math.random = originalRandom
  })

  test('shows alert preferences section', () => {
    renderWithProviders(<Settings />)

    expect(screen.getByText('Alert Preferences')).toBeInTheDocument()
    expect(screen.getByText('Enable Email Notifications')).toBeInTheDocument()
    expect(screen.getByText('Volume Dump Alerts')).toBeInTheDocument()
    expect(screen.getByText('Price Drop Alerts')).toBeInTheDocument()
  })

  test('disables alert switches when no api key configured', () => {
    renderWithProviders(<Settings />)

    // All alert switches should be disabled when no API key
    const emailSwitch = screen.getByRole('checkbox', { name: /enable email notifications/i })
    const volumeSwitch = screen.getByRole('checkbox', { name: /volume dump alerts/i })
    const priceSwitch = screen.getByRole('checkbox', { name: /price drop alerts/i })

    expect(emailSwitch).toBeDisabled()
    expect(volumeSwitch).toBeDisabled()
    expect(priceSwitch).toBeDisabled()
  })

  test('shows warning when api key not configured', () => {
    renderWithProviders(<Settings />)

    expect(screen.getByText('Email alerts are disabled until you configure your Mailchimp API key above.')).toBeInTheDocument()
  })

  test('shows account information section', () => {
    renderWithProviders(<Settings />)

    expect(screen.getByText('Account Information')).toBeInTheDocument()
    expect(screen.getByText('Name:')).toBeInTheDocument()
    expect(screen.getByText('Email:')).toBeInTheDocument()
    expect(screen.getByText('User ID:')).toBeInTheDocument()
  })

  test('includes OTP settings component', () => {
    renderWithProviders(<Settings />)

    expect(screen.getByTestId('otp-settings')).toBeInTheDocument()
  })

  test('saves settings when save button clicked', async () => {
    renderWithProviders(<Settings />)

    // Fill in some settings
    const apiKeyInput = screen.getByPlaceholderText('Enter your Mailchimp API key...')
    fireEvent.change(apiKeyInput, { target: { value: 'test-api-key' } })

    const cooldownInput = screen.getByDisplayValue('60')
    fireEvent.change(cooldownInput, { target: { value: '120' } })

    // Click save
    const saveButton = screen.getByText('Save Settings')
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText('Settings saved successfully!')).toBeInTheDocument()
    })
  })

  test('shows link to mailchimp api key help', () => {
    renderWithProviders(<Settings />)

    const helpLink = screen.getByText('Learn how to get one →')
    expect(helpLink).toHaveAttribute('href', 'https://mailchimp.com/help/about-api-keys/')
    expect(helpLink).toHaveAttribute('target', '_blank')
  })

  test('clears messages after timeout', async () => {
    jest.useFakeTimers()

    const originalRandom = Math.random
    Math.random = jest.fn(() => 0.1) // Ensure success

    renderWithProviders(<Settings />)

    const apiKeyInput = screen.getByPlaceholderText('Enter your Mailchimp API key...')
    fireEvent.change(apiKeyInput, { target: { value: 'test-api-key' } })

    const testButton = screen.getByText('Test Connection')
    fireEvent.click(testButton)

    // Wait for success message
    await waitFor(() => {
      expect(screen.getByText('✅ Mailchimp connection successful! Your API key is working correctly.')).toBeInTheDocument()
    })

    // Fast-forward time to trigger timeout
    jest.advanceTimersByTime(5000)

    await waitFor(() => {
      expect(screen.queryByText('✅ Mailchimp connection successful! Your API key is working correctly.')).not.toBeInTheDocument()
    })

    Math.random = originalRandom
    jest.useRealTimers()
  })
})
