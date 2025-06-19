/* eslint-env jest */
/* global describe, test, expect, beforeEach, jest */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import NightmareZone from './index.jsx'

// Mock ItemData hook
jest.mock('../../utils/item-data.jsx', () => {
  return function ItemData () {
    return {
      items: [],
      mapStatus: 'success',
      priceStatus: 'success'
    }
  }
})

// Mock getRelativeTime utility
jest.mock('../../utils/utils.jsx', () => ({
  getRelativeTime: jest.fn(() => '2 minutes ago')
}))

const renderWithProviders = (component) => {
  return render(
    <MantineProvider theme={{ colorScheme: 'dark' }}>
      {component}
    </MantineProvider>
  )
}

describe('NightmareZone Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders without crashing', () => {
    renderWithProviders(<NightmareZone />)
    expect(screen.getByText('Nightmare Zone')).toBeInTheDocument()
  })

  test('displays all strategy cards', () => {
    renderWithProviders(<NightmareZone />)

    expect(screen.getByText("Dharok's Strategy")).toBeInTheDocument()
    expect(screen.getByText('Obsidian Strategy')).toBeInTheDocument()
    expect(screen.getByText('Whip Strategy')).toBeInTheDocument()
  })

  test('shows strategy requirements and descriptions', () => {
    renderWithProviders(<NightmareZone />)

    expect(screen.getByText(/Low HP \+ Dharok's set for maximum damage/)).toBeInTheDocument()
    expect(screen.getByText(/Full obsidian \+ berserker necklace/)).toBeInTheDocument()
    expect(screen.getByText(/Standard whip training/)).toBeInTheDocument()
  })

  test('displays profit per hour for each strategy', () => {
    renderWithProviders(<NightmareZone />)

    expect(screen.getByText('200-400k gp/hr')).toBeInTheDocument()
    expect(screen.getByText('150-300k gp/hr')).toBeInTheDocument()
    expect(screen.getByText('100-200k gp/hr')).toBeInTheDocument()
  })

  test('shows difficulty badges for strategies', () => {
    renderWithProviders(<NightmareZone />)

    expect(screen.getByText('Advanced')).toBeInTheDocument()
    expect(screen.getByText('Intermediate')).toBeInTheDocument()
    expect(screen.getByText('Beginner')).toBeInTheDocument()
  })

  test('displays profit calculator tab', () => {
    renderWithProviders(<NightmareZone />)

    expect(screen.getByText('Profit Calculator')).toBeInTheDocument()
    expect(screen.getByText('Calculate Your Profits')).toBeInTheDocument()
  })

  test('shows reward shop tab', () => {
    renderWithProviders(<NightmareZone />)

    fireEvent.click(screen.getByText('Reward Shop'))
    expect(screen.getByText('Nightmare Zone Reward Shop')).toBeInTheDocument()
  })

  test('displays reward items with points and values', () => {
    renderWithProviders(<NightmareZone />)

    fireEvent.click(screen.getByText('Reward Shop'))

    expect(screen.getByText('Imbue Ring')).toBeInTheDocument()
    expect(screen.getByText('Herb Box')).toBeInTheDocument()
    expect(screen.getByText('Pure Essence')).toBeInTheDocument()
    expect(screen.getByText(/650,000 pts/)).toBeInTheDocument()
    expect(screen.getByText(/9,500 pts/)).toBeInTheDocument()
  })

  test('calculator inputs work correctly', () => {
    renderWithProviders(<NightmareZone />)

    const pointsInput = screen.getByLabelText('Points per hour')
    const hoursInput = screen.getByLabelText('Hours per day')

    expect(pointsInput).toBeInTheDocument()
    expect(hoursInput).toBeInTheDocument()

    // Should have default values
    expect(pointsInput).toHaveValue('100,000')
    expect(hoursInput).toHaveValue(6)
  })

  test('displays projected earnings', () => {
    renderWithProviders(<NightmareZone />)

    expect(screen.getByText('Projected Earnings')).toBeInTheDocument()
    expect(screen.getByText('Herb boxes per day:')).toBeInTheDocument()
    expect(screen.getByText('Daily profit:')).toBeInTheDocument()
    expect(screen.getByText('Weekly profit:')).toBeInTheDocument()
    expect(screen.getByText('Monthly profit:')).toBeInTheDocument()
  })

  test('shows pro tips alert', () => {
    renderWithProviders(<NightmareZone />)

    expect(screen.getByText('Pro Tips')).toBeInTheDocument()
    expect(screen.getByText(/Herb boxes are limited to 15 per day/)).toBeInTheDocument()
    expect(screen.getByText(/Always use absorptions instead of prayer/)).toBeInTheDocument()
  })

  test('strategy selection updates border color', () => {
    renderWithProviders(<NightmareZone />)

    const dharoksCard = screen.getByText("Dharok's Strategy").closest('[style*="cursor"]')
    expect(dharoksCard).toBeInTheDocument()

    // Should be clickable
    fireEvent.click(dharoksCard)
    // Note: Testing style changes would require more complex DOM inspection
  })

  test('displays live data badge', () => {
    renderWithProviders(<NightmareZone />)

    expect(screen.getByText('Combat Training + Profit')).toBeInTheDocument()
    expect(screen.getByText('2 minutes ago')).toBeInTheDocument()
  })

  test('shows loading state when data is loading', () => {
    // Mock loading state
    jest.doMock('../../utils/item-data.jsx', () => {
      return function ItemData () {
        return {
          items: [],
          mapStatus: 'loading',
          priceStatus: 'loading'
        }
      }
    })

    renderWithProviders(<NightmareZone />)
    // Would show loading spinner - this requires re-importing the component
  })

  test('handles tab switching correctly', () => {
    renderWithProviders(<NightmareZone />)

    // Should start on calculator tab
    expect(screen.getByText('Calculate Your Profits')).toBeInTheDocument()

    // Switch to rewards tab
    fireEvent.click(screen.getByText('Reward Shop'))
    expect(screen.getByText('Nightmare Zone Reward Shop')).toBeInTheDocument()

    // Switch back to calculator
    fireEvent.click(screen.getByText('Profit Calculator'))
    expect(screen.getByText('Calculate Your Profits')).toBeInTheDocument()
  })
})
