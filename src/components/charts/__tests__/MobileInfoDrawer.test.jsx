import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import MobileInfoDrawer from '../MobileInfoDrawer'

// Mantine Drawer uses useMediaQuery internally which calls matchMedia.addEventListener
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  })
})

const wrap = (ui) => <MantineProvider>{ui}</MantineProvider>

const COLORS = {
  sell: '#f59e0b',
  buy: '#3b82f6'
}

const mockData = {
  dateFormatted: 'Mon 12:00 PM',
  dateObj: new Date(),
  high: 1500,
  low: 1400,
  buyVolume: 500,
  sellVolume: 600,
  sma20: 1450,
  ema20: 1460
}

const defaultVisibility = {
  highPrice: true,
  lowPrice: true,
  buyVolume: true,
  sellVolume: true,
  sma20: false,
  ema20: false
}

describe('MobileInfoDrawer', () => {
  it('renders tap target button', () => {
    render(wrap(
      <MobileInfoDrawer data={mockData} seriesVisibility={defaultVisibility} COLORS={COLORS} />
    ))
    expect(screen.getByText('Tap for details')).toBeInTheDocument()
  })

  it('opens drawer on tap', () => {
    render(wrap(
      <MobileInfoDrawer data={mockData} seriesVisibility={defaultVisibility} COLORS={COLORS} />
    ))
    fireEvent.click(screen.getByText('Tap for details'))
    expect(screen.getByText('Mon 12:00 PM')).toBeInTheDocument()
    expect(screen.getByText('1,500')).toBeInTheDocument()
    expect(screen.getByText('1,400')).toBeInTheDocument()
  })

  it('shows hover prompt when no data', () => {
    render(wrap(
      <MobileInfoDrawer data={null} seriesVisibility={defaultVisibility} COLORS={COLORS} />
    ))
    fireEvent.click(screen.getByText('Tap for details'))
    expect(screen.getByText('Hover chart for details')).toBeInTheDocument()
  })

  it('respects series visibility', () => {
    const vis = { ...defaultVisibility, highPrice: false }
    render(wrap(
      <MobileInfoDrawer data={mockData} seriesVisibility={vis} COLORS={COLORS} />
    ))
    fireEvent.click(screen.getByText('Tap for details'))
    // Buy price should show, sell should not
    expect(screen.getByText('1,400')).toBeInTheDocument()
    expect(screen.queryByText('1,500')).not.toBeInTheDocument()
  })
})
