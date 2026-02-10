import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MantineProvider } from '@mantine/core'

vi.mock('../../components/charts/threejs/ErrorBackground.jsx', () => ({
  default: () => <div data-testid="error-bg">ErrorBackground</div>
}))

import ErrorPage from '../error-page'

const wrap = (ui) => (
  <MantineProvider>
    <MemoryRouter>{ui}</MemoryRouter>
  </MantineProvider>
)

describe('ErrorPage', () => {
  it('renders 404 heading', () => {
    render(wrap(<ErrorPage />))
    expect(screen.getByText('404')).toBeInTheDocument()
  })

  it('renders Oops! heading', () => {
    render(wrap(<ErrorPage />))
    expect(screen.getByText('Oops!')).toBeInTheDocument()
  })

  it('has Go Home link pointing to /login', () => {
    render(wrap(<ErrorPage />))
    const link = screen.getByRole('link', { name: /go home/i })
    expect(link).toHaveAttribute('href', '/login')
  })

  it('has Go Back button', () => {
    render(wrap(<ErrorPage />))
    expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument()
  })

  it('renders fallback when Three.js unavailable', () => {
    render(wrap(<ErrorPage />))
    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.getByText(/unexpected error/i)).toBeInTheDocument()
  })
})
