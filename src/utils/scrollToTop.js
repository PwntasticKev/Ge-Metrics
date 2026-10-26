// Nav links: clicking the link for the page you're already on scrolls back
// to the top instead of doing nothing.

const normalizePath = path => (typeof path === 'string' ? path.replace(/\/+$/, '').toLowerCase() || '/' : null)

export function isCurrentPath (link, pathname) {
  const target = normalizePath(link)
  return target !== null && target === normalizePath(pathname)
}

// Smooth-scrolls to the top when `link` is the current page. Returns whether it did.
export function scrollToTopIfCurrent (link, pathname, win = typeof window === 'undefined' ? null : window) {
  if (!win || !isCurrentPath(link, pathname)) return false
  win.scrollTo({ top: 0, behavior: 'smooth' })
  return true
}
