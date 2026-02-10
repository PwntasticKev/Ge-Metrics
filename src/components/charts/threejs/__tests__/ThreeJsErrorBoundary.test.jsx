import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ThreeJsErrorBoundary from '../ThreeJsErrorBoundary'

const ThrowingChild = () => {
  throw new Error('test error')
}

describe('ThreeJsErrorBoundary', () => {
  it('renders children normally when no error', () => {
    render(
      <ThreeJsErrorBoundary>
        <div>child content</div>
      </ThreeJsErrorBoundary>
    )
    expect(screen.getByText('child content')).toBeInTheDocument()
  })

  it('catches errors and renders null', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { container } = render(
      <ThreeJsErrorBoundary>
        <ThrowingChild />
      </ThreeJsErrorBoundary>
    )

    expect(container.innerHTML).toBe('')
    spy.mockRestore()
  })

  it('logs warning on error', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    render(
      <ThreeJsErrorBoundary>
        <ThrowingChild />
      </ThreeJsErrorBoundary>
    )

    expect(spy).toHaveBeenCalledWith(
      'Three.js background failed to load:',
      'test error'
    )
    spy.mockRestore()
  })
})
