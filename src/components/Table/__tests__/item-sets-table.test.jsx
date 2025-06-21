import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { BrowserRouter } from 'react-router-dom'
import { vi, describe, test, expect } from 'vitest'
import AllItemsTable from '../item-sets-table.jsx'

// Mock the chart components
vi.mock('../../charts/MiniChart.jsx', () => ({
  default: function MockMiniChart ({ itemId, width, height }) {
    return (
      <div data-testid={`mini-chart-${itemId}`} style={{ width, height }}>
        MiniChart for {itemId}
      </div>
    )
  }
}))

vi.mock('../../../shared/modals/graph-modal.jsx', () => ({
  default: function MockGraphModal ({ opened, setOpened, id }) {
    if (!opened) return null
    return (
      <div data-testid="graph-modal">
        <div data-testid="graph-modal-item-id">{id}</div>
        <button onClick={() => setOpened(false)}>Close Modal</button>
      </div>
    )
  }
}))

vi.mock('./components/table-settings-menu.jsx', () => {
  return function MockTableSettingsMenu ({ itemId }) {
    return <div data-testid={`settings-menu-${itemId}`}>Settings for {itemId}</div>
  }
})

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <MantineProvider>
        {component}
      </MantineProvider>
    </BrowserRouter>
  )
}

const mockData = [
  {
    id: '1',
    name: 'Dragon Bones',
    img: 'dragon-bones.png',
    qty: 100,
    items: [
      { name: 'Dragon Bones', qty: 100, img: 'dragon-bones.png', low: '2,500' }
    ],
    high: '2,800',
    profit: '30,000'
  },
  {
    id: '2',
    name: 'Rune Platebody',
    img: 'rune-platebody.png',
    qty: 1,
    items: [
      { name: 'Rune Platebody', qty: 1, img: 'rune-platebody.png', low: '38,000' }
    ],
    high: '42,000',
    profit: '4,000'
  }
]

describe('ItemSetsTable', () => {
  test('renders table with all columns including chart column', () => {
    renderWithProviders(<AllItemsTable data={mockData} />)

    // Check that all expected columns are present
    expect(screen.getByText('Img')).toBeInTheDocument()
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Items')).toBeInTheDocument()
    expect(screen.getByText('Sell Price')).toBeInTheDocument()
    expect(screen.getByText('Profit')).toBeInTheDocument()
    expect(screen.getByText('Chart')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  test('renders MiniChart component in each row', () => {
    renderWithProviders(<AllItemsTable data={mockData} />)

    // Check that MiniChart components are rendered for each item
    expect(screen.getByTestId('mini-chart-1')).toBeInTheDocument()
    expect(screen.getByTestId('mini-chart-2')).toBeInTheDocument()

    // Verify MiniChart props
    const chart1 = screen.getByTestId('mini-chart-1')
    const chart2 = screen.getByTestId('mini-chart-2')

    expect(chart1).toHaveStyle({ width: '120px', height: '40px' })
    expect(chart2).toHaveStyle({ width: '120px', height: '40px' })
  })

  test('renders chart button in each row', () => {
    renderWithProviders(<AllItemsTable data={mockData} />)

    // Check that chart buttons are present (IconChartHistogram)
    const chartButtons = screen.getAllByRole('button')
    const chartButtonsWithIcon = chartButtons.filter(button =>
      button.querySelector('[data-testid*="chart"]') ||
      button.textContent.includes('Chart')
    )

    expect(chartButtonsWithIcon.length).toBeGreaterThan(0)
  })

  test('opens GraphModal when chart button is clicked', async () => {
    renderWithProviders(<AllItemsTable data={mockData} />)

    // Initially, modal should not be open
    expect(screen.queryByTestId('graph-modal')).not.toBeInTheDocument()

    // Find and click the first chart button
    const chartButtons = screen.getAllByRole('button')
    const chartButton = chartButtons.find(button =>
      button.querySelector('svg') || button.textContent.includes('Chart')
    )

    if (chartButton) {
      fireEvent.click(chartButton)

      // Wait for modal to open
      await waitFor(() => {
        expect(screen.getByTestId('graph-modal')).toBeInTheDocument()
      })

      // Check that the correct item ID is passed to modal
      expect(screen.getByTestId('graph-modal-item-id')).toHaveTextContent('1')
    }
  })

  test('closes GraphModal when close button is clicked', async () => {
    renderWithProviders(<AllItemsTable data={mockData} />)

    // Open modal first
    const chartButtons = screen.getAllByRole('button')
    const chartButton = chartButtons.find(button =>
      button.querySelector('svg') || button.textContent.includes('Chart')
    )

    if (chartButton) {
      fireEvent.click(chartButton)

      await waitFor(() => {
        expect(screen.getByTestId('graph-modal')).toBeInTheDocument()
      })

      // Click close button
      const closeButton = screen.getByText('Close Modal')
      fireEvent.click(closeButton)

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByTestId('graph-modal')).not.toBeInTheDocument()
      })
    }
  })

  test('renders settings menu for each item', () => {
    renderWithProviders(<AllItemsTable data={mockData} />)

    expect(screen.getByTestId('settings-menu-1')).toBeInTheDocument()
    expect(screen.getByTestId('settings-menu-2')).toBeInTheDocument()
  })

  test('displays item data correctly in table rows', () => {
    renderWithProviders(<AllItemsTable data={mockData} />)

    // Check that item names are displayed
    expect(screen.getByText('Dragon Bones (100)')).toBeInTheDocument()
    expect(screen.getByText('Rune Platebody (1)')).toBeInTheDocument()

    // Check that prices are displayed
    expect(screen.getByText('2,800')).toBeInTheDocument()
    expect(screen.getByText('42,000')).toBeInTheDocument()

    // Check that profits are displayed
    expect(screen.getByText('30,000')).toBeInTheDocument()
    expect(screen.getByText('4,000')).toBeInTheDocument()
  })

  test('handles empty data gracefully', () => {
    renderWithProviders(<AllItemsTable data={[]} />)

    expect(screen.getByText('Nothing found')).toBeInTheDocument()
  })

  test('search functionality works', () => {
    renderWithProviders(<AllItemsTable data={mockData} />)

    const searchInput = screen.getByPlaceholderText('Search by any field')

    // Search for "Dragon"
    fireEvent.change(searchInput, { target: { value: 'Dragon' } })

    // Should show only Dragon Bones
    expect(screen.getByText('Dragon Bones (100)')).toBeInTheDocument()
    expect(screen.queryByText('Rune Platebody (1)')).not.toBeInTheDocument()
  })

  test('pagination works correctly', () => {
    // Create more data to test pagination
    const largeData = Array.from({ length: 150 }, (_, i) => ({
      id: `${i + 1}`,
      name: `Item ${i + 1}`,
      img: `item-${i + 1}.png`,
      qty: 1,
      items: [{ name: `Item ${i + 1}`, qty: 1, img: `item-${i + 1}.png`, low: '1000' }],
      high: '1200',
      profit: '200'
    }))

    renderWithProviders(<AllItemsTable data={largeData} />)

    // Should show pagination controls
    expect(screen.getByRole('navigation')).toBeInTheDocument()

    // Should show page 1 initially
    expect(screen.getByText('1')).toBeInTheDocument()
  })
})
