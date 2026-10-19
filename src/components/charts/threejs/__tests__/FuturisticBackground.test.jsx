import { describe, it, expect, vi } from 'vitest'

// Mock Three.js and R3F to avoid WebGL in tests
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }) => <div data-testid="r3f-canvas">{children}</div>,
  useFrame: vi.fn()
}))

vi.mock('@react-three/drei', () => ({
  PerspectiveCamera: () => null
}))

vi.mock('three', () => ({
  Color: vi.fn().mockImplementation((c) => ({ r: 0, g: 0, b: 0 })),
  DoubleSide: 2,
  AdditiveBlending: 2,
  default: {}
}))

vi.mock('../TronGrid.jsx', () => ({
  default: () => <div data-testid="tron-grid" />
}))

vi.mock('../ParticleField.jsx', () => ({
  default: ({ volumeData, priceExtremes }) => (
    <div data-testid="particle-field" data-vol-count={volumeData.length} data-ext-count={priceExtremes.length} />
  )
}))

import { render, screen } from '@testing-library/react'
import FuturisticBackground from '../FuturisticBackground'

describe('FuturisticBackground', () => {
  it('renders canvas with TronGrid and ParticleField', () => {
    render(<FuturisticBackground chartData={[]} />)
    expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument()
    expect(screen.getByTestId('tron-grid')).toBeInTheDocument()
    expect(screen.getByTestId('particle-field')).toBeInTheDocument()
  })

  it('passes volume data to ParticleField', () => {
    const chartData = [
      { high: 100, low: 90, buyVolume: 50, sellVolume: 30 },
      { high: 110, low: 95, buyVolume: 200, sellVolume: 300 },
      { high: 105, low: 92, buyVolume: 40, sellVolume: 20 }
    ]
    render(<FuturisticBackground chartData={chartData} />)
    const field = screen.getByTestId('particle-field')
    expect(field.dataset.volCount).toBe('3')
  })

  it('computes price extremes from chartData', () => {
    const chartData = [
      { high: 100, low: 90, buyVolume: 50, sellVolume: 30 },
      { high: 200, low: 190, buyVolume: 50, sellVolume: 30 },
      { high: 50, low: 40, buyVolume: 50, sellVolume: 30 }
    ]
    render(<FuturisticBackground chartData={chartData} />)
    const field = screen.getByTestId('particle-field')
    // Should have 2 extremes: min and max
    expect(field.dataset.extCount).toBe('2')
  })

  it('handles empty chartData gracefully', () => {
    render(<FuturisticBackground />)
    const field = screen.getByTestId('particle-field')
    expect(field.dataset.volCount).toBe('0')
    expect(field.dataset.extCount).toBe('0')
  })
})
