import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals'
import ProfitOpportunities from './index.jsx'

// Mock data for testing
const mockOpportunities = [
  {
    id: 1,
    item_name: 'Dragon Scimitar',
    item_id: 4587,
    source_type: 'reddit',
    source_url: 'https://reddit.com/r/2007scape/comments/123456',
    source_title: 'Dragon Scimitar getting buffed in next update',
    source_content: 'JMod confirmed Dragon Scimitar will receive a significant damage boost...',
    confidence_score: 0.85,
    profit_potential: 2500000,
    risk_level: 'low',
    category: 'combat',
    keywords: ['buff', 'dragon scimitar', 'combat'],
    created_at: '2024-01-15T10:30:00Z',
    status: 'active',
    verified: false,
    verified_profit: null,
    verified_at: null,
    notes: ''
  },
  {
    id: 2,
    item_name: 'Rune Essence',
    item_id: 1436,
    source_type: 'blog',
    source_url: 'https://oldschool.runescape.wiki/w/Update:New_Runecrafting_Methods',
    source_title: 'New Runecrafting methods introduced',
    source_content: 'New runecrafting methods will require more rune essence...',
    confidence_score: 0.72,
    profit_potential: 1500000,
    risk_level: 'medium',
    category: 'skilling',
    keywords: ['runecrafting', 'rune essence', 'new method'],
    created_at: '2024-01-15T09:15:00Z',
    status: 'active',
    verified: false,
    verified_profit: null,
    verified_at: null,
    notes: ''
  }
]

const renderWithProvider = (component) => {
  return render(
    <MantineProvider>
      {component}
    </MantineProvider>
  )
}

