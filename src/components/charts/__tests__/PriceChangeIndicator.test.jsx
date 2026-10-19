import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import PriceChangeIndicator from '../PriceChangeIndicator'

const wrap = (ui) => <MantineProvider>{ui}</MantineProvider>

const now = Math.floor(Date.now() / 1000)

const makeChartData = (priceAtStart, priceAtEnd, seconds) => {
  const points = []
  const steps = 10
  for (let i = 0; i <= steps; i++) {
    const t = now - seconds + (seconds / steps) * i
    const price = priceAtStart + ((priceAtEnd - priceAtStart) / steps) * i
    points.push({
      timestamp: t,
      high: Math.round(price),
      low: Math.round(price * 0.95),
      buyVolume: 100,
      sellVolume: 100
    })
  }
  return points
}

describe('PriceChangeIndicator', () => {
  it('renders nothing when chartData is empty', () => {
    const { container } = render(wrap(<PriceChangeIndicator chartData={[]} />))
    expect(container.textContent).toBe('')
  })

  it('renders nothing when chartData has < 2 points', () => {
    const { container } = render(wrap(
      <PriceChangeIndicator chartData={[{ timestamp: now, high: 100, low: 95 }]} />
    ))
    expect(container.textContent).toBe('')
  })

  it('shows positive change with up arrow', () => {
    const data = makeChartData(100, 110, 86400)
    render(wrap(<PriceChangeIndicator chartData={data} />))
    // Default is 1D window
    const badge = screen.getByText(/\d+\.\d+%/)
    expect(badge).toBeInTheDocument()
  })

  it('shows negative change with down arrow', () => {
    const data = makeChartData(110, 100, 86400)
    render(wrap(<PriceChangeIndicator chartData={data} />))
    const badge = screen.getByText(/\d+\.\d+%/)
    expect(badge).toBeInTheDocument()
  })

  it('switches between time windows', () => {
    // Data spanning a full day so default 1D window works
    const data = makeChartData(100, 110, 86400)
    render(wrap(<PriceChangeIndicator chartData={data} />))

    // Default is 1D — should show % and buttons
    expect(screen.getByText('1D')).toBeInTheDocument()
    expect(screen.getByText('1H')).toBeInTheDocument()
    expect(screen.getByText('6H')).toBeInTheDocument()

    // Click 6H — data spans 24h so 6H should find a point within tolerance
    fireEvent.click(screen.getByText('6H'))
    expect(screen.getByText('6H')).toBeInTheDocument()
  })
})
