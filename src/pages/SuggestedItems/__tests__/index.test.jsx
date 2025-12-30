/* eslint-env jest */
/* global describe, test, expect, beforeEach, vi, afterEach */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { MantineProvider } from '@mantine/core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SuggestedItems from '../index.jsx'
import { trpc } from '../../../utils/trpc.jsx'

// Mock TRPC
vi.mock('../../../utils/trpc.jsx', () => ({
  trpc: {
    suggestedItems: {
      getItems: {
        useQuery: vi.fn()
      },
      getStats: {
        useQuery: vi.fn()
      }
    },
    useUtils: vi.fn(() => ({
      suggestedItems: {
        getItems: {
          invalidate: vi.fn()
        }
      }
    }))
  }
}))

// Mock useFavorites hook
vi.mock('../../../hooks/useFavorites.js', () => ({
  useFavorites: vi.fn(() => ({
    favoriteItems: [],
    toggleFavorite: vi.fn(),
    isLoadingFavorites: false
  }))
}))

// Mock utils
vi.mock('../../../utils/utils.jsx', () => ({
  getRelativeTime: vi.fn(() => 'a few seconds ago')
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn()
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

const mockSuggestedItems = [
  {
    itemId: 561,
    name: 'Nature rune',
    icon: '/images/4/4a/Nature_rune.png',
    currentPrice: 95,
    margin: 5,
    marginPercentage: 5.26,
    volume24h: 50000,
    volume1h: 2500,
    profitPerFlip: 4,
    bestBuyTime: '11 PM - 3 AM',
    bestSellTime: '6 PM - 10 PM',
    suggestionScore: 75,
    manipulationWarning: false,
    affordable: true
  },
  {
    itemId: 4151,
    name: 'Abyssal whip',
    icon: '/images/4/48/Abyssal_whip.png',
    currentPrice: 3000000,
    margin: 200000,
    marginPercentage: 6.67,
    volume24h: 50,
    volume1h: 3,
    profitPerFlip: 190000,
    bestBuyTime: '12 AM - 6 AM',
    bestSellTime: '7 PM - 11 PM',
    suggestionScore: 65,
    manipulationWarning: false,
    affordable: false
  }
]

const mockStats = {
  totalItems: 150,
  highVolumeItems: 75,
  lowVolumeItems: 75,
  averageMargin: 8.5
}

const renderWithProviders = (component) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <MantineProvider theme={{ colorScheme: 'dark' }}>
          {component}
        </MantineProvider>
      </QueryClientProvider>
    </BrowserRouter>
  )
}

describe('SuggestedItems Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default TRPC mocks
    trpc.suggestedItems.getItems.useQuery.mockReturnValue({
      data: mockSuggestedItems,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      dataUpdatedAt: Date.now()
    })
    
    trpc.suggestedItems.getStats.useQuery.mockReturnValue({
      data: mockStats,
      isLoading: false,
      error: null
    })
    
    // Setup localStorage mock
    localStorageMock.getItem.mockReturnValue('1000000')
    localStorageMock.setItem.mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Component Rendering', () => {
    test('renders without crashing', () => {
      renderWithProviders(<SuggestedItems />)
      
      expect(screen.getByText('Suggested Items')).toBeInTheDocument()
    })

    test('displays loading state initially', () => {
      trpc.suggestedItems.getItems.useQuery.mockReturnValue({
        data: [],
        isLoading: true,
        error: null,
        refetch: vi.fn(),
        dataUpdatedAt: Date.now()
      })
      
      renderWithProviders(<SuggestedItems />)
      
      expect(screen.getByRole('status')).toBeInTheDocument() // Loader
    })

    test('displays error state when TRPC fails', () => {
      trpc.suggestedItems.getItems.useQuery.mockReturnValue({
        data: [],
        isLoading: false,
        error: new Error('API Error'),
        refetch: vi.fn(),
        dataUpdatedAt: Date.now()
      })
      
      renderWithProviders(<SuggestedItems />)
      
      // Should show empty state or error message
      expect(screen.getByText(/No items match/)).toBeInTheDocument()
    })

    test('displays suggested items when loaded', () => {
      renderWithProviders(<SuggestedItems />)
      
      expect(screen.getByText('Nature rune')).toBeInTheDocument()
      expect(screen.getByText('Abyssal whip')).toBeInTheDocument()
    })
  })

  describe('Capital Input Functionality', () => {
    test('loads capital from localStorage on mount', () => {
      localStorageMock.getItem.mockReturnValue('5000000')
      
      renderWithProviders(<SuggestedItems />)
      
      expect(localStorageMock.getItem).toHaveBeenCalledWith('suggestedItems_capital')
    })

    test('defaults to 1M GP when no localStorage value', () => {
      localStorageMock.getItem.mockReturnValue(null)
      
      renderWithProviders(<SuggestedItems />)
      
      const capitalInput = screen.getByLabelText(/Your Capital/)
      expect(capitalInput).toHaveValue(1000000)
    })

    test('saves capital to localStorage when changed', async () => {
      renderWithProviders(<SuggestedItems />)
      
      const capitalInput = screen.getByLabelText(/Your Capital/)
      fireEvent.change(capitalInput, { target: { value: '2000000' } })
      
      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith('suggestedItems_capital', '2000000')
      })
    })

    test('updates TRPC query when capital changes', async () => {
      renderWithProviders(<SuggestedItems />)
      
      const capitalInput = screen.getByLabelText(/Your Capital/)
      fireEvent.change(capitalInput, { target: { value: '5000000' } })
      
      await waitFor(() => {
        expect(trpc.suggestedItems.getItems.useQuery).toHaveBeenCalledWith(
          expect.objectContaining({
            capital: 5000000
          }),
          expect.any(Object)
        )
      })
    })

    test('handles capital input formatting correctly', () => {
      renderWithProviders(<SuggestedItems />)
      
      const capitalInput = screen.getByLabelText(/Your Capital/)
      
      // Should format numbers with commas
      fireEvent.change(capitalInput, { target: { value: '1000000' } })
      expect(capitalInput.value).toContain('1,000,000')
    })
  })

  describe('Tab Functionality', () => {
    test('renders all three tabs', () => {
      renderWithProviders(<SuggestedItems />)
      
      expect(screen.getByText(/Global Suggested/)).toBeInTheDocument()
      expect(screen.getByText(/High Volume/)).toBeInTheDocument()
      expect(screen.getByText(/Low Volume/)).toBeInTheDocument()
    })

    test('defaults to global tab', () => {
      renderWithProviders(<SuggestedItems />)
      
      expect(trpc.suggestedItems.getItems.useQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          volumeType: 'global'
        }),
        expect.any(Object)
      )
    })

    test('switches to high volume tab when clicked', async () => {
      renderWithProviders(<SuggestedItems />)
      
      const highVolumeTab = screen.getByText(/High Volume/)
      fireEvent.click(highVolumeTab)
      
      await waitFor(() => {
        expect(trpc.suggestedItems.getItems.useQuery).toHaveBeenCalledWith(
          expect.objectContaining({
            volumeType: 'high'
          }),
          expect.any(Object)
        )
      })
    })

    test('switches to low volume tab when clicked', async () => {
      renderWithProviders(<SuggestedItems />)
      
      const lowVolumeTab = screen.getByText(/Low Volume/)
      fireEvent.click(lowVolumeTab)
      
      await waitFor(() => {
        expect(trpc.suggestedItems.getItems.useQuery).toHaveBeenCalledWith(
          expect.objectContaining({
            volumeType: 'low'
          }),
          expect.any(Object)
        )
      })
    })

    test('shows correct item counts in tab labels', () => {
      renderWithProviders(<SuggestedItems />)
      
      // Should show count based on filtered items
      expect(screen.getByText(/Global Suggested \(2\)/)).toBeInTheDocument()
    })
  })

  describe('Statistics Display', () => {
    test('displays stats cards when data is loaded', () => {
      renderWithProviders(<SuggestedItems />)
      
      expect(screen.getByText('150')).toBeInTheDocument() // Total items
      expect(screen.getByText('75')).toBeInTheDocument() // High volume (appears twice)
      expect(screen.getByText('8.5%')).toBeInTheDocument() // Average margin
    })

    test('handles missing stats gracefully', () => {
      trpc.suggestedItems.getStats.useQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error: null
      })
      
      renderWithProviders(<SuggestedItems />)
      
      // Should not crash, stats cards should not appear
      expect(screen.queryByText('Total Opportunities')).not.toBeInTheDocument()
    })
  })

  describe('Refresh Functionality', () => {
    test('refresh button triggers data refetch', async () => {
      const mockRefetch = vi.fn()
      trpc.suggestedItems.getItems.useQuery.mockReturnValue({
        data: mockSuggestedItems,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
        dataUpdatedAt: Date.now()
      })
      
      renderWithProviders(<SuggestedItems />)
      
      const refreshButton = screen.getByText('Refresh')
      fireEvent.click(refreshButton)
      
      expect(mockRefetch).toHaveBeenCalled()
    })

    test('refresh button shows loading state', () => {
      trpc.suggestedItems.getItems.useQuery.mockReturnValue({
        data: mockSuggestedItems,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
        dataUpdatedAt: Date.now()
      })
      
      renderWithProviders(<SuggestedItems />)
      
      const refreshButton = screen.getByText('Refresh')
      expect(refreshButton).toBeDisabled()
    })
  })

  describe('Empty States', () => {
    test('shows empty state when no items match filters', () => {
      trpc.suggestedItems.getItems.useQuery.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        dataUpdatedAt: Date.now()
      })
      
      renderWithProviders(<SuggestedItems />)
      
      expect(screen.getByText(/No items match your current filters/)).toBeInTheDocument()
      expect(screen.getByText(/Try increasing your capital/)).toBeInTheDocument()
    })

    test('shows specific message for high volume tab with no items', () => {
      trpc.suggestedItems.getItems.useQuery.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        dataUpdatedAt: Date.now()
      })
      
      renderWithProviders(<SuggestedItems />)
      
      // Switch to high volume tab
      const highVolumeTab = screen.getByText(/High Volume/)
      fireEvent.click(highVolumeTab)
      
      expect(screen.getByText(/No high volume items match/)).toBeInTheDocument()
    })
  })

  describe('Table Integration', () => {
    test('passes correct props to SuggestedItemsTable', () => {
      renderWithProviders(<SuggestedItems />)
      
      // Table should be rendered with items
      expect(screen.getByText('Nature rune')).toBeInTheDocument()
      expect(screen.getByText('Abyssal whip')).toBeInTheDocument()
    })

    test('handles favorite toggle functionality', () => {
      const { useFavorites } = require('../../../hooks/useFavorites.js')
      const mockToggleFavorite = vi.fn()
      
      useFavorites.mockReturnValue({
        favoriteItems: [],
        toggleFavorite: mockToggleFavorite,
        isLoadingFavorites: false
      })
      
      renderWithProviders(<SuggestedItems />)
      
      // Should pass toggle function to table
      // Note: Actual button testing would be in table component tests
    })
  })

  describe('Performance and Optimization', () => {
    test('uses appropriate TRPC query options', () => {
      renderWithProviders(<SuggestedItems />)
      
      expect(trpc.suggestedItems.getItems.useQuery).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          staleTime: 60_000,
          refetchOnWindowFocus: false
        })
      )
    })

    test('updates relative time display periodically', () => {
      vi.useFakeTimers()
      
      renderWithProviders(<SuggestedItems />)
      
      // Fast-forward 30 seconds
      vi.advanceTimersByTime(30000)
      
      // Should update the display (mocked getRelativeTime would be called again)
      expect(screen.getByText('a few seconds ago')).toBeInTheDocument()
      
      vi.useRealTimers()
    })
  })
})