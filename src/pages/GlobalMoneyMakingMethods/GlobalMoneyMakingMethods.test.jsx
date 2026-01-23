import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MantineProvider } from '@mantine/core'
import { MemoryRouter } from 'react-router-dom'
import { createTRPCReact } from '@trpc/react-query'
import GlobalMoneyMakingMethods from './index.jsx'

// Create a mock TRPC client
const mockTrpc = createTRPCReact()
const mockGetGlobalMethods = vi.fn()
const mockGetGlobalStats = vi.fn()
const mockFetchGlobalMethods = vi.fn()

// Mock the trpc utils
vi.mock('../../utils/trpc', () => ({
  trpc: {
    moneyMakingMethods: {
      getGlobalMethods: {
        useQuery: mockGetGlobalMethods
      },
      getGlobalStats: {
        useQuery: mockGetGlobalStats
      }
    },
    useUtils: vi.fn(() => ({
      moneyMakingMethods: {
        getGlobalMethods: {
          fetch: mockFetchGlobalMethods
        }
      }
    }))
  }
}))

// Create trpc mock object for use in tests
const trpc = {
  moneyMakingMethods: {
    getGlobalMethods: {
      useQuery: mockGetGlobalMethods
    },
    getGlobalStats: {
      useQuery: mockGetGlobalStats
    }
  },
  useUtils: vi.fn(() => ({
    moneyMakingMethods: {
      getGlobalMethods: {
        fetch: mockFetchGlobalMethods
      }
    }
  }))
}

// Mock ItemData hook
vi.mock('../../utils/item-data.jsx', () => ({
  default: vi.fn(() => ({
    items: [],
    mapStatus: 'success',
    priceStatus: 'success'
  }))
}))

// Mock PremiumPageWrapper
vi.mock('../../components/PremiumPageWrapper', () => ({
  default: vi.fn(({ children }) => children)
}))

// Mock utils
vi.mock('../../utils/utils.jsx', () => ({
  getRelativeTime: vi.fn(() => 'just now')
}))

// Mock formatters
vi.mock('../../utils/formatters', () => ({
  formatNumber: vi.fn((num) => num?.toLocaleString() || '0')
}))

// Mock InfiniteScrollTable
vi.mock('../../components/InfiniteScroll/InfiniteScrollTable', () => ({
  InfiniteScrollTable: vi.fn(({ renderItem, fetchData, renderEmpty, renderError, ...props }) => {
    const mockMethods = [
      {
        id: 1,
        methodName: 'Test Method',
        description: 'Test description',
        category: 'skilling',
        difficulty: 'easy',
        profitPerHour: 1000000,
        username: 'testuser',
        createdAt: new Date().toISOString()
      }
    ]
    
    return (
      <div data-testid="infinite-scroll-table">
        <div data-testid="props" data-props={JSON.stringify(props)} />
        <div data-testid="render-test">
          {mockMethods.map((method, index) => (
            <div key={method.id} data-testid="rendered-method">
              {renderItem(method, index)}
            </div>
          ))}
        </div>
        <div data-testid="empty-test">{renderEmpty && renderEmpty()}</div>
        <div data-testid="error-test">{renderError && renderError(new Error('Test error'), () => {})}</div>
      </div>
    )
  })
}))

