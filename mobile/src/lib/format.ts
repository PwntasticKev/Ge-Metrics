const WIKI_IMAGES = 'https://oldschool.runescape.wiki/images/'

export function wikiIconUrl (icon: string | null): string | null {
  return icon ? WIKI_IMAGES + encodeURIComponent(icon.replace(/ /g, '_')) : null
}

// 1,234,567
export function gpFull (n: number): string {
  return Number.isFinite(n) ? Math.round(n).toLocaleString('en-US') : '–'
}

// 1.23B, 53.3M, 6.66M, 981K, 950
// "10.0" -> "10", "1.50" -> "1.5"
const trim = (s: string) => (s.includes('.') ? s.replace(/\.?0+$/, '') : s)

export function gpShort (n: number | null): string {
  if (n === null || !Number.isFinite(n)) return '–'
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1e9) return `${sign}${trim((abs / 1e9).toFixed(2))}B`
  if (abs >= 1e7) return `${sign}${trim((abs / 1e6).toFixed(1))}M`
  if (abs >= 1e6) return `${sign}${trim((abs / 1e6).toFixed(2))}M`
  if (abs >= 1e3) return `${sign}${Math.round(abs / 1e3)}K`
  return `${sign}${Math.round(abs)}`
}

export function signed (n: number | null): string {
  if (n === null || !Number.isFinite(n)) return '–'
  return `${n >= 0 ? '+' : ''}${gpShort(n)}`
}

// Quantities can be fractional averages in wiki guides: 0.286 -> "0.29".
export function qty (n: number): string {
  return Number.isInteger(n) ? n.toLocaleString('en-US') : n.toFixed(n < 1 ? 2 : 1)
}

export function percent (ratio: number): string {
  return Number.isFinite(ratio) ? `${(ratio * 100).toFixed(ratio < 0.1 ? 2 : 1)}%` : '–'
}

export function minutesAgo (timestampMs: number | null, nowMs = Date.now()): string {
  if (!timestampMs) return ''
  const mins = Math.max(0, Math.round((nowMs - timestampMs) / 60_000))
  return mins === 0 ? 'just now' : `${mins}m ago`
}

// Shorter names for list rows: "Torva armour set" -> "Torva".
export function shortSetName (name: string): string {
  return name.replace(/ (armour|robes|hide armour|dragonhide) set$/i, '').replace(/ set$/i, '')
}

export function stripUncharged (name: string): string {
  return name.replace(/ \(uncharged\)$/i, '')
}
