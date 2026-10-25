// Display helpers shared by the flip pages.

const WIKI_IMAGES = 'https://oldschool.runescape.wiki/images/'

export function wikiIconUrl (icon) {
  return icon ? WIKI_IMAGES + encodeURIComponent(icon.replace(/ /g, '_')) : null
}

// Exact gp with separators: 1,234,567
export function gpFull (n) {
  return Number.isFinite(n) ? Math.round(n).toLocaleString('en-US') : '–'
}

// Short gp for scanning: 1.23B, 45.6M, 789K, 950
export function gpShort (n) {
  if (!Number.isFinite(n)) return '–'
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(2)}B`
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(abs >= 1e8 ? 0 : abs >= 1e7 ? 1 : 2)}M`
  if (abs >= 1e4) return `${sign}${(abs / 1e3).toFixed(abs >= 1e5 ? 0 : 1)}K`
  return `${sign}${Math.round(abs).toLocaleString('en-US')}`
}

export function percent (ratio) {
  return Number.isFinite(ratio) ? `${(ratio * 100).toFixed(ratio < 0.1 ? 2 : 1)}%` : '–'
}

export function ageLabel (ageSec) {
  if (!Number.isFinite(ageSec)) return 'unknown age'
  if (ageSec < 120) return 'just now'
  if (ageSec < 3600) return `${Math.round(ageSec / 60)}m old`
  return `${(ageSec / 3600).toFixed(1)}h old`
}
