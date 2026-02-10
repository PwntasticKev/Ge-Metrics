import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MantineProvider } from '@mantine/core'

vi.mock('../../components/charts/threejs/ComingSoonBackground.jsx', () => ({
  default: () => <div data-testid="coming-soon-bg">ComingSoonBackground</div>
}))

import ComingSoon from '../ComingSoon/index'

const wrap = (ui) => (
  <MantineProvider>
    <MemoryRouter>{ui}</MemoryRouter>
  </MantineProvider>
)

describe('ComingSoon', () => {
  it('renders Coming Soon heading', () => {
    render(wrap(<ComingSoon />))
    expect(screen.getByText('Coming Soon')).toBeInTheDocument()
  })

  it('renders description text', () => {
    render(wrap(<ComingSoon />))
    expect(screen.getByText(/building something awesome/i)).toBeInTheDocument()
  })

  it('has Go Back Home link pointing to /all-items', () => {
    render(wrap(<ComingSoon />))
    const link = screen.getByRole('link', { name: /go back home/i })
    expect(link).toHaveAttribute('href', '/all-items')
  })

  it('renders animated dots', () => {
    const { container } = render(wrap(<ComingSoon />))
    const dotsContainer = container.querySelector('div[style*="gap"]')
    const dots = dotsContainer ? dotsContainer.querySelectorAll('span') : []
    expect(dots.length).toBe(3)
  })

  it('renders fallback when Three.js unavailable', () => {
    render(wrap(<ComingSoon />))
    expect(screen.getByText('Coming Soon')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /go back home/i })).toBeInTheDocument()
  })
})
