import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'

vi.mock('../../../components/charts/AdvancedChart.jsx', () => ({
  default: (props) => <div data-testid="advanced-chart" data-has-callback={!!props.onChartDataReady} />,
  COLORS: { sell: '#f59e0b', buy: '#3b82f6' }
}))

vi.mock('../../../components/charts/threejs/FuturisticBackground.jsx', () => ({
  default: ({ chartData }) => <div data-testid="futuristic-bg" data-chart-length={chartData?.length ?? 0} />
}))

vi.mock('../../../config/featureFlags.js', () => ({
  isThreeJsChartEnabled: () => true
}))

import GraphModal from '../graph-modal'

const mockMatchMedia = (query) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn()
})

const wrap = (ui) => <MantineProvider>{ui}</MantineProvider>

describe('GraphModal data flow', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation(mockMatchMedia)
  })

  it('passes onChartDataReady to AdvancedChart', () => {
    const { getByTestId } = render(wrap(
      <GraphModal opened={true} setOpened={vi.fn()} item={{ id: 1, name: 'Test' }} id={1} items={[]} />
    ))

    const chart = getByTestId('advanced-chart')
    expect(chart.dataset.hasCallback).toBe('true')
  })

  it('passes chartData to FuturisticBackground when feature flag enabled', () => {
    const { getByTestId } = render(wrap(
      <GraphModal opened={true} setOpened={vi.fn()} item={{ id: 1, name: 'Test' }} id={1} items={[]} />
    ))

    const bg = getByTestId('futuristic-bg')
    expect(bg.dataset.chartLength).toBe('0')
  })
})
