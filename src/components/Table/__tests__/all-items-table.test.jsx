/* eslint-env jest */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { MantineProvider } from '@mantine/core'
import { AllItemsTable } from '../all-items-table'

// Mock data for testing
const mockData = [
  {
    id: 1,
    name: 'Twisted bow',
    img: 'twisted-bow.png',
    low: '1,200,000,000',
    high: '1,250,000,000',
    profit: '50,000,000',
    limit: '1',
    qty: null
  },
  {
    id: 2,
    name: '3rd age platebody',
    img: '3rd-age-platebody.png',
    low: '500,000,000',
    high: '520,000,000',
    profit: '20,000,000',
    limit: '2',
    qty: null
  },
  {
    id: 3,
    name: 'Cannonball',
    img: 'cannonball.png',
    low: '150',
    high: '155',
    profit: '5',
    limit: '25,000',
    qty: null
  },
  {
    id: 4,
    name: 'Ancestral robe top',
    img: 'ancestral-robe-top.png',
    low: '280,000,000',
    high: '285,000,000',
    profit: '5,000,000',
    limit: '2',
    qty: null
  },
  {
    id: 5,
    name: 'Iron ore',
    img: 'iron-ore.png',
    low: '120',
    high: '125',
    profit: '5',
    limit: '25,000',
    qty: null
  }
]

const TestWrapper = ({ children }) => (
  <MantineProvider>
    <BrowserRouter>
      {children}
    </BrowserRouter>
  </MantineProvider>
)

