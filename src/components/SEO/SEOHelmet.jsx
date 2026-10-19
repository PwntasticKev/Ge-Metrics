import React from 'react'
import { Helmet } from 'react-helmet-async'
import { useLocation } from 'react-router-dom'
import { getMetaForRoute, SITE_NAME } from './seoConfig'

export default function SEOHelmet({ title, description }) {
  const { pathname } = useLocation()
  const meta = getMetaForRoute(pathname)

  const finalTitle = title || meta.title
  const finalDescription = description || meta.description

  return (
    <Helmet>
      <title>{finalTitle}</title>
      <meta name="description" content={finalDescription} />
      <link rel="canonical" href={meta.canonical} />

      {/* Open Graph */}
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:image" content={meta.ogImage} />
      <meta property="og:url" content={meta.canonical} />
      <meta property="og:type" content={meta.ogType} />
      <meta property="og:site_name" content={SITE_NAME} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={finalDescription} />
      <meta name="twitter:image" content={meta.ogImage} />
    </Helmet>
  )
}
