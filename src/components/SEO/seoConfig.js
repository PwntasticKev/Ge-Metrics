const SITE_URL = 'https://ge-metrics.com'
const SITE_NAME = 'GE Metrics'
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`

const defaultMeta = {
  title: 'GE Metrics - OSRS Grand Exchange Analytics & Flip Tracker',
  description: 'Track Old School RuneScape Grand Exchange prices, analyze market trends, and maximize your flipping profits with real-time data and AI predictions.',
  ogImage: DEFAULT_OG_IMAGE,
  ogType: 'website'
}

const routeMeta = {
  '/login': {
    title: 'Login - GE Metrics',
    description: 'Sign in to GE Metrics to track OSRS Grand Exchange prices, manage your watchlist, and access real-time market analytics.'
  },
  '/signup': {
    title: 'Sign Up - GE Metrics | Free OSRS Market Analytics',
    description: 'Create a free GE Metrics account to track Old School RuneScape Grand Exchange prices, set price alerts, and discover profitable flips.'
  },
  '/signup/success': {
    title: 'Welcome to GE Metrics!',
    description: 'Your GE Metrics account is ready. Start tracking OSRS Grand Exchange prices and finding profitable flips.'
  },
  '/terms': {
    title: 'Terms & Privacy Policy - GE Metrics',
    description: 'Read the GE Metrics terms of service and privacy policy. Learn how we handle your data and protect your privacy.'
  },
  '/contact': {
    title: 'Contact Us - GE Metrics',
    description: 'Get in touch with the GE Metrics team. Report issues, suggest features, or ask questions about OSRS market analytics.'
  },
  '/affiliate': {
    title: 'Partner Program - GE Metrics',
    description: 'Join the GE Metrics partner program. Earn commission promoting OSRS market analytics tools to your audience.'
  }
}

export function getMetaForRoute(pathname) {
  const meta = routeMeta[pathname]
  return {
    title: meta?.title || defaultMeta.title,
    description: meta?.description || defaultMeta.description,
    ogImage: meta?.ogImage || defaultMeta.ogImage,
    ogType: meta?.ogType || defaultMeta.ogType,
    canonical: `${SITE_URL}${pathname === '/' ? '' : pathname}`
  }
}

export { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE, defaultMeta, routeMeta }
