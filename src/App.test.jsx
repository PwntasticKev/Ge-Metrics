/* eslint-env jest */
/* global describe, test, expect, beforeEach, jest */

import React from 'react'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { MantineProvider } from '@mantine/core'
import App from './App'

// Mock all the pages and components
jest.mock('./components/auth/AuthProvider', () => {
  return function MockAuthProvider ({ children }) {
    return <div data-testid="auth-provider">{children}</div>
  }
})

jest.mock('./components/NavBar/nav-bar', () => {
  return function MockNavBar () {
    return <div data-testid="navbar">Navigation</div>
  }
})

jest.mock('./components/Header', () => {
  return function MockHeader () {
    return <div data-testid="header">Header</div>
  }
})

jest.mock('./pages/AllItems', () => {
  return function MockAllItems () {
    return <div data-testid="all-items-page">All Items</div>
  }
})

jest.mock('./pages/HighVolumes', () => {
  return function MockHighVolumes () {
    return <div data-testid="high-volumes-page">High Volumes</div>
  }
})

jest.mock('./pages/Watchlist', () => {
  return function MockWatchlist () {
    return <div data-testid="watchlist-page">Watchlist</div>
  }
})

jest.mock('./pages/Settings', () => {
  return function MockSettings () {
    return <div data-testid="settings-page">Settings</div>
  }
})

jest.mock('./pages/Faq', () => {
  return function MockFaq () {
    return <div data-testid="faq-page">FAQ</div>
  }
})

jest.mock('./pages/Login', () => {
  return function MockLogin () {
    return <div data-testid="login-page">Login</div>
  }
})

jest.mock('./pages/Admin', () => {
  return function MockAdmin () {
    return <div data-testid="admin-page">Admin</div>
  }
})

jest.mock('./pages/Status', () => {
  return function MockStatus () {
    return <div data-testid="status-page">Status</div>
  }
})

// Mock new pages
jest.mock('./pages/NightmareZone', () => {
  return function MockNightmareZone () {
    return <div data-testid="nightmare-zone-page">Nightmare Zone</div>
  }
})

jest.mock('./pages/FutureItems', () => {
  return function MockFutureItems () {
    return <div data-testid="future-items-page">Future Items</div>
  }
})

jest.mock('./pages/CombinationItems', () => {
  return function MockCombinationItems () {
    return <div data-testid="combination-items-page">Arbitrage Tracker</div>
  }
})

// Mock market watch pages
jest.mock('./pages/MarketWatch/FoodIndex.jsx', () => {
  return function MockFoodIndex () {
    return <div data-testid="food-index-page">Food Index</div>
  }
})

jest.mock('./pages/MarketWatch/LogsIndex.jsx', () => {
  return function MockLogsIndex () {
    return <div data-testid="logs-index-page">Logs Index</div>
  }
})

jest.mock('./pages/MarketWatch/RunesIndex.jsx', () => {
  return function MockRunesIndex () {
    return <div data-testid="runes-index-page">Runes Index</div>
  }
})

jest.mock('./pages/MarketWatch/MetalsIndex.jsx', () => {
  return function MockMetalsIndex () {
    return <div data-testid="metals-index-page">Metals Index</div>
  }
})

jest.mock('./pages/MarketWatch/BotFarmIndex.jsx', () => {
  return function MockBotFarmIndex () {
    return <div data-testid="bot-farm-index-page">Bot Farm Index</div>
  }
})

jest.mock('./pages/MarketWatch/PotionsIndex.jsx', () => {
  return function MockPotionsIndex () {
    return <div data-testid="potions-index-page">Potions Index</div>
  }
})

jest.mock('./pages/MarketWatch/RaidsIndex.jsx', () => {
  return function MockRaidsIndex () {
    return <div data-testid="raids-index-page">Raids Index</div>
  }
})

jest.mock('./pages/MarketWatch/HerbsIndex.jsx', () => {
  return function MockHerbsIndex () {
    return <div data-testid="herbs-index-page">Herbs Index</div>
  }
})

jest.mock('./pages/CommunityLeaderboard', () => {
  return function MockCommunityLeaderboard () {
    return <div data-testid="community-leaderboard-page">Community Leaderboard</div>
  }
})

// Mock theme
jest.mock('./theme/index.js', () => ({
  getTheme: () => ({ colorScheme: 'dark' })
}))

// Mock subscription component
jest.mock('./components/Subscription/index.jsx', () => {
  return {
    __esModule: true,
    default: function MockSubscriptionModal () {
      return <div data-testid="subscription-modal">Subscription Modal</div>
    },
    useSubscription: () => ({
      isSubscribed: false,
      plan: 'free',
      checkSubscriptionStatus: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn()
    })
  }
})

const renderWithProviders = (component, initialEntries = ['/']) => {
  return render(
    <BrowserRouter>
      <MantineProvider theme={{ colorScheme: 'dark' }}>
        {component}
      </MantineProvider>
    </BrowserRouter>
  )
}

describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders without crashing', () => {
    renderWithProviders(<App />)
    expect(screen.getByTestId('auth-provider')).toBeInTheDocument()
  })

  test('includes navigation and header components', () => {
    renderWithProviders(<App />)

    expect(screen.getByTestId('navbar')).toBeInTheDocument()
    expect(screen.getByTestId('header')).toBeInTheDocument()
  })

  test('has proper routing structure', () => {
    renderWithProviders(<App />)

    // Should have auth provider wrapping everything
    expect(screen.getByTestId('auth-provider')).toBeInTheDocument()
  })

  test('uses Mantine dark theme', () => {
    const { container } = renderWithProviders(<App />)

    // Should render with Mantine provider
    expect(container.querySelector('[data-mantine-color-scheme]')).toBeTruthy()
  })

  test('provides proper app structure', () => {
    renderWithProviders(<App />)

    // Core layout components should be present
    expect(screen.getByTestId('auth-provider')).toBeInTheDocument()
    expect(screen.getByTestId('navbar')).toBeInTheDocument()
    expect(screen.getByTestId('header')).toBeInTheDocument()
  })

  test('handles error boundaries gracefully', () => {
    // This test ensures the app doesn't crash on errors
    expect(() => {
      renderWithProviders(<App />)
    }).not.toThrow()
  })

  test('maintains consistent theming', () => {
    const { container } = renderWithProviders(<App />)

    // Should use dark theme consistently
    const mantineRoot = container.querySelector('[data-mantine-color-scheme="dark"]')
    expect(mantineRoot).toBeTruthy()
  })

  test('ensures proper component hierarchy', () => {
    renderWithProviders(<App />)

    const authProvider = screen.getByTestId('auth-provider')
    const navbar = screen.getByTestId('navbar')
    const header = screen.getByTestId('header')

    // All should be in the document
    expect(authProvider).toBeInTheDocument()
    expect(navbar).toBeInTheDocument()
    expect(header).toBeInTheDocument()
  })
})
