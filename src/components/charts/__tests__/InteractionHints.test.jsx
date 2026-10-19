import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import InteractionHints from '../InteractionHints'

const wrap = (ui) => <MantineProvider>{ui}</MantineProvider>

describe('InteractionHints', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.getItem.mockReturnValue(null)
    localStorage.setItem.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows hints when not previously seen', () => {
    render(wrap(<InteractionHints />))
    expect(screen.getByText('to pan')).toBeInTheDocument()
    expect(screen.getByText('to zoom')).toBeInTheDocument()
    expect(screen.getByText('to select range')).toBeInTheDocument()
  })

  it('does not show hints when previously dismissed', () => {
    localStorage.getItem.mockReturnValue('true')
    render(wrap(<InteractionHints />))
    expect(screen.queryByText('to pan')).not.toBeInTheDocument()
  })

  it('dismisses on click and sets localStorage', () => {
    render(wrap(<InteractionHints />))
    const overlay = screen.getByText('to pan').closest('[class]')
    fireEvent.click(overlay)
    expect(localStorage.setItem).toHaveBeenCalledWith('ge_metrics_chart_hints_seen', 'true')
  })

  it('auto-dismisses after 5 seconds', () => {
    render(wrap(<InteractionHints />))
    expect(screen.getByText('to pan')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(localStorage.setItem).toHaveBeenCalledWith('ge_metrics_chart_hints_seen', 'true')
  })
})
