/* eslint-env jest */
/* global describe, test, expect, beforeEach, jest */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import HighVolumesTable from './high-volumes-table'

const renderWithProviders = (component) => {
  return render(
    <MantineProvider theme={{ colorScheme: 'dark' }}>
      {component}
    </MantineProvider>
  )
}

const mockData = [
  {
    id: 4151,
    name: 'Abyssal whip',
    img: 'test-image-url',
    high: '2000000',
    low: '1900000',
    volume: '150000',
    timestamp: new Date().toISOString(),
    change: 5.2
  },
  {
    id: 1515,
    name: 'Yew logs',
    img: 'test-image-url-2',
    high: '500',
    low: '480',
    volume: '750000',
    timestamp: new Date().toISOString(),
    change: -2.1
  },
  {
    id: 554,
    name: 'Fire rune',
    img: 'test-image-url-3',
    high: '5',
    low: '4',
    volume: '2500000',
    timestamp: new Date().toISOString(),
    change: 12.5
  },
  {
    id: 995,
    name: 'Coins', // This should be filtered out
    img: 'test-image-url-4',
    high: '1',
    low: '1',
    volume: '5000000',
    timestamp: new Date().toISOString(),
    change: 0
  }
]

describe('HighVolumesTable', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders table with column headers', () => {
    renderWithProviders(<HighVolumesTable data={mockData} loading={false} />)

    expect(screen.getByText('Item')).toBeInTheDocument()
    expect(screen.getByText('High Price')).toBeInTheDocument()
    expect(screen.getByText('Low Price')).toBeInTheDocument()
    expect(screen.getByText('Volume')).toBeInTheDocument()
    expect(screen.getByText('Change %')).toBeInTheDocument()
    expect(screen.getByText('Actions')).toBeInTheDocument()
  })

  test('displays loading state', () => {
    renderWithProviders(<HighVolumesTable data={[]} loading={true} />)

    expect(screen.getByText('Loading high volume data...')).toBeInTheDocument()
  })

  test('filters out coins automatically', () => {
    renderWithProviders(<HighVolumesTable data={mockData} loading={false} />)

    // Should show all items except coins
    expect(screen.getByText('Abyssal whip')).toBeInTheDocument()
    expect(screen.getByText('Yew logs')).toBeInTheDocument()
    expect(screen.getByText('Fire rune')).toBeInTheDocument()
    expect(screen.queryByText('Coins')).not.toBeInTheDocument()
  })

  test('formats volume numbers correctly', () => {
    renderWithProviders(<HighVolumesTable data={mockData} loading={false} />)

    // Should format large numbers with commas
    expect(screen.getByText('150,000')).toBeInTheDocument()
    expect(screen.getByText('750,000')).toBeInTheDocument()
    expect(screen.getByText('2,500,000')).toBeInTheDocument()
  })

  test('formats price numbers correctly', () => {
    renderWithProviders(<HighVolumesTable data={mockData} loading={false} />)

    // Should format prices with commas
    expect(screen.getByText('2,000,000')).toBeInTheDocument()
    expect(screen.getByText('1,900,000')).toBeInTheDocument()
    expect(screen.getByText('500')).toBeInTheDocument()
    expect(screen.getByText('480')).toBeInTheDocument()
  })

  test('shows color-coded volume indicators', () => {
    renderWithProviders(<HighVolumesTable data={mockData} loading={false} />)

    // Find volume cells and check their styling
    const volumeCells = screen.getAllByText(/^\d{1,3}(,\d{3})*$/)
    volumeCells.forEach(cell => {
      const volumeValue = parseInt(cell.textContent.replace(/,/g, ''))

      if (volumeValue >= 1000000) {
        // High volume should be red/orange
        expect(cell).toHaveStyle('color: #fa5252') // Red for very high volume
      } else if (volumeValue >= 500000) {
        // Medium-high volume should be orange
        expect(cell).toHaveStyle('color: #fd7e14') // Orange for high volume
      }
    })
  })

  test('shows percentage changes with correct colors', () => {
    renderWithProviders(<HighVolumesTable data={mockData} loading={false} />)

    // Positive change should be green
    const positiveChange = screen.getByText('+5.2%')
    expect(positiveChange).toHaveStyle('color: #51cf66')

    // Negative change should be red
    const negativeChange = screen.getByText('-2.1%')
    expect(negativeChange).toHaveStyle('color: #ff6b6b')

    // Large positive change should be green
    const largePositiveChange = screen.getByText('+12.5%')
    expect(largePositiveChange).toHaveStyle('color: #51cf66')
  })

  test('handles search functionality', () => {
    renderWithProviders(<HighVolumesTable data={mockData} loading={false} />)

    const searchInput = screen.getByPlaceholderText('Search items...')
    fireEvent.change(searchInput, { target: { value: 'whip' } })

    // Should only show Abyssal whip
    expect(screen.getByText('Abyssal whip')).toBeInTheDocument()
    expect(screen.queryByText('Yew logs')).not.toBeInTheDocument()
    expect(screen.queryByText('Fire rune')).not.toBeInTheDocument()
  })

  test('handles invalid volume data gracefully', () => {
    const invalidData = [
      {
        id: 1,
        name: 'Test Item',
        img: 'test-img',
        high: 'invalid',
        low: null,
        volume: undefined,
        timestamp: new Date().toISOString(),
        change: 'not-a-number'
      }
    ]

    renderWithProviders(<HighVolumesTable data={invalidData} loading={false} />)

    // Should render without crashing and show appropriate fallbacks
    expect(screen.getByText('Test Item')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument() // Fallback for invalid volume
  })

  test('sorts by volume in descending order by default', () => {
    renderWithProviders(<HighVolumesTable data={mockData} loading={false} />)

    // Should be sorted by volume (highest first): Fire rune, Yew logs, Abyssal whip
    const rows = screen.getAllByRole('row')
    const dataRows = rows.slice(1) // Skip header row

    // First data row should be Fire rune (highest volume: 2,500,000)
    expect(dataRows[0]).toHaveTextContent('Fire rune')
    // Second should be Yew logs (750,000)
    expect(dataRows[1]).toHaveTextContent('Yew logs')
    // Third should be Abyssal whip (150,000)
    expect(dataRows[2]).toHaveTextContent('Abyssal whip')
  })

  test('shows add to watchlist buttons', () => {
    renderWithProviders(<HighVolumesTable data={mockData} loading={false} />)

    const addButtons = screen.getAllByText('Add to Watchlist')
    expect(addButtons).toHaveLength(3) // One for each non-coin item
  })

  test('handles empty data gracefully', () => {
    renderWithProviders(<HighVolumesTable data={[]} loading={false} />)

    expect(screen.getByText('No high volume items found')).toBeInTheDocument()
  })

  test('shows proper timestamp', () => {
    const testDate = new Date('2023-01-01T12:00:00Z')
    const dataWithTimestamp = [{
      id: 1,
      name: 'Test Item',
      img: 'test-img',
      high: '1000',
      low: '900',
      volume: '50000',
      timestamp: testDate.toISOString(),
      change: 5.0
    }]

    renderWithProviders(<HighVolumesTable data={dataWithTimestamp} loading={false} />)

    // Should format timestamp properly
    expect(screen.getByText(/Jan 1, 2023/)).toBeInTheDocument()
  })

  test('handles null and undefined values', () => {
    const dataWithNulls = [{
      id: 1,
      name: 'Test Item',
      img: null,
      high: null,
      low: undefined,
      volume: null,
      timestamp: null,
      change: null
    }]

    renderWithProviders(<HighVolumesTable data={dataWithNulls} loading={false} />)

    // Should render without crashing
    expect(screen.getByText('Test Item')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument() // Fallback values
  })

  test('parses volume strings correctly', () => {
    const dataWithStringVolumes = [
      {
        id: 1,
        name: 'String Volume Item',
        img: 'test-img',
        high: '1000',
        low: '900',
        volume: '250,000', // String with commas
        timestamp: new Date().toISOString(),
        change: 5.0
      },
      {
        id: 2,
        name: 'K Volume Item',
        img: 'test-img',
        high: '2000',
        low: '1900',
        volume: '150K', // String with K suffix
        timestamp: new Date().toISOString(),
        change: 3.0
      }
    ]

    renderWithProviders(<HighVolumesTable data={dataWithStringVolumes} loading={false} />)

    // Should parse and display volumes correctly
    expect(screen.getByText('250,000')).toBeInTheDocument()
    expect(screen.getByText('150,000')).toBeInTheDocument() // 150K should become 150,000
  })

  test('shows error state when data loading fails', () => {
    renderWithProviders(<HighVolumesTable data={null} loading={false} error="Failed to load data" />)

    expect(screen.getByText('Error loading high volume data')).toBeInTheDocument()
    expect(screen.getByText('Failed to load data')).toBeInTheDocument()
  })

  test('refresh button works when provided', () => {
    const mockRefresh = jest.fn()
    renderWithProviders(
      <HighVolumesTable
        data={mockData}
        loading={false}
        onRefresh={mockRefresh}
      />
    )

    const refreshButton = screen.getByText('Refresh')
    fireEvent.click(refreshButton)

    expect(mockRefresh).toHaveBeenCalledTimes(1)
  })
})
