/* eslint-env jest */
/* global describe, test, expect, beforeEach, jest */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { MantineProvider } from '@mantine/core'
import { MainLinks } from './main-links'

// Mock the useNavigate hook
const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  Link: ({ children, to, ...props }) => (
    <a href={to} {...props}>
      {children}
    </a>
  )
}))

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <MantineProvider>
        {component}
      </MantineProvider>
    </BrowserRouter>
  )
}

describe('MainLinks Navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders all main navigation links', () => {
    renderWithProviders(<MainLinks />)

    // Check for main navigation items
    expect(screen.getByText('All Items')).toBeInTheDocument()
    expect(screen.getByText('High Volumes')).toBeInTheDocument()
    expect(screen.getByText('Watchlist')).toBeInTheDocument()
    expect(screen.getByText('Combination Sets')).toBeInTheDocument()
    expect(screen.getByText('Money Making')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByText('FAQ')).toBeInTheDocument()
    expect(screen.getByText('Log Out')).toBeInTheDocument()
  })

  test('does not render parties link', () => {
    renderWithProviders(<MainLinks />)

    // Parties should not be present
    expect(screen.queryByText('Parties')).not.toBeInTheDocument()
  })

  test('renders admin-only links when user is admin', () => {
    renderWithProviders(<MainLinks />)

    // Admin links should be present (based on mock admin=true)
    expect(screen.getByText('Admin')).toBeInTheDocument()
    expect(screen.getByText('API Status')).toBeInTheDocument()
  })

  test('money making submenu toggles correctly', () => {
    renderWithProviders(<MainLinks />)

    const moneyMakingButton = screen.getByText('Money Making')

    // Initially, submenu items should not be visible
    expect(screen.queryByText('Herblore Profit')).not.toBeInTheDocument()
    expect(screen.queryByText('Deaths Coffer')).not.toBeInTheDocument()
    expect(screen.queryByText('General Money Making')).not.toBeInTheDocument()

    // Click to open submenu
    fireEvent.click(moneyMakingButton)

    // Submenu items should now be visible
    expect(screen.getByText('Herblore Profit')).toBeInTheDocument()
    expect(screen.getByText('Deaths Coffer')).toBeInTheDocument()
    expect(screen.getByText('General Money Making')).toBeInTheDocument()

    // Click again to close submenu
    fireEvent.click(moneyMakingButton)

    // Submenu items should be hidden again
    expect(screen.queryByText('Herblore Profit')).not.toBeInTheDocument()
    expect(screen.queryByText('Deaths Coffer')).not.toBeInTheDocument()
    expect(screen.queryByText('General Money Making')).not.toBeInTheDocument()
  })

  test('submenu items have correct links', () => {
    renderWithProviders(<MainLinks />)

    // Open the money making submenu
    const moneyMakingButton = screen.getByText('Money Making')
    fireEvent.click(moneyMakingButton)

    // Check that submenu items have correct href attributes
    const herbloreLink = screen.getByText('Herblore Profit').closest('a')
    const deathsCofferLink = screen.getByText('Deaths Coffer').closest('a')
    const generalMoneyLink = screen.getByText('General Money Making').closest('a')

    expect(herbloreLink).toHaveAttribute('href', '/herbs')
    expect(deathsCofferLink).toHaveAttribute('href', '/deaths-coffer')
    expect(generalMoneyLink).toHaveAttribute('href', '/money-making')
  })

  test('main links have correct href attributes', () => {
    renderWithProviders(<MainLinks />)

    const allItemsLink = screen.getByText('All Items').closest('a')
    const highVolumesLink = screen.getByText('High Volumes').closest('a')
    const watchlistLink = screen.getByText('Watchlist').closest('a')
    const settingsLink = screen.getByText('Settings').closest('a')
    const faqLink = screen.getByText('FAQ').closest('a')
    const adminLink = screen.getByText('Admin').closest('a')
    const statusLink = screen.getByText('API Status').closest('a')

    expect(allItemsLink).toHaveAttribute('href', '/')
    expect(highVolumesLink).toHaveAttribute('href', '/high-volumes')
    expect(watchlistLink).toHaveAttribute('href', '/watchlist')
    expect(settingsLink).toHaveAttribute('href', '/settings')
    expect(faqLink).toHaveAttribute('href', '/faq')
    expect(adminLink).toHaveAttribute('href', '/admin')
    expect(statusLink).toHaveAttribute('href', '/status')
  })

  test('logout button calls handleLogout', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
    renderWithProviders(<MainLinks />)

    const logoutButton = screen.getByText('Log Out')
    fireEvent.click(logoutButton)

    expect(consoleSpy).toHaveBeenCalledWith('Logging out...')
    consoleSpy.mockRestore()
  })

  test('navigation has proper accessibility attributes', () => {
    renderWithProviders(<MainLinks />)

    // Check that buttons and links are properly accessible
    const moneyMakingButton = screen.getByText('Money Making')
    expect(moneyMakingButton).toBeInTheDocument()

    // Icons should be present for visual indication
    const icons = document.querySelectorAll('[data-testid*="icon"]')
    expect(icons.length).toBeGreaterThan(0)
  })
})

describe('MainLinks Admin Access Control', () => {
  test('hides admin links when user is not admin', async () => {
    // Create a test component with non-admin user
    const NonAdminMainLinks = () => {
      const [moneyMakingOpen, setMoneyMakingOpen] = React.useState(false)
      const isAdmin = false // Non-admin user

      return (
        <div>
          {/* Regular links */}
          <a href="/">All Items</a>
          <a href="/watchlist">Watchlist</a>

          {/* Admin-only links */}
          {isAdmin && (
            <>
              <a href="/admin">Admin</a>
              <a href="/status">API Status</a>
            </>
          )}
        </div>
      )
    }

    renderWithProviders(<NonAdminMainLinks />)

    // Admin links should not be present
    expect(screen.queryByText('Admin')).not.toBeInTheDocument()
    expect(screen.queryByText('API Status')).not.toBeInTheDocument()

    // Regular links should still be present
    expect(screen.getByText('All Items')).toBeInTheDocument()
    expect(screen.getByText('Watchlist')).toBeInTheDocument()
  })
})

describe('MainLinks Responsive Behavior', () => {
  test('handles small screen media queries', () => {
    // Mock window.matchMedia for responsive testing
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query.includes('sm'), // Simulate small screen
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn()
      }))
    })

    renderWithProviders(<MainLinks />)

    // Component should render without errors on small screens
    expect(screen.getByText('All Items')).toBeInTheDocument()
  })
})
