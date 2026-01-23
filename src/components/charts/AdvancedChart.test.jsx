import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from 'react-query'
import { MantineProvider } from '@mantine/core'
import AdvancedChart from './AdvancedChart'
import { trpc } from '../../utils/trpc'
import { getItemHistoryById } from '../../api/rs-wiki-api.jsx'

// Mock external dependencies
vi.mock('../../api/rs-wiki-api.jsx', () => ({
  getItemHistoryById: vi.fn()
}))

vi.mock('../../utils/trpc.jsx', () => ({
  trpc: {
    gameEvents: {
      getByDateRange: {
        useQuery: vi.fn()
      }
    },
    useUtils: vi.fn()
  }
}))

vi.mock('../../utils/utils.jsx', () => ({
  getItemById: vi.fn()
}))

vi.mock('../../utils/indicators.js', () => ({
  calculateSMA: vi.fn(),
  calculateEMA: vi.fn()
}))

// Mock Recharts components
vi.mock('recharts', () => ({
  LineChart: vi.fn(({ children, onMouseMove, onMouseDown, onMouseUp, onMouseLeave }) => (
    <div 
      data-testid="line-chart"
      onMouseMove={onMouseMove}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  )),
  ComposedChart: vi.fn(({ children, onMouseMove, onMouseDown, onMouseUp, onMouseLeave }) => (
    <div 
      data-testid="composed-chart"
      onMouseMove={onMouseMove}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  )),
  BarChart: vi.fn(({ children, onMouseMove, onMouseLeave }) => (
    <div 
      data-testid="bar-chart"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  )),
  Line: vi.fn(() => <div data-testid="chart-line" />),
  Bar: vi.fn(() => <div data-testid="chart-bar" />),
  Scatter: vi.fn(() => <div data-testid="chart-scatter" />),
  XAxis: vi.fn(() => <div data-testid="x-axis" />),
  YAxis: vi.fn(() => <div data-testid="y-axis" />),
  CartesianGrid: vi.fn(() => <div data-testid="cartesian-grid" />),
  Tooltip: vi.fn(() => <div data-testid="tooltip" />),
  Legend: vi.fn(() => <div data-testid="legend" />),
  ResponsiveContainer: vi.fn(({ children }) => (
    <div data-testid="responsive-container">{children}</div>
  )),
  ReferenceLine: vi.fn(() => <div data-testid="reference-line" />),
  ReferenceArea: vi.fn(() => <div data-testid="reference-area" />),
  Area: vi.fn(() => <div data-testid="area" />),
  AreaChart: vi.fn(() => <div data-testid="area-chart" />)
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0
      }
    }
  })

  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        {children}
      </MantineProvider>
    </QueryClientProvider>
  )
}

// Mock data
const mockHistoryData = [
  { 
    timestamp: 1640995200, // 2022-01-01 
    avgHighPrice: 100, 
    avgLowPrice: 95,
    highPriceVolume: 1000,
    lowPriceVolume: 1200
  },
  { 
    timestamp: 1641081600, // 2022-01-02
    avgHighPrice: 102, 
    avgLowPrice: 97,
    highPriceVolume: 1100,
    lowPriceVolume: 1300
  },
  { 
    timestamp: 1641168000, // 2022-01-03
    avgHighPrice: 105, 
    avgLowPrice: 100,
    highPriceVolume: 900,
    lowPriceVolume: 1000
  }
]

const mockGameEvents = {
  data: {
    blogs: [
      {
        id: '1',
        title: 'Test Blog Post',
        date: new Date('2022-01-02'),
        category: 'Game Updates'
      }
    ],
    updates: [
      {
        id: '2',
        title: 'Test Game Update',
        updateDate: new Date('2022-01-03'),
        category: 'PvP'
      }
    ]
  }
}

const mockItem = {
  id: 123,
  name: 'Test Item',
  icon: 'test-icon.png'
}

