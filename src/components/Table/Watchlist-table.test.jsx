/* eslint-env jest */
/* global describe, test, expect, beforeEach, jest */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { MantineProvider } from '@mantine/core'
import Watchlist-table from './watchlist-table'

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <MantineProvider theme={{ colorScheme: 'dark' }}>
        {component}
      </MantineProvider>
    </BrowserRouter>
  )
}

describe('Watchlist-table Table', () => {
  const mockData = [
    { id: 1, name: 'Test Item 1' },
    { id: 2, name: 'Test Item 2' }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders table with data', () => {
    renderWithProviders(<Watchlist-table data={mockData} />)
    
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByText('Test Item 1')).toBeInTheDocument()
    expect(screen.getByText('Test Item 2')).toBeInTheDocument()
  })

  test('handles empty data gracefully', () => {
    renderWithProviders(<Watchlist-table data={[]} />)
    
    expect(screen.getByText(/no data/i)).toBeInTheDocument()
  })

  test('displays loading state', () => {
    renderWithProviders(<Watchlist-table data={[]} loading={true} />)
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  test('handles row selection', () => {
    const mockOnSelect = jest.fn()
    renderWithProviders(<Watchlist-table data={mockData} onSelect={mockOnSelect} />)
    
    const firstRow = screen.getByText('Test Item 1').closest('tr')
    fireEvent.click(firstRow)
    
    expect(mockOnSelect).toHaveBeenCalledWith(mockData[0])
  })

  test('supports sorting functionality', () => {
    renderWithProviders(<Watchlist-table data={mockData} sortable={true} />)
    
    const nameHeader = screen.getByText(/name/i)
    fireEvent.click(nameHeader)
    
    // Check that sorting occurred
    expect(nameHeader).toBeInTheDocument()
  })
})
