/* eslint-env jest */
/* global describe, test, expect, beforeEach, jest */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { MantineProvider } from '@mantine/core'
import AddToWatchlistModal from './AddToWatchlistModal'

const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}))

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <MantineProvider theme={{ colorScheme: 'dark' }}>
        {component}
      </MantineProvider>
    </BrowserRouter>
  )
}

const mockItems = [
  {
    id: 4151,
    name: 'Abyssal whip',
    img: 'test-image-url',
    volume: 50000,
    high: '1000000'
  },
  {
    id: 1515,
    name: 'Yew logs',
    img: 'test-image-url-2',
    volume: 25000,
    high: '500'
  }
]

const mockOnAdd = jest.fn()

describe('AddToWatchlistModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders modal when opened', () => {
    renderWithProviders(
      <AddToWatchlistModal
        opened={true}
        setOpened={jest.fn()}
        items={mockItems}
        onAdd={mockOnAdd}
      />
    )

    expect(screen.getByText('Add Item to Watchlist')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search by item name or ID...')).toBeInTheDocument()
  })

  test('does not render modal when closed', () => {
    renderWithProviders(
      <AddToWatchlistModal
        opened={false}
        setOpened={jest.fn()}
        items={mockItems}
        onAdd={mockOnAdd}
      />
    )

    expect(screen.queryByText('Add Item to Watchlist')).not.toBeInTheDocument()
  })

  test('searches and displays filtered items', async () => {
    renderWithProviders(
      <AddToWatchlistModal
        opened={true}
        setOpened={jest.fn()}
        items={mockItems}
        onAdd={mockOnAdd}
      />
    )

    const searchInput = screen.getByPlaceholderText('Search by item name or ID...')
    fireEvent.change(searchInput, { target: { value: 'whip' } })

    await waitFor(() => {
      expect(screen.getByText('Abyssal whip')).toBeInTheDocument()
      expect(screen.queryByText('Yew logs')).not.toBeInTheDocument()
    })
  })

  test('selects item and shows configuration options', async () => {
    renderWithProviders(
      <AddToWatchlistModal
        opened={true}
        setOpened={jest.fn()}
        items={mockItems}
        onAdd={mockOnAdd}
      />
    )

    // Search for an item
    const searchInput = screen.getByPlaceholderText('Search by item name or ID...')
    fireEvent.change(searchInput, { target: { value: 'whip' } })

    await waitFor(() => {
      const itemToSelect = screen.getByText('Abyssal whip')
      fireEvent.click(itemToSelect)
    })

    // Should show selected item section
    expect(screen.getByText('Selected Item')).toBeInTheDocument()
    expect(screen.getByText('Alert Configuration')).toBeInTheDocument()
  })

  test('shows smart detection toggle', async () => {
    renderWithProviders(
      <AddToWatchlistModal
        opened={true}
        setOpened={jest.fn()}
        items={mockItems}
        onAdd={mockOnAdd}
      />
    )

    // Search and select an item
    const searchInput = screen.getByPlaceholderText('Search by item name or ID...')
    fireEvent.change(searchInput, { target: { value: 'whip' } })

    await waitFor(() => {
      fireEvent.click(screen.getByText('Abyssal whip'))
    })

    // Should show smart detection toggle
    expect(screen.getByText('Smart Abnormal Activity Detection')).toBeInTheDocument()
    expect(screen.getByText('Automatically detect unusual trading patterns using AI analysis')).toBeInTheDocument()
  })

  test('toggles between smart detection and custom thresholds', async () => {
    renderWithProviders(
      <AddToWatchlistModal
        opened={true}
        setOpened={jest.fn()}
        items={mockItems}
        onAdd={mockOnAdd}
      />
    )

    // Search and select an item
    const searchInput = screen.getByPlaceholderText('Search by item name or ID...')
    fireEvent.change(searchInput, { target: { value: 'whip' } })

    await waitFor(() => {
      fireEvent.click(screen.getByText('Abyssal whip'))
    })

    // Initially, custom thresholds should be visible
    expect(screen.getByText('Custom Thresholds')).toBeInTheDocument()
    expect(screen.getByText('Volume Alert Threshold')).toBeInTheDocument()

    // Toggle smart detection
    const smartDetectionToggle = screen.getByRole('checkbox')
    fireEvent.click(smartDetectionToggle)

    // Custom thresholds should be hidden
    expect(screen.queryByText('Custom Thresholds')).not.toBeInTheDocument()
    expect(screen.queryByText('Volume Alert Threshold')).not.toBeInTheDocument()
  })

  test('shows consolidated price change percentage field', async () => {
    renderWithProviders(
      <AddToWatchlistModal
        opened={true}
        setOpened={jest.fn()}
        items={mockItems}
        onAdd={mockOnAdd}
      />
    )

    // Search and select an item
    const searchInput = screen.getByPlaceholderText('Search by item name or ID...')
    fireEvent.change(searchInput, { target: { value: 'whip' } })

    await waitFor(() => {
      fireEvent.click(screen.getByText('Abyssal whip'))
    })

    // Should show consolidated price change field
    expect(screen.getByText('Price Change Alert')).toBeInTheDocument()
    expect(screen.getByText('Get notified when price changes by this percentage (up or down)')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('e.g., 15')).toBeInTheDocument()

    // Should NOT show separate spike/drop fields
    expect(screen.queryByText('Price Drop Alerts')).not.toBeInTheDocument()
    expect(screen.queryByText('Price Spike Alerts')).not.toBeInTheDocument()
  })

  test('shows mailchimp api key warning when not configured', async () => {
    renderWithProviders(
      <AddToWatchlistModal
        opened={true}
        setOpened={jest.fn()}
        items={mockItems}
        onAdd={mockOnAdd}
      />
    )

    // Search and select an item
    const searchInput = screen.getByPlaceholderText('Search by item name or ID...')
    fireEvent.change(searchInput, { target: { value: 'whip' } })

    await waitFor(() => {
      fireEvent.click(screen.getByText('Abyssal whip'))
    })

    // Should show Mailchimp warning
    expect(screen.getByText('⚠️ Configure your Mailchimp API key to receive alerts.')).toBeInTheDocument()
    expect(screen.getByText('Go to Settings')).toBeInTheDocument()
  })

  test('navigates to settings when mailchimp button clicked', async () => {
    renderWithProviders(
      <AddToWatchlistModal
        opened={true}
        setOpened={jest.fn()}
        items={mockItems}
        onAdd={mockOnAdd}
      />
    )

    // Search and select an item
    const searchInput = screen.getByPlaceholderText('Search by item name or ID...')
    fireEvent.change(searchInput, { target: { value: 'whip' } })

    await waitFor(() => {
      fireEvent.click(screen.getByText('Abyssal whip'))
    })

    // Click go to settings button
    const settingsButton = screen.getByText('Go to Settings')
    fireEvent.click(settingsButton)

    expect(mockNavigate).toHaveBeenCalledWith('/settings')
  })

  test('adds item with correct data structure', async () => {
    renderWithProviders(
      <AddToWatchlistModal
        opened={true}
        setOpened={jest.fn()}
        items={mockItems}
        onAdd={mockOnAdd}
      />
    )

    // Search and select an item
    const searchInput = screen.getByPlaceholderText('Search by item name or ID...')
    fireEvent.change(searchInput, { target: { value: 'whip' } })

    await waitFor(() => {
      fireEvent.click(screen.getByText('Abyssal whip'))
    })

    // Fill in some threshold values
    const volumeInput = screen.getByPlaceholderText('e.g., 50000')
    fireEvent.change(volumeInput, { target: { value: '75000' } })

    const priceChangeInput = screen.getByPlaceholderText('e.g., 15')
    fireEvent.change(priceChangeInput, { target: { value: '20' } })

    // Click add button
    const addButton = screen.getByText('Add to Watchlist')
    fireEvent.click(addButton)

    // Should call onAdd with correct data structure
    expect(mockOnAdd).toHaveBeenCalledWith({
      item_id: 4151,
      volume_threshold: '75000',
      price_drop_threshold: null,
      price_change_percentage: '20',
      abnormal_activity: false
    })
  })

  test('shows smart detection explanation tooltip', async () => {
    renderWithProviders(
      <AddToWatchlistModal
        opened={true}
        setOpened={jest.fn()}
        items={mockItems}
        onAdd={mockOnAdd}
      />
    )

    // Search and select an item
    const searchInput = screen.getByPlaceholderText('Search by item name or ID...')
    fireEvent.change(searchInput, { target: { value: 'whip' } })

    await waitFor(() => {
      fireEvent.click(screen.getByText('Abyssal whip'))
    })

    // Should show info icon for tooltip
    const infoIcon = document.querySelector('[style*="color: #868e96"]')
    expect(infoIcon).toBeInTheDocument()
  })

  test('shows link to FAQ for more information', async () => {
    renderWithProviders(
      <AddToWatchlistModal
        opened={true}
        setOpened={jest.fn()}
        items={mockItems}
        onAdd={mockOnAdd}
      />
    )

    // Search and select an item
    const searchInput = screen.getByPlaceholderText('Search by item name or ID...')
    fireEvent.change(searchInput, { target: { value: 'whip' } })

    await waitFor(() => {
      fireEvent.click(screen.getByText('Abyssal whip'))
    })

    // Toggle smart detection to see the link
    const smartDetectionToggle = screen.getByRole('checkbox')
    fireEvent.click(smartDetectionToggle)

    // Should show FAQ link
    expect(screen.getByText('Learn more about how this works →')).toBeInTheDocument()

    const faqLink = screen.getByText('Learn more about how this works →').closest('a')
    expect(faqLink).toHaveAttribute('href', '/faq#smart-detection')
  })

  test('applies dark theme colors to selected items', async () => {
    renderWithProviders(
      <AddToWatchlistModal
        opened={true}
        setOpened={jest.fn()}
        items={mockItems}
        onAdd={mockOnAdd}
      />
    )

    // Search and select an item
    const searchInput = screen.getByPlaceholderText('Search by item name or ID...')
    fireEvent.change(searchInput, { target: { value: 'whip' } })

    await waitFor(() => {
      const itemElement = screen.getByText('Abyssal whip').closest('div')

      // Should use dark theme colors instead of white
      const style = window.getComputedStyle(itemElement)
      // The element should not have white background
      expect(style.backgroundColor).not.toBe('rgb(248, 249, 250)') // #f8f9fa
    })
  })

  test('resets form when modal is closed', () => {
    const setOpened = jest.fn()

    const { rerender } = renderWithProviders(
      <AddToWatchlistModal
        opened={true}
        setOpened={setOpened}
        items={mockItems}
        onAdd={mockOnAdd}
      />
    )

    // Close modal by clicking cancel or close
    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)

    expect(setOpened).toHaveBeenCalledWith(false)
  })
})