describe('ProfitOpportunities', () => {
  beforeEach(() => {
    // Mock window.open
    Object.defineProperty(window, 'open', {
      value: jest.fn(),
      writable: true
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  test('renders the component with title', () => {
    renderWithProvider(<ProfitOpportunities />)
    expect(screen.getByText('Profit Opportunities')).toBeInTheDocument()
  })

  test('displays stats cards', () => {
    renderWithProvider(<ProfitOpportunities />)

    expect(screen.getByText('Total Opportunities')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('High Confidence')).toBeInTheDocument()
    expect(screen.getByText('Verified Profit')).toBeInTheDocument()
  })

  test('displays opportunities table', () => {
    renderWithProvider(<ProfitOpportunities />)

    expect(screen.getByText('Dragon Scimitar')).toBeInTheDocument()
    expect(screen.getByText('Rune Essence')).toBeInTheDocument()
    expect(screen.getByText('reddit')).toBeInTheDocument()
    expect(screen.getByText('blog')).toBeInTheDocument()
  })

  test('filters opportunities by search term', () => {
    renderWithProvider(<ProfitOpportunities />)

    const searchInput = screen.getByPlaceholderText('Search items, titles, keywords...')
    fireEvent.change(searchInput, { target: { value: 'Dragon' } })

    expect(screen.getByText('Dragon Scimitar')).toBeInTheDocument()
    expect(screen.queryByText('Rune Essence')).not.toBeInTheDocument()
  })

  test('filters opportunities by confidence level', () => {
    renderWithProvider(<ProfitOpportunities />)

    const confidenceSelect = screen.getByDisplayValue('All Confidence')
    fireEvent.change(confidenceSelect, { target: { value: '0.8' } })

    // Should only show Dragon Scimitar (85% confidence)
    expect(screen.getByText('Dragon Scimitar')).toBeInTheDocument()
    expect(screen.queryByText('Rune Essence')).not.toBeInTheDocument()
  })

  test('filters opportunities by risk level', () => {
    renderWithProvider(<ProfitOpportunities />)

    const riskSelect = screen.getByDisplayValue('All Risk')
    fireEvent.change(riskSelect, { target: { value: 'low' } })

    // Should only show Dragon Scimitar (low risk)
    expect(screen.getByText('Dragon Scimitar')).toBeInTheDocument()
    expect(screen.queryByText('Rune Essence')).not.toBeInTheDocument()
  })

  test('filters opportunities by category', () => {
    renderWithProvider(<ProfitOpportunities />)

    const categorySelect = screen.getByDisplayValue('All Categories')
    fireEvent.change(categorySelect, { target: { value: 'combat' } })

    // Should only show Dragon Scimitar (combat category)
    expect(screen.getByText('Dragon Scimitar')).toBeInTheDocument()
    expect(screen.queryByText('Rune Essence')).not.toBeInTheDocument()
  })

  test('opens detail modal when clicking eye icon', async () => {
    renderWithProvider(<ProfitOpportunities />)

    const eyeIcons = screen.getAllByTestId('IconEye')
    fireEvent.click(eyeIcons[0])

    await waitFor(() => {
      expect(screen.getByText('Opportunity Details')).toBeInTheDocument()
      expect(screen.getByText('Dragon Scimitar')).toBeInTheDocument()
    })
  })

  test('opens verification modal when clicking check icon', async () => {
    renderWithProvider(<ProfitOpportunities />)

    const checkIcons = screen.getAllByTestId('IconCheck')
    fireEvent.click(checkIcons[0])

    await waitFor(() => {
      expect(screen.getByText('Verify Opportunity')).toBeInTheDocument()
      expect(screen.getByText('Actual Profit (GP)')).toBeInTheDocument()
    })
  })

  test('saves verification data', async () => {
    renderWithProvider(<ProfitOpportunities />)

    // Open verification modal
    const checkIcons = screen.getAllByTestId('IconCheck')
    fireEvent.click(checkIcons[0])

    await waitFor(() => {
      expect(screen.getByText('Verify Opportunity')).toBeInTheDocument()
    })

    // Fill in verification data
    const profitInput = screen.getByLabelText('Actual Profit (GP)')
    const notesInput = screen.getByLabelText('Notes')

    fireEvent.change(profitInput, { target: { value: '3000000' } })
    fireEvent.change(notesInput, { target: { value: 'Great profit opportunity!' } })

    // Save verification
    const saveButton = screen.getByText('Save Verification')
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.queryByText('Verify Opportunity')).not.toBeInTheDocument()
    })
  })

  test('marks opportunity as expired', () => {
    renderWithProvider(<ProfitOpportunities />)

    const xIcons = screen.getAllByTestId('IconX')
    fireEvent.click(xIcons[0])

    // Should show expired status
    expect(screen.getByText('expired')).toBeInTheDocument()
  })

  test('opens external link when clicking link icon', () => {
    renderWithProvider(<ProfitOpportunities />)

    const linkIcons = screen.getAllByTestId('IconExternalLink')
    fireEvent.click(linkIcons[0])

    expect(window.open).toHaveBeenCalledWith(
      'https://reddit.com/r/2007scape/comments/123456',
      '_blank'
    )
  })

  test('displays confidence scores correctly', () => {
    renderWithProvider(<ProfitOpportunities />)

    expect(screen.getByText('85%')).toBeInTheDocument()
    expect(screen.getByText('72%')).toBeInTheDocument()
  })

  test('displays profit potential correctly', () => {
    renderWithProvider(<ProfitOpportunities />)

    expect(screen.getByText('2,500,000 GP')).toBeInTheDocument()
    expect(screen.getByText('1,500,000 GP')).toBeInTheDocument()
  })

  test('displays risk levels with correct colors', () => {
    renderWithProvider(<ProfitOpportunities />)

    const lowRiskBadge = screen.getByText('low')
    const mediumRiskBadge = screen.getByText('medium')

    expect(lowRiskBadge).toBeInTheDocument()
    expect(mediumRiskBadge).toBeInTheDocument()
  })

  test('displays categories correctly', () => {
    renderWithProvider(<ProfitOpportunities />)

    expect(screen.getByText('combat')).toBeInTheDocument()
    expect(screen.getByText('skilling')).toBeInTheDocument()
  })

  test('shows keywords in detail modal', async () => {
    renderWithProvider(<ProfitOpportunities />)

    const eyeIcons = screen.getAllByTestId('IconEye')
    fireEvent.click(eyeIcons[0])

    await waitFor(() => {
      expect(screen.getByText('buff')).toBeInTheDocument()
      expect(screen.getByText('dragon scimitar')).toBeInTheDocument()
      expect(screen.getByText('combat')).toBeInTheDocument()
    })
  })

  test('displays source information correctly', async () => {
    renderWithProvider(<ProfitOpportunities />)

    const eyeIcons = screen.getAllByTestId('IconEye')
    fireEvent.click(eyeIcons[0])

    await waitFor(() => {
      expect(screen.getByText('Dragon Scimitar getting buffed in next update')).toBeInTheDocument()
      expect(screen.getByText('View Source')).toBeInTheDocument()
    })
  })

  test('handles empty search results', () => {
    renderWithProvider(<ProfitOpportunities />)

    const searchInput = screen.getByPlaceholderText('Search items, titles, keywords...')
    fireEvent.change(searchInput, { target: { value: 'NonExistentItem' } })

    expect(screen.queryByText('Dragon Scimitar')).not.toBeInTheDocument()
    expect(screen.queryByText('Rune Essence')).not.toBeInTheDocument()
  })

  test('resets filters when changing search term', () => {
    renderWithProvider(<ProfitOpportunities />)

    // Apply multiple filters
    const confidenceSelect = screen.getByDisplayValue('All Confidence')
    const riskSelect = screen.getByDisplayValue('All Risk')

    fireEvent.change(confidenceSelect, { target: { value: '0.8' } })
    fireEvent.change(riskSelect, { target: { value: 'low' } })

    // Clear search
    const searchInput = screen.getByPlaceholderText('Search items, titles, keywords...')
    fireEvent.change(searchInput, { target: { value: '' } })

    // Should show filtered results based on other filters
    expect(screen.getByText('Dragon Scimitar')).toBeInTheDocument()
    expect(screen.queryByText('Rune Essence')).not.toBeInTheDocument()
  })
})