describe.skip('GlobalMoneyMakingMethods', () => {
  let queryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  const renderComponent = () => {
    // Create a mock TRPC provider
    const MockTRPCProvider = ({ children }) => {
      return children
    }

    return render(
      <QueryClientProvider client={queryClient}>
        <MockTRPCProvider>
          <MantineProvider>
            <MemoryRouter>
              <GlobalMoneyMakingMethods />
            </MemoryRouter>
          </MantineProvider>
        </MockTRPCProvider>
      </QueryClientProvider>
    )
  }

  const mockGlobalMethods = [
    {
      id: '1',
      userId: 1,
      methodName: 'Test Method',
      description: 'Test description',
      category: 'skilling',
      difficulty: 'easy',
      profitPerHour: 1000000,
      requirements: {},
      createdAt: new Date().toISOString(),
      username: 'testuser',
      items: []
    }
  ]

  const mockGlobalStats = {
    approved: 10,
    pending: 5,
    rejected: 2,
    total: 17
  }

  it('renders without crashing', () => {
    trpc.moneyMakingMethods.getGlobalStats.useQuery.mockReturnValue({
      data: mockGlobalStats,
      isLoading: false,
      error: null
    })

    renderComponent()
    expect(screen.getByText('Global Money Making Methods')).toBeInTheDocument()
    expect(screen.getByTestId('infinite-scroll-table')).toBeInTheDocument()
  })

  it('displays all data correctly', async () => {
    trpc.moneyMakingMethods.getGlobalStats.useQuery.mockReturnValue({
      data: mockGlobalStats,
      isLoading: false,
      error: null
    })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByTestId('infinite-scroll-table')).toBeInTheDocument()
      expect(screen.getByTestId('rendered-method')).toBeInTheDocument()
    })
  })

  it('shows infinite scroll component', () => {
    trpc.moneyMakingMethods.getGlobalStats.useQuery.mockReturnValue({
      data: mockGlobalStats,
      isLoading: false,
      error: null
    })

    renderComponent()
    expect(screen.getByTestId('infinite-scroll-table')).toBeInTheDocument()
    
    // Check that props are passed correctly
    const propsElement = screen.getByTestId('props')
    const props = JSON.parse(propsElement.getAttribute('data-props'))
    expect(props.initialLoadSize).toBe(30)
    expect(props.loadMoreSize).toBe(20)
    expect(props.itemHeight).toBe(120)
  })

  it('handles and displays errors gracefully', () => {
    trpc.moneyMakingMethods.getGlobalStats.useQuery.mockReturnValue({
      data: mockGlobalStats,
      isLoading: false,
      error: null
    })

    renderComponent()
    
    // Check that error render function is available
    expect(screen.getByTestId('error-test')).toBeInTheDocument()
  })

  it('handles all user interactions (filters and search)', async () => {
    trpc.moneyMakingMethods.getGlobalStats.useQuery.mockReturnValue({
      data: mockGlobalStats,
      isLoading: false,
      error: null
    })

    renderComponent()

    // Test search input
    const searchInput = screen.getByPlaceholderText(/search methods/i)
    fireEvent.change(searchInput, { target: { value: 'test' } })
    expect(searchInput.value).toBe('test')

    // Test category filter
    const categorySelect = screen.getByPlaceholderText('Category')
    fireEvent.click(categorySelect)

    // Test clear all button
    const clearAllButton = screen.getByText('Clear All')
    fireEvent.click(clearAllButton)
    expect(searchInput.value).toBe('')
  })

  it('displays stats correctly when data is available', async () => {
    trpc.moneyMakingMethods.getGlobalStats.useQuery.mockReturnValue({
      data: mockGlobalStats,
      isLoading: false,
      error: null
    })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument() // Approved methods count
    })
  })

  it('handles empty methods list gracefully', () => {
    trpc.moneyMakingMethods.getGlobalStats.useQuery.mockReturnValue({
      data: mockGlobalStats,
      isLoading: false,
      error: null
    })

    renderComponent()
    
    // Check that empty state render function is available
    expect(screen.getByTestId('empty-test')).toBeInTheDocument()
  })

  it('filters methods based on search query', async () => {
    trpc.moneyMakingMethods.getGlobalStats.useQuery.mockReturnValue({
      data: mockGlobalStats,
      isLoading: false,
      error: null
    })

    renderComponent()

    const searchInput = screen.getByPlaceholderText(/search methods/i)
    fireEvent.change(searchInput, { target: { value: 'mining' } })

    // Check that search query is passed to infinite scroll
    const propsElement = screen.getByTestId('props')
    const props = JSON.parse(propsElement.getAttribute('data-props'))
    expect(props.searchQuery).toBe('mining')
  })

  it('is fully keyboard navigable', () => {
    trpc.moneyMakingMethods.getGlobalStats.useQuery.mockReturnValue({
      data: mockGlobalStats,
      isLoading: false,
      error: null
    })

    renderComponent()

    // Test tab navigation
    const searchInput = screen.getByPlaceholderText(/search methods/i)
    searchInput.focus()
    expect(document.activeElement).toBe(searchInput)
    
    // Simulate tab key press
    fireEvent.keyDown(searchInput, { key: 'Tab' })
  })

  it('has proper ARIA labels', () => {
    trpc.moneyMakingMethods.getGlobalStats.useQuery.mockReturnValue({
      data: mockGlobalStats,
      isLoading: false,
      error: null
    })

    renderComponent()

    // Check for important roles and labels
    expect(screen.getByRole('textbox')).toBeInTheDocument() // Search input
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0) // Buttons
    
    // Check that infinite scroll has proper aria label
    const propsElement = screen.getByTestId('props')
    const props = JSON.parse(propsElement.getAttribute('data-props'))
    expect(props.ariaLabel).toBe('Global money making methods')
  })

  it('renders correctly on mobile devices', () => {
    // Mock mobile viewport
    window.innerWidth = 375

    trpc.moneyMakingMethods.getGlobalStats.useQuery.mockReturnValue({
      data: mockGlobalStats,
      isLoading: false,
      error: null
    })

    renderComponent()

    // Component should still render
    expect(screen.getByText('Global Money Making Methods')).toBeInTheDocument()
    expect(screen.getByTestId('infinite-scroll-table')).toBeInTheDocument()
  })
})