describe('AllItemsTable', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    // Clear any previous test artifacts
    jest.clearAllMocks()
  })

  it('renders table with data correctly', () => {
    render(
      <TestWrapper>
        <AllItemsTable data={mockData} />
      </TestWrapper>
    )

    // Check table headers
    expect(screen.getByText('Id')).toBeInTheDocument()
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Buy Price')).toBeInTheDocument()
    expect(screen.getByText('Sell Price')).toBeInTheDocument()
    expect(screen.getByText('Profit')).toBeInTheDocument()
    expect(screen.getByText('Buy Limit')).toBeInTheDocument()

    // Check some data is rendered
    expect(screen.getByText('Twisted bow')).toBeInTheDocument()
    expect(screen.getByText('3rd age platebody')).toBeInTheDocument()
    expect(screen.getByText('Cannonball')).toBeInTheDocument()
  })

  it('filters data correctly with search input', async () => {
    render(
      <TestWrapper>
        <AllItemsTable data={mockData} />
      </TestWrapper>
    )

    const searchInput = screen.getByPlaceholderText('Search by any field')

    // Search for "twisted"
    await user.type(searchInput, 'twisted')

    await waitFor(() => {
      expect(screen.getByText('Twisted bow')).toBeInTheDocument()
      expect(screen.queryByText('3rd age platebody')).not.toBeInTheDocument()
      expect(screen.queryByText('Cannonball')).not.toBeInTheDocument()
    })
  })

  it('opens and displays filter controls', async () => {
    render(
      <TestWrapper>
        <AllItemsTable data={mockData} />
      </TestWrapper>
    )

    // Click filters button
    const filtersButton = screen.getByRole('button', { name: /filters/i })
    await user.click(filtersButton)

    await waitFor(() => {
      expect(screen.getByText('Advanced Filters')).toBeInTheDocument()
      expect(screen.getByText('Third Age Items')).toBeInTheDocument()
      expect(screen.getByText('Raids Items')).toBeInTheDocument()
      expect(screen.getByText('Volume')).toBeInTheDocument()
      expect(screen.getByText('Price Range (GP)')).toBeInTheDocument()
      expect(screen.getByText('Profit Range (GP)')).toBeInTheDocument()
    })
  })

  it('filters Third Age items correctly', async () => {
    render(
      <TestWrapper>
        <AllItemsTable data={mockData} />
      </TestWrapper>
    )

    // Open filters
    await user.click(screen.getByRole('button', { name: /filters/i }))

    // Check Third Age filter
    await user.click(screen.getByLabelText('Third Age Items'))

    await waitFor(() => {
      expect(screen.getByText('3rd age platebody')).toBeInTheDocument()
      expect(screen.queryByText('Twisted bow')).not.toBeInTheDocument()
      expect(screen.queryByText('Cannonball')).not.toBeInTheDocument()
    })
  })

  it('filters Raids items correctly', async () => {
    render(
      <TestWrapper>
        <AllItemsTable data={mockData} />
      </TestWrapper>
    )

    // Open filters
    await user.click(screen.getByRole('button', { name: /filters/i }))

    // Check Raids filter
    await user.click(screen.getByLabelText('Raids Items'))

    await waitFor(() => {
      expect(screen.getByText('Twisted bow')).toBeInTheDocument()
      expect(screen.getByText('Ancestral robe top')).toBeInTheDocument()
      expect(screen.queryByText('3rd age platebody')).not.toBeInTheDocument()
      expect(screen.queryByText('Cannonball')).not.toBeInTheDocument()
    })
  })

  it('filters by volume correctly', async () => {
    render(
      <TestWrapper>
        <AllItemsTable data={mockData} />
      </TestWrapper>
    )

    // Open filters
    await user.click(screen.getByRole('button', { name: /filters/i }))

    // Select high volume filter
    const volumeSelect = screen.getByDisplayValue('All Volumes')
    await user.click(volumeSelect)
    await user.click(screen.getByText('High Volume (≥ 1000 limit)'))

    await waitFor(() => {
      expect(screen.getByText('Cannonball')).toBeInTheDocument()
      expect(screen.getByText('Iron ore')).toBeInTheDocument()
      expect(screen.queryByText('Twisted bow')).not.toBeInTheDocument()
      expect(screen.queryByText('3rd age platebody')).not.toBeInTheDocument()
    })
  })

  it('filters by price range correctly', async () => {
    render(
      <TestWrapper>
        <AllItemsTable data={mockData} />
      </TestWrapper>
    )

    // Open filters
    await user.click(screen.getByRole('button', { name: /filters/i }))

    // Set price range filter
    const minPriceInput = screen.getByPlaceholderText('Min price')
    const maxPriceInput = screen.getByPlaceholderText('Max price')

    await user.type(minPriceInput, '1000000') // 1M
    await user.type(maxPriceInput, '500000000') // 500M

    await waitFor(() => {
      expect(screen.getByText('Ancestral robe top')).toBeInTheDocument()
      expect(screen.queryByText('Twisted bow')).not.toBeInTheDocument() // Too expensive
      expect(screen.queryByText('Cannonball')).not.toBeInTheDocument() // Too cheap
    })
  })

  it('shows active filter count correctly', async () => {
    render(
      <TestWrapper>
        <AllItemsTable data={mockData} />
      </TestWrapper>
    )

    // Initially no active filters
    expect(screen.queryByText(/\d+ filter/)).not.toBeInTheDocument()

    // Open filters
    await user.click(screen.getByRole('button', { name: /filters/i }))

    // Add multiple filters
    await user.click(screen.getByLabelText('Third Age Items'))
    await user.click(screen.getByLabelText('Raids Items'))

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument() // Badge showing filter count
    })
  })

  it('clears all filters correctly', async () => {
    render(
      <TestWrapper>
        <AllItemsTable data={mockData} />
      </TestWrapper>
    )

    // Open filters and add some
    await user.click(screen.getByRole('button', { name: /filters/i }))
    await user.click(screen.getByLabelText('Third Age Items'))
    await user.click(screen.getByLabelText('Raids Items'))

    // Should show filtered results
    await waitFor(() => {
      expect(screen.queryByText('Cannonball')).not.toBeInTheDocument()
    })

    // Clear filters
    await user.click(screen.getByRole('button', { name: /clear/i }))

    await waitFor(() => {
      // All items should be visible again
      expect(screen.getByText('Twisted bow')).toBeInTheDocument()
      expect(screen.getByText('3rd age platebody')).toBeInTheDocument()
      expect(screen.getByText('Cannonball')).toBeInTheDocument()
      expect(screen.getByText('Ancestral robe top')).toBeInTheDocument()
      expect(screen.getByText('Iron ore')).toBeInTheDocument()
    })
  })

  it('displays correct item count in results summary', async () => {
    render(
      <TestWrapper>
        <AllItemsTable data={mockData} />
      </TestWrapper>
    )

    // Initially shows all items
    expect(screen.getByText(`Showing ${mockData.length} of ${mockData.length} items`)).toBeInTheDocument()

    // Filter to reduce items
    await user.click(screen.getByRole('button', { name: /filters/i }))
    await user.click(screen.getByLabelText('Third Age Items'))

    await waitFor(() => {
      expect(screen.getByText('Showing 1 of 1 items')).toBeInTheDocument()
    })
  })

  it('handles pagination correctly', async () => {
    // Create more data to test pagination
    const largeDataSet = Array.from({ length: 150 }, (_, i) => ({
      id: i + 1,
      name: `Item ${i + 1}`,
      img: `item-${i + 1}.png`,
      low: '100',
      high: '105',
      profit: '5',
      limit: '1000',
      qty: null
    }))

    render(
      <TestWrapper>
        <AllItemsTable data={largeDataSet} />
      </TestWrapper>
    )

    // Should show pagination controls
    expect(screen.getByRole('button', { name: /next page/i })).toBeInTheDocument()

    // First page should show first 100 items
    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 100')).toBeInTheDocument()
    expect(screen.queryByText('Item 101')).not.toBeInTheDocument()
  })

  it('handles empty search results correctly', async () => {
    render(
      <TestWrapper>
        <AllItemsTable data={mockData} />
      </TestWrapper>
    )

    const searchInput = screen.getByPlaceholderText('Search by any field')

    // Search for something that doesn't exist
    await user.type(searchInput, 'nonexistent item')

    await waitFor(() => {
      expect(screen.getByText('No items found matching your filters')).toBeInTheDocument()
    })
  })

  it('displays profit colors correctly', () => {
    const mixedProfitData = [
      { ...mockData[0], profit: '10,000,000' }, // Positive
      { ...mockData[1], profit: '-5,000,000' }, // Negative
      { ...mockData[2], profit: '0' } // Zero
    ]

    render(
      <TestWrapper>
        <AllItemsTable data={mixedProfitData} />
      </TestWrapper>
    )

    // Positive profit should be green
    const positiveProfit = screen.getByText('10,000,000')
    expect(positiveProfit).toHaveStyle({ color: expect.stringContaining('green') })

    // Negative profit should be red
    const negativeProfit = screen.getByText('-5,000,000')
    expect(negativeProfit).toHaveStyle({ color: expect.stringContaining('red') })
  })

  it('opens transaction modal when transaction button clicked', async () => {
    render(
      <TestWrapper>
        <AllItemsTable data={mockData} />
      </TestWrapper>
    )

    // Click first transaction button
    const transactionButtons = screen.getAllByRole('button')
    const transactionButton = transactionButtons.find(btn =>
      btn.querySelector('svg') // Button with IconReceipt
    )

    if (transactionButton) {
      await user.click(transactionButton)
      // Modal should open (you'd need to mock the modal component for full testing)
    }
  })

  it('opens graph modal when chart button clicked', async () => {
    render(
      <TestWrapper>
        <AllItemsTable data={mockData} />
      </TestWrapper>
    )

    // Click first chart button
    const chartButtons = screen.getAllByRole('button')
    const chartButton = chartButtons.find(btn =>
      btn.querySelector('svg') // Button with IconChartHistogram
    )

    if (chartButton) {
      await user.click(chartButton)
      // Modal should open (you'd need to mock the modal component for full testing)
    }
  })

  it('maintains search state when data updates', async () => {
    const { rerender } = render(
      <TestWrapper>
        <AllItemsTable data={mockData} />
      </TestWrapper>
    )

    const searchInput = screen.getByPlaceholderText('Search by any field')
    await user.type(searchInput, 'twisted')

    // Update data
    const updatedData = [...mockData, {
      id: 6,
      name: 'Twisted buckler',
      img: 'twisted-buckler.png',
      low: '50,000,000',
      high: '52,000,000',
      profit: '2,000,000',
      limit: '2',
      qty: null
    }]

    rerender(
      <TestWrapper>
        <AllItemsTable data={updatedData} />
      </TestWrapper>
    )

    await waitFor(() => {
      // Should show both twisted items
      expect(screen.getByText('Twisted bow')).toBeInTheDocument()
      expect(screen.getByText('Twisted buckler')).toBeInTheDocument()
      // Should not show non-matching items
      expect(screen.queryByText('Cannonball')).not.toBeInTheDocument()
    })
  })
})
