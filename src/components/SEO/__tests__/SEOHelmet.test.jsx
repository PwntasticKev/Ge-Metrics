import React from 'react'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { describe, it, expect, beforeEach } from 'vitest'
import SEOHelmet from '../SEOHelmet'
import { getMetaForRoute, SITE_URL } from '../seoConfig'

function renderWithProviders(ui, { route = '/' } = {}) {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[route]}>
        {ui}
      </MemoryRouter>
    </HelmetProvider>
  )
}

describe('SEOHelmet', () => {
  beforeEach(() => {
    document.title = ''
  })

  it('renders default title for unknown route', async () => {
    renderWithProviders(<SEOHelmet />, { route: '/unknown' })
    await waitFor(() => {
      expect(document.title).toContain('GE Metrics')
    })
  })

  it('renders login-specific title', async () => {
    renderWithProviders(<SEOHelmet />, { route: '/login' })
    await waitFor(() => {
      expect(document.title).toContain('Login')
    })
  })

  it('renders signup-specific title', async () => {
    renderWithProviders(<SEOHelmet />, { route: '/signup' })
    await waitFor(() => {
      expect(document.title).toContain('Sign Up')
    })
  })

  it('renders terms-specific title', async () => {
    renderWithProviders(<SEOHelmet />, { route: '/terms' })
    await waitFor(() => {
      expect(document.title).toContain('Terms')
    })
  })

  it('renders contact-specific title', async () => {
    renderWithProviders(<SEOHelmet />, { route: '/contact' })
    await waitFor(() => {
      expect(document.title).toContain('Contact')
    })
  })

  it('renders affiliate-specific title', async () => {
    renderWithProviders(<SEOHelmet />, { route: '/affiliate' })
    await waitFor(() => {
      expect(document.title).toContain('Partner')
    })
  })

  it('allows title override via prop', async () => {
    renderWithProviders(
      <SEOHelmet title="Custom Title" />,
      { route: '/login' }
    )
    await waitFor(() => {
      expect(document.title).toBe('Custom Title')
    })
  })

  it('renders og:image meta tag', async () => {
    renderWithProviders(<SEOHelmet />, { route: '/login' })
    await waitFor(() => {
      const ogImage = document.querySelector('meta[property="og:image"]')
      expect(ogImage).toBeTruthy()
      expect(ogImage?.getAttribute('content')).toContain('og-image.png')
    })
  })

  it('renders canonical link', async () => {
    renderWithProviders(<SEOHelmet />, { route: '/login' })
    await waitFor(() => {
      const canonical = document.querySelector('link[rel="canonical"]')
      expect(canonical).toBeTruthy()
      expect(canonical?.getAttribute('href')).toContain('ge-metrics.com/login')
    })
  })

  it('renders twitter card meta', async () => {
    renderWithProviders(<SEOHelmet />, { route: '/signup' })
    await waitFor(() => {
      const twitterCard = document.querySelector('meta[name="twitter:card"]')
      expect(twitterCard).toBeTruthy()
      expect(twitterCard?.getAttribute('content')).toBe('summary_large_image')
    })
  })

  it('renders description meta tag', async () => {
    renderWithProviders(<SEOHelmet />, { route: '/login' })
    await waitFor(() => {
      const desc = document.querySelector('meta[name="description"]')
      expect(desc).toBeTruthy()
      expect(desc?.getAttribute('content')).toContain('Sign in')
    })
  })
})

describe('seoConfig', () => {
  it('returns default meta for unknown route', () => {
    const meta = getMetaForRoute('/random-page')
    expect(meta.title).toContain('GE Metrics')
    expect(meta.description).toBeTruthy()
    expect(meta.canonical).toBe(`${SITE_URL}/random-page`)
  })

  it('returns login-specific meta', () => {
    const meta = getMetaForRoute('/login')
    expect(meta.title).toContain('Login')
    expect(meta.description).toContain('Sign in')
  })

  it('returns correct canonical for each route', () => {
    expect(getMetaForRoute('/contact').canonical).toBe(`${SITE_URL}/contact`)
    expect(getMetaForRoute('/affiliate').canonical).toBe(`${SITE_URL}/affiliate`)
  })

  it('always includes ogImage', () => {
    const meta = getMetaForRoute('/login')
    expect(meta.ogImage).toContain('og-image.png')
  })
})
