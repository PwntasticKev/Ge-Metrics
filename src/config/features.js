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
  '/recipes',
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
