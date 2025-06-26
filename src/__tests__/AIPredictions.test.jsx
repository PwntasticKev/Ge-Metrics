import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { MantineProvider } from '@mantine/core'
import { vi } from 'vitest'
import AIPredictions from '../pages/AIPredictions/index.jsx'

// Mock the ItemData hook
vi.mock('../utils/item-data.jsx', () => ({
  __esModule: true,
  default: () => ({
    items: [
      {
        id: 1,
        name: 'Test Item 1',
        high: '1000',
        volume: '500',
        profit: '100',
        img: 'test-image-1.png'
      },
      {
        id: 2,
        name: 'Test Item 2',
        high: '2000',
        volume: '300',
        profit: '200',
        img: 'test-image-2.png'
      }
    ],
    mapStatus: 'success',
    priceStatus: 'success'
  })
}))

// Mock fetch for whale data
global.fetch = vi.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({
      targets: [
        {
          id: 1,
          name: 'Whale Item 1',
          score: 85,
          currentPrice: 1500,
          avgPrice: 1200,
          currentVolume: 1000,
          avgVolume: 800,
          reasons: ['High volume activity', 'Price spike detected']
        }
      ],
      lastUpdated: new Date().toISOString()
    })
  })
)

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <MantineProvider>
        {component}
      </MantineProvider>
    </BrowserRouter>
  )
}

describe('AIPredictions Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders without controlled/uncontrolled input warnings', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    renderWithProviders(<AIPredictions />)

    await waitFor(() => {
      expect(screen.getByText('AI Market Predictions')).toBeInTheDocument()
    })

    // Check that no controlled/uncontrolled warnings were logged
    const warnings = consoleSpy.mock.calls.filter(call =>
      call[0]?.includes('controlled input to be uncontrolled')
    )
    expect(warnings).toHaveLength(0)

    consoleSpy.mockRestore()
  })

  test('NumberInput components handle undefined values correctly', async () => {
    renderWithProviders(<AIPredictions />)

    await waitFor(() => {
      expect(screen.getByText('AI Market Predictions')).toBeInTheDocument()
    })

    // Navigate to filters tab
    const filtersTab = screen.getByText('Filters')
    fireEvent.click(filtersTab)

    // Test Minimum Confidence NumberInput
    const minConfidenceInput = screen.getByLabelText('Minimum Confidence (%)')
    expect(minConfidenceInput).toHaveValue(50)

    // Test Maximum Risk NumberInput
    const maxRiskInput = screen.getByLabelText('Maximum Risk (%)')
    expect(maxRiskInput).toHaveValue(70)

    // Test Minimum Profit NumberInput
    const minProfitInput = screen.getByLabelText('Minimum Profit (GP)')
    expect(minProfitInput).toHaveValue(0)

    // Test Maximum Price NumberInput
    const maxPriceInput = screen.getByLabelText('Maximum Price (GP)')
    expect(maxPriceInput).toHaveValue(1000000)
  })

  test('Select components handle undefined values correctly', async () => {
    renderWithProviders(<AIPredictions />)

    await waitFor(() => {
      expect(screen.getByText('AI Market Predictions')).toBeInTheDocument()
    })

    // Test Sort by Select
    const sortBySelect = screen.getByLabelText('Sort by')
    expect(sortBySelect).toHaveValue('overallScore')

    // Navigate to filters tab
    const filtersTab = screen.getByText('Filters')
    fireEvent.click(filtersTab)

    // Test Category Select
    const categorySelect = screen.getByLabelText('Category')
    expect(categorySelect).toHaveValue('all')
  })

  test('TextInput components handle undefined values correctly', async () => {
    renderWithProviders(<AIPredictions />)

    await waitFor(() => {
      expect(screen.getByText('AI Market Predictions')).toBeInTheDocument()
    })

    // Navigate to whales tab
    const whalesTab = screen.getByText('Whales')
    fireEvent.click(whalesTab)

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search by item name or activity type...')
      expect(searchInput).toHaveValue('')
    })
  })

  test('input changes work correctly without warnings', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    renderWithProviders(<AIPredictions />)

    await waitFor(() => {
      expect(screen.getByText('AI Market Predictions')).toBeInTheDocument()
    })

    // Navigate to filters tab
    const filtersTab = screen.getByText('Filters')
    fireEvent.click(filtersTab)

    // Test changing NumberInput values
    const minConfidenceInput = screen.getByLabelText('Minimum Confidence (%)')
    fireEvent.change(minConfidenceInput, { target: { value: '75' } })
    expect(minConfidenceInput).toHaveValue(75)

    const maxRiskInput = screen.getByLabelText('Maximum Risk (%)')
    fireEvent.change(maxRiskInput, { target: { value: '50' } })
    expect(maxRiskInput).toHaveValue(50)

    // Test changing Select values
    const categorySelect = screen.getByLabelText('Category')
    fireEvent.change(categorySelect, { target: { value: 'Hidden Gem' } })
    expect(categorySelect).toHaveValue('Hidden Gem')

    // Check that no controlled/uncontrolled warnings were logged
    const warnings = consoleSpy.mock.calls.filter(call =>
      call[0]?.includes('controlled input to be uncontrolled')
    )
    expect(warnings).toHaveLength(0)

    consoleSpy.mockRestore()
  })

  test('component handles edge cases gracefully', async () => {
    renderWithProviders(<AIPredictions />)

    await waitFor(() => {
      expect(screen.getByText('AI Market Predictions')).toBeInTheDocument()
    })

    // Navigate to filters tab
    const filtersTab = screen.getByText('Filters')
    fireEvent.click(filtersTab)

    // Test clearing NumberInput values (should use defaults)
    const minConfidenceInput = screen.getByLabelText('Minimum Confidence (%)')
    fireEvent.change(minConfidenceInput, { target: { value: '' } })
    // Should default to 50
    expect(minConfidenceInput).toHaveValue(50)

    const maxRiskInput = screen.getByLabelText('Maximum Risk (%)')
    fireEvent.change(maxRiskInput, { target: { value: '' } })
    // Should default to 70
    expect(maxRiskInput).toHaveValue(70)
  })

  test('all tabs render without errors', async () => {
    renderWithProviders(<AIPredictions />)

    await waitFor(() => {
      expect(screen.getByText('AI Market Predictions')).toBeInTheDocument()
    })

    // Test all tabs
    const tabs = ['Predictions', 'Whales', 'Filters', 'Insights', 'Algorithms']

    for (const tabName of tabs) {
      const tab = screen.getByText(tabName)
      fireEvent.click(tab)

      await waitFor(() => {
        // Each tab should render some content
        expect(screen.getByText(tabName)).toBeInTheDocument()
      })
    }
  })

  test('auto-refresh switch works correctly', async () => {
    renderWithProviders(<AIPredictions />)

    await waitFor(() => {
      expect(screen.getByText('AI Market Predictions')).toBeInTheDocument()
    })

    const autoRefreshSwitch = screen.getByLabelText('Auto-refresh')
    expect(autoRefreshSwitch).toBeChecked()

    fireEvent.click(autoRefreshSwitch)
    expect(autoRefreshSwitch).not.toBeChecked()
  })
})
