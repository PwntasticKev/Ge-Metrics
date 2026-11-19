// Feature flags for the deployment mode.
//
// The site can run in two modes:
// - Static (default): no backend, no database. Price data comes straight from
//   the OSRS Wiki API in the browser. Accounts, billing, admin and other
//   DB-backed features are hidden.
// - Backend: the original Express/tRPC server + Postgres. Enable with
//   VITE_BACKEND_ENABLED=true.

export const BACKEND_ENABLED = import.meta.env.VITE_BACKEND_ENABLED === 'true'

// Routes that only work with the backend/database. In static mode they are
// hidden from navigation and redirected to the default page.
export const BACKEND_ONLY_PATH_PREFIXES = [
  '/login',
  '/signup',
  '/verify-email',
  '/email-verified',
  '/billing',
  '/admin',
  '/profile',
  '/global-recipes',
  '/money-making-methods',
  '/global-money-making-methods',
  '/suggested-items',
  '/community',
  '/flip-history',
  '/affiliate',
  '/settings'
]

export const DEFAULT_PATH = '/all-items'

// Backend-only pages that have a static-mode equivalent: send them there
// instead of the default page. /recipes serves wiki recipes and browser-saved
// user recipes without an account.
export const STATIC_REDIRECTS = Object.freeze({
  '/global-recipes': '/recipes',
  '/money-making-methods': '/recipes?method=money-makers',
  '/global-money-making-methods': '/recipes?method=money-makers'
})

// Where an unavailable path should go in static mode.
export function staticRedirectFor (path) {
  const normalized = typeof path === 'string' ? path.toLowerCase().replace(/\/+$/, '') : ''
  return STATIC_REDIRECTS[normalized] ?? DEFAULT_PATH
}

export function isBackendOnlyPath (path) {
  if (typeof path !== 'string') return false
  // React Router matches case-insensitively, so compare lowercased.
  const normalized = path.toLowerCase()
  return BACKEND_ONLY_PATH_PREFIXES.some(
    prefix => normalized === prefix || normalized.startsWith(`${prefix}/`)
  )
}

export function isPathAvailable (path) {
  return BACKEND_ENABLED || !isBackendOnlyPath(path)
}