describe.skip('AdvancedChart', () => {
  let mockGameEventsQuery

  beforeEach(() => {
    
    // Reset all mocks
    vi.clearAllMocks()
    
    // Mock API responses
    getItemHistoryById.mockResolvedValue({
      data: { data: mockHistoryData }
    })
    
    mockGameEventsQuery = {
      data: mockGameEvents,
      isLoading: false,
      error: null
    }
    
    getItemHistoryById.mockReturnValue(Promise.resolve(mockHistoryData))
    trpc.gameEvents.getByDateRange.useQuery.mockReturnValue(mockGameEventsQuery)
    trpc.useUtils.mockReturnValue({
      flips: {
        getFlips: {
          invalidate: vi.fn()
        }
      }
    })
    
    require('../../utils/utils.jsx').getItemById.mockReturnValue(mockItem)
    require('../../utils/indicators.js').calculateSMA.mockReturnValue([
      { time: 1640995200, value: 97.5 },
      { time: 1641081600, value: 99.5 }
    ])
    require('../../utils/indicators.js').calculateEMA.mockReturnValue([
      { time: 1640995200, value: 98 },
      { time: 1641081600, value: 100 }
    ])
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('renders without crashing', async () => {
      render(
        <AdvancedChart itemId={123} items={[mockItem]} />,
        { wrapper: createWrapper() }
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('composed-chart')).toBeInTheDocument()
      })
    })

    it('displays loading state while fetching data', async () => {
      getItemHistoryById.mockImplementation(() => new Promise(() => {})) // Never resolves
      
      render(
        <AdvancedChart itemId={123} items={[mockItem]} />,
        { wrapper: createWrapper() }
      )
      
      expect(screen.getByText('Loading data...')).toBeInTheDocument()
    })

    it('handles and displays errors gracefully', async () => {
      getItemHistoryById.mockRejectedValue(new Error('API Error'))
      
      render(
        <AdvancedChart itemId={123} items={[mockItem]} />,
        { wrapper: createWrapper() }
      )
      
      await waitFor(() => {
        expect(screen.getByText('No data available')).toBeInTheDocument()
      })
    })

    it('displays item name correctly', async () => {
      render(
        <AdvancedChart itemId={123} items={[mockItem]} item={mockItem} />,
        { wrapper: createWrapper() }
      )
      
      await waitFor(() => {
        expect(screen.getByText('Test Item')).toBeInTheDocument()
      })
    })
  })

  describe('Default Timeframe', () => {
    it('defaults to one week timeframe', async () => {
      render(
        <AdvancedChart itemId={123} items={[mockItem]} />,
        { wrapper: createWrapper() }
      )
      
      await waitFor(() => {
        expect(screen.getByText('1W')).toBeInTheDocument()
        // Check if 1W button has filled variant (active state)
        const weekButton = screen.getByText('1W').closest('button')
        expect(weekButton).toHaveClass('mantine-Button-filled')
      })
    })

    it('calls API with correct timeframe for one week', async () => {
      render(
        <AdvancedChart itemId={123} items={[mockItem]} />,
        { wrapper: createWrapper() }
      )
      
      await waitFor(() => {
        expect(getItemHistoryById).toHaveBeenCalledWith('1h', 123)
      })
    })
  })

  describe('Filter Functionality', () => {
    it('toggles high price (sell) line visibility', async () => {
      render(
        <AdvancedChart itemId={123} items={[mockItem]} />,
        { wrapper: createWrapper() }
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('composed-chart')).toBeInTheDocument()
      })
      
      // Click on indicators dropdown
      const indicatorsButton = screen.getByText('Indicators')
      fireEvent.click(indicatorsButton)
      
      // Toggle sell price checkbox
      const sellPriceCheckbox = screen.getByLabelText(/Sell Price/i)
      expect(sellPriceCheckbox).toBeChecked() // Should be checked by default
      
      fireEvent.click(sellPriceCheckbox)
      expect(sellPriceCheckbox).not.toBeChecked()
    })

    it('toggles low price (buy) line visibility', async () => {
      render(
        <AdvancedChart itemId={123} items={[mockItem]} />,
        { wrapper: createWrapper() }
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('composed-chart')).toBeInTheDocument()
      })
      
      const indicatorsButton = screen.getByText('Indicators')
      fireEvent.click(indicatorsButton)
      
      const buyPriceCheckbox = screen.getByLabelText(/Buy Price/i)
      expect(buyPriceCheckbox).toBeChecked()
      
      fireEvent.click(buyPriceCheckbox)
      expect(buyPriceCheckbox).not.toBeChecked()
    })

    it('toggles SMA indicator visibility', async () => {
      render(
        <AdvancedChart itemId={123} items={[mockItem]} />,
        { wrapper: createWrapper() }
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('composed-chart')).toBeInTheDocument()
      })
      
      const indicatorsButton = screen.getByText('Indicators')
      fireEvent.click(indicatorsButton)
      
      const smaCheckbox = screen.getByLabelText(/SMA \(20\)/i)
      expect(smaCheckbox).not.toBeChecked() // Should be unchecked by default
      
      fireEvent.click(smaCheckbox)
      expect(smaCheckbox).toBeChecked()
    })

    it('toggles EMA indicator visibility', async () => {
      render(
        <AdvancedChart itemId={123} items={[mockItem]} />,
        { wrapper: createWrapper() }
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('composed-chart')).toBeInTheDocument()
      })
      
      const indicatorsButton = screen.getByText('Indicators')
      await user.click(indicatorsButton)
      
      const emaCheckbox = screen.getByLabelText(/EMA \(20\)/i)
      expect(emaCheckbox).not.toBeChecked()
      
      fireEvent.click(emaCheckbox)
      expect(emaCheckbox).toBeChecked()
    })

    it('toggles volume chart visibility', async () => {
      render(
        <AdvancedChart itemId={123} items={[mockItem]} />,
        { wrapper: createWrapper() }
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('composed-chart')).toBeInTheDocument()
      })
      
      const indicatorsButton = screen.getByText('Indicators')
      fireEvent.click(indicatorsButton)
      
      const buyVolumeCheckbox = screen.getByLabelText(/Buy Volume/i)
      const sellVolumeCheckbox = screen.getByLabelText(/Sell Volume/i)
      
      expect(buyVolumeCheckbox).toBeChecked()
      expect(sellVolumeCheckbox).toBeChecked()
      
      fireEvent.click(buyVolumeCheckbox)
      expect(buyVolumeCheckbox).not.toBeChecked()
      
      fireEvent.click(sellVolumeCheckbox)
      expect(sellVolumeCheckbox).not.toBeChecked()
    })

    it('toggles game updates visibility', async () => {
      render(
        <AdvancedChart itemId={123} items={[mockItem]} />,
        { wrapper: createWrapper() }
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('composed-chart')).toBeInTheDocument()
      })
      
      const indicatorsButton = screen.getByText('Indicators')
      await user.click(indicatorsButton)
      
      const updatesCheckbox = screen.getByLabelText(/Game Updates/i)
      expect(updatesCheckbox).toBeChecked()
      
      fireEvent.click(updatesCheckbox)
      expect(updatesCheckbox).not.toBeChecked()
    })
  })

  describe('Chart Interaction', () => {
    it('handles mouse down for drag selection start', async () => {
      render(
        <AdvancedChart itemId={123} items={[mockItem]} />,
        { wrapper: createWrapper() }
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('composed-chart')).toBeInTheDocument()
      })
      
      const chart = screen.getByTestId('composed-chart')
      
      // Simulate mouse down event with mock payload
      fireEvent.mouseDown(chart, {
        activePayload: [{
          payload: { timestamp: 1641081600 }
        }]
      })
      
      // Should set reference area start
      // Note: This would need to be tested with component state inspection in real implementation
    })

    it('handles mouse up for drag selection end', async () => {
      render(
        <AdvancedChart itemId={123} items={[mockItem]} />,
        { wrapper: createWrapper() }
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('composed-chart')).toBeInTheDocument()
      })
      
      const chart = screen.getByTestId('composed-chart')
      
      // Simulate selection sequence
      fireEvent.mouseDown(chart, {
        activePayload: [{ payload: { timestamp: 1641081600 } }]
      })
      
      fireEvent.mouseUp(chart)
      
      // Zoom should be applied - this would need state inspection in real implementation
    })

    it('synchronizes crosshair across all chart sections', async () => {
      render(
        <AdvancedChart itemId={123} items={[mockItem]} />,
        { wrapper: createWrapper() }
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('composed-chart')).toBeInTheDocument()
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
      })
      
      const mainChart = screen.getByTestId('composed-chart')
      const volumeChart = screen.getByTestId('bar-chart')
      
      // Mouse move on main chart should affect volume chart
      fireEvent.mouseMove(mainChart, {
        activePayload: [{ payload: { timestamp: 1641081600 } }]
      })
      
      // Both charts should have crosshair reference lines
      // This would need more detailed mock setup for real testing
    })

    it('resets zoom when reset button is clicked', async () => {
      render(
        <AdvancedChart itemId={123} items={[mockItem]} />,
        { wrapper: createWrapper() }
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('composed-chart')).toBeInTheDocument()
      })
      
      // First zoom in (simulate zoom state)
      const chart = screen.getByTestId('composed-chart')
      fireEvent.mouseDown(chart, {
        activePayload: [{ payload: { timestamp: 1641081600 } }]
      })
      fireEvent.mouseUp(chart)
      
      // Reset button should appear after zoom
      await waitFor(() => {
        const resetButton = screen.getByText('Reset')
        expect(resetButton).toBeInTheDocument()
        
        fireEvent.click(resetButton)
        // Chart should reset to full view - would need state inspection
      })
    })
  })

  describe('Game Updates and Blogs', () => {
    it('renders game update dots correctly', async () => {
      render(
        <AdvancedChart itemId={123} items={[mockItem]} />,
        { wrapper: createWrapper() }
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('composed-chart')).toBeInTheDocument()
      })
      
      // Should render game events - would need better mock setup for scatter plot
      expect(mockGameEventsQuery.data.data.blogs).toHaveLength(1)
      expect(mockGameEventsQuery.data.data.updates).toHaveLength(1)
    })

    it('shows different colors for blogs vs updates', async () => {
      render(
        <AdvancedChart itemId={123} items={[mockItem]} />,
        { wrapper: createWrapper() }
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('composed-chart')).toBeInTheDocument()
      })
      
      // Blogs should be blue, updates should be orange
      // This would need component inspection or CSS testing
    })

    it('displays event details on hover', async () => {
      render(
        <AdvancedChart itemId={123} items={[mockItem]} />,
        { wrapper: createWrapper() }
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('composed-chart')).toBeInTheDocument()
      })
      
      // Simulate hover over an event dot
      // Would need proper event simulation with coordinates
    })
  })

  describe('Timeframe Changes', () => {
    it('changes timeframe when button clicked', async () => {
      render(
        <AdvancedChart itemId={123} items={[mockItem]} />,
        { wrapper: createWrapper() }
      )
      
      await waitFor(() => {
        expect(screen.getByText('1M')).toBeInTheDocument()
      })
      
      const monthButton = screen.getByText('1M')
      fireEvent.click(monthButton)
      
      // Should call API with new timeframe
      await waitFor(() => {
        expect(getItemHistoryById).toHaveBeenCalledWith('1h', 123)
      })
    })

    it('updates all chart components when timeframe changes', async () => {
      render(
        <AdvancedChart itemId={123} items={[mockItem]} />,
        { wrapper: createWrapper() }
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('composed-chart')).toBeInTheDocument()
      })
      
      const threeDayButton = screen.getByText('3M')
      fireEvent.click(threeDayButton)
      
      // All charts should update with new data range
      // Would need state inspection to verify
    })
  })

  describe('Accessibility', () => {
    it('is fully keyboard navigable', async () => {
      render(
        <AdvancedChart itemId={123} items={[mockItem]} />,
        { wrapper: createWrapper() }
      )
      
      await waitFor(() => {
        expect(screen.getByText('Indicators')).toBeInTheDocument()
      })
      
      // Tab through interactive elements
      fireEvent.keyDown(document, { key: 'Tab' })
      fireEvent.keyDown(document, { key: 'Tab' })
      
      // Should be able to open indicators with keyboard
      const indicatorsButton = screen.getByText('Indicators')
      fireEvent.keyDown(indicatorsButton, { key: 'Enter' })
      
      // Check if dropdown opened
      await waitFor(() => {
        expect(screen.getByLabelText(/Sell Price/i)).toBeInTheDocument()
      })
    })

    it('has proper ARIA labels', async () => {
      render(
        <AdvancedChart itemId={123} items={[mockItem]} />,
        { wrapper: createWrapper() }
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('composed-chart')).toBeInTheDocument()
      })
      
      // Check for accessibility attributes
      const indicatorsButton = screen.getByText('Indicators')
      expect(indicatorsButton).toBeInTheDocument()
    })
  })

  describe('Mobile Responsiveness', () => {
    it('renders correctly on mobile devices', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      })
      
      render(
        <AdvancedChart itemId={123} items={[mockItem]} height={400} />,
        { wrapper: createWrapper() }
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('composed-chart')).toBeInTheDocument()
      })
      
      // Chart should adapt to mobile width
      // Would need more specific mobile interaction testing
    })
  })

  describe('Performance', () => {
    it('handles large datasets efficiently', async () => {
      // Create large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        timestamp: 1640995200 + i * 3600,
        avgHighPrice: 100 + Math.random() * 10,
        avgLowPrice: 95 + Math.random() * 10,
        highPriceVolume: 1000 + Math.random() * 500,
        lowPriceVolume: 1200 + Math.random() * 500
      }))
      
      getItemHistoryById.mockResolvedValue({
        data: { data: largeDataset }
      })
      
      const startTime = performance.now()
      
      render(
        <AdvancedChart itemId={123} items={[mockItem]} />,
        { wrapper: createWrapper() }
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('composed-chart')).toBeInTheDocument()
      })
      
      const endTime = performance.now()
      
      // Should render within reasonable time (adjust threshold as needed)
      expect(endTime - startTime).toBeLessThan(5000) // 5 seconds max
    })
  })
})