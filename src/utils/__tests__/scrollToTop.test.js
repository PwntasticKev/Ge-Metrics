import { describe, it, expect, vi } from 'vitest'
import { isCurrentPath, scrollToTopIfCurrent } from '../scrollToTop.js'

describe('isCurrentPath', () => {
  it('matches the same path ignoring trailing slash and case', () => {
    expect(isCurrentPath('/all-items', '/all-items')).toBe(true)
    expect(isCurrentPath('/all-items', '/All-Items/')).toBe(true)
    expect(isCurrentPath('/', '/')).toBe(true)
  })

  it('does not match other pages or bad input', () => {
    expect(isCurrentPath('/all-items', '/high-volumes')).toBe(false)
    expect(isCurrentPath('/all-items', '/all-items/123')).toBe(false)
    expect(isCurrentPath(undefined, '/')).toBe(false)
  })
})

describe('scrollToTopIfCurrent', () => {
  it('smooth-scrolls to the top on the current page', () => {
    const win = { scrollTo: vi.fn() }
    expect(scrollToTopIfCurrent('/herbs', '/herbs', win)).toBe(true)
    expect(win.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  })

  it('does nothing for another page', () => {
    const win = { scrollTo: vi.fn() }
    expect(scrollToTopIfCurrent('/herbs', '/all-items', win)).toBe(false)
    expect(win.scrollTo).not.toHaveBeenCalled()
  })
})
