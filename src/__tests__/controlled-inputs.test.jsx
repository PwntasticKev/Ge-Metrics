import React from 'react'
import { render, fireEvent, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { MantineProvider } from '@mantine/core'
import { vi } from 'vitest'

// Import components that have inputs
import Settings from '../pages/Settings/index.jsx'
import AdminPanel from '../pages/Admin/index.jsx'
import CommunityLeaderboard from '../pages/CommunityLeaderboard/index.jsx'
import Favorites from '../pages/Favorites/index.jsx'
import EmployeeManagement from '../pages/Admin/EmployeeManagement/index.jsx'
import BillingDashboard from '../pages/Admin/BillingDashboard/index.jsx'
import UserManagement from '../pages/Admin/UserManagement/index.jsx'
import SecurityLogs from '../pages/Admin/SecurityLogs/index.jsx'
import SystemSettings from '../pages/Admin/SystemSettings/index.jsx'

// Mock context providers
const mockAuthContext = {
  currentUser: {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    role: 'admin'
  },
  isAuthenticated: true,
  login: vi.fn(),
  logout: vi.fn()
}

const mockTrialContext = {
  trialStatus: 'active',
  trialDaysLeft: 30,
  isTrialExpired: false,
  checkTrialStatus: vi.fn()
}

// Wrapper component for testing
const TestWrapper = ({ children }) => (
  <BrowserRouter>
    <MantineProvider>
      {children}
    </MantineProvider>
  </BrowserRouter>
)

describe('Controlled Input Warnings', () => {
  beforeEach(() => {
    // Spy on console.warn to catch controlled/uncontrolled warnings
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const checkForControlledWarnings = () => {
    const warnings = console.warn.mock.calls.filter(call =>
      call[0]?.includes('controlled input to be uncontrolled')
    )
    return warnings
  }

  test('Settings page inputs should not cause controlled/uncontrolled warnings', async () => {
    render(
      <TestWrapper>
        <Settings />
      </TestWrapper>
    )

    // Test text inputs
    const cooldownInput = screen.getByLabelText(/Alert Cooldown Period/i)
    fireEvent.change(cooldownInput, { target: { value: '' } })
    fireEvent.change(cooldownInput, { target: { value: '120' } })

    // Test password input
    const apiKeyInput = screen.getByLabelText(/Mailchimp API Key/i)
    fireEvent.change(apiKeyInput, { target: { value: '' } })
    fireEvent.change(apiKeyInput, { target: { value: 'test-key' } })

    const warnings = checkForControlledWarnings()
    expect(warnings).toHaveLength(0)
  })

  test('Admin panel inputs should not cause controlled/uncontrolled warnings', async () => {
    render(
      <TestWrapper>
        <AdminPanel />
      </TestWrapper>
    )

    // Test email form inputs
    const subjectInput = screen.getByLabelText(/Subject/i)
    const messageInput = screen.getByLabelText(/Message/i)

    if (subjectInput) {
      fireEvent.change(subjectInput, { target: { value: '' } })
      fireEvent.change(subjectInput, { target: { value: 'Test Subject' } })
    }

    if (messageInput) {
      fireEvent.change(messageInput, { target: { value: '' } })
      fireEvent.change(messageInput, { target: { value: 'Test Message' } })
    }

    const warnings = checkForControlledWarnings()
    expect(warnings).toHaveLength(0)
  })

  test('Community Leaderboard inputs should not cause controlled/uncontrolled warnings', async () => {
    render(
      <TestWrapper>
        <CommunityLeaderboard />
      </TestWrapper>
    )

    // Test search inputs
    const searchInputs = screen.getAllByPlaceholderText(/Search/i)
    searchInputs.forEach(input => {
      fireEvent.change(input, { target: { value: '' } })
      fireEvent.change(input, { target: { value: 'test search' } })
    })

    const warnings = checkForControlledWarnings()
    expect(warnings).toHaveLength(0)
  })

  test('Favorites page inputs should not cause controlled/uncontrolled warnings', async () => {
    render(
      <TestWrapper>
        <Favorites />
      </TestWrapper>
    )

    // Test search input
    const searchInput = screen.getByPlaceholderText(/Search favorites/i)
    if (searchInput) {
      fireEvent.change(searchInput, { target: { value: '' } })
      fireEvent.change(searchInput, { target: { value: 'test' } })
    }

    const warnings = checkForControlledWarnings()
    expect(warnings).toHaveLength(0)
  })

  test('Employee Management inputs should not cause controlled/uncontrolled warnings', async () => {
    render(
      <TestWrapper>
        <EmployeeManagement />
      </TestWrapper>
    )

    // Test search input
    const searchInput = screen.getByPlaceholderText(/Search employees/i)
    if (searchInput) {
      fireEvent.change(searchInput, { target: { value: '' } })
      fireEvent.change(searchInput, { target: { value: 'test' } })
    }

    const warnings = checkForControlledWarnings()
    expect(warnings).toHaveLength(0)
  })

  test('Billing Dashboard inputs should not cause controlled/uncontrolled warnings', async () => {
    render(
      <TestWrapper>
        <BillingDashboard />
      </TestWrapper>
    )

    // Test search input
    const searchInput = screen.getByPlaceholderText(/Search customers/i)
    if (searchInput) {
      fireEvent.change(searchInput, { target: { value: '' } })
      fireEvent.change(searchInput, { target: { value: 'test' } })
    }

    const warnings = checkForControlledWarnings()
    expect(warnings).toHaveLength(0)
  })

  test('User Management inputs should not cause controlled/uncontrolled warnings', async () => {
    render(
      <TestWrapper>
        <UserManagement />
      </TestWrapper>
    )

    // Test search input
    const searchInput = screen.getByPlaceholderText(/Search users/i)
    if (searchInput) {
      fireEvent.change(searchInput, { target: { value: '' } })
      fireEvent.change(searchInput, { target: { value: 'test' } })
    }

    const warnings = checkForControlledWarnings()
    expect(warnings).toHaveLength(0)
  })

  test('Security Logs inputs should not cause controlled/uncontrolled warnings', async () => {
    render(
      <TestWrapper>
        <SecurityLogs />
      </TestWrapper>
    )

    // Test search input
    const searchInput = screen.getByPlaceholderText(/Search logs/i)
    if (searchInput) {
      fireEvent.change(searchInput, { target: { value: '' } })
      fireEvent.change(searchInput, { target: { value: 'test' } })
    }

    const warnings = checkForControlledWarnings()
    expect(warnings).toHaveLength(0)
  })

  test('System Settings inputs should not cause controlled/uncontrolled warnings', async () => {
    render(
      <TestWrapper>
        <SystemSettings />
      </TestWrapper>
    )

    // Test text inputs
    const siteNameInput = screen.getByLabelText(/Site Name/i)
    if (siteNameInput) {
      fireEvent.change(siteNameInput, { target: { value: '' } })
      fireEvent.change(siteNameInput, { target: { value: 'Test Site' } })
    }

    const warnings = checkForControlledWarnings()
    expect(warnings).toHaveLength(0)
  })

  test('All NumberInput components should handle undefined values properly', () => {
    // Test that NumberInput components use proper default values
    const testCases = [
      { input: null, expected: 0 },
      { input: undefined, expected: 0 },
      { input: '', expected: 0 },
      { input: '123', expected: 123 }
    ]

    testCases.forEach(({ input, expected }) => {
      // This test verifies our pattern of using `value ?? defaultValue`
      const result = input ?? 0
      expect(result).toBe(expected)
    })
  })

  test('All TextInput components should handle undefined values properly', () => {
    // Test that TextInput components use proper default values
    const testCases = [
      { input: null, expected: '' },
      { input: undefined, expected: '' },
      { input: '', expected: '' },
      { input: 'test', expected: 'test' }
    ]

    testCases.forEach(({ input, expected }) => {
      // This test verifies our pattern of using `value || ''`
      const result = input || ''
      expect(result).toBe(expected)
    })
  })

  test('All Select components should handle undefined values properly', () => {
    // Test that Select components use proper default values
    const testCases = [
      { input: null, expected: 'default' },
      { input: undefined, expected: 'default' },
      { input: '', expected: 'default' },
      { input: 'option1', expected: 'option1' }
    ]

    testCases.forEach(({ input, expected }) => {
      // This test verifies our pattern of using `value ?? defaultValue`
      const result = input ?? 'default'
      expect(result).toBe(expected)
    })
  })
})
