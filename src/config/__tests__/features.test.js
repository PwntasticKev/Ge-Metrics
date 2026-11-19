import { describe, it, expect } from 'vitest'
import { BACKEND_ENABLED, DEFAULT_PATH, isBackendOnlyPath, isPathAvailable, staticRedirectFor } from '../features.js'

describe('isBackendOnlyPath', () => {
  it.each(['/login', '/billing', '/admin', '/admin/user-management', '/profile/12', '/settings'])(
    'flags %s as backend-only',
    path => expect(isBackendOnlyPath(path)).toBe(true)
  )

  it.each(['/all-items', '/item/4151', '/high-alchemy', '/market-watch/food', '/faq', '/adminx', '/'])(
    'keeps %s available',
    path => expect(isBackendOnlyPath(path)).toBe(false)
  )

  it('matches case-insensitively like React Router', () => {
    expect(isBackendOnlyPath('/Billing')).toBe(true)
    expect(isBackendOnlyPath('/ADMIN/users')).toBe(true)
  })

  it('ignores non-string input', () => {
    expect(isBackendOnlyPath(undefined)).toBe(false)
  })
})

describe('staticRedirectFor', () => {
  it('sends pages with a static equivalent to /recipes', () => {
    expect(staticRedirectFor('/global-recipes')).toBe('/recipes')
    expect(staticRedirectFor('/Money-Making-Methods/')).toBe('/recipes?method=money-makers')
    expect(staticRedirectFor('/global-money-making-methods')).toBe('/recipes?method=money-makers')
  })

  it('sends everything else to the default page', () => {
    expect(staticRedirectFor('/billing')).toBe(DEFAULT_PATH)
    expect(staticRedirectFor(undefined)).toBe(DEFAULT_PATH)
  })

  it('keeps /recipes available without a backend', () => {
    expect(isBackendOnlyPath('/recipes')).toBe(false)
  })
})

describe('isPathAvailable', () => {
  it('defaults to static mode (backend disabled)', () => {
    expect(BACKEND_ENABLED).toBe(false)
    expect(isPathAvailable('/billing')).toBe(false)
    expect(isPathAvailable('/all-items')).toBe(true)
  })
})
