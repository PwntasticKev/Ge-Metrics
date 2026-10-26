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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const pad2 = (n: number) => String(n).padStart(2, '0')

// "14 Oct 2026" for a UTC day (wiki post dates).
export function utcDay (ms: number): string {
  const d = new Date(ms)
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

// A chart point in local time, as precise as its step: "14 Oct 14:35" or "14 Oct 2026".
export function chartTime (ms: number, withTime: boolean): string {
  const d = new Date(ms)
  const day = `${d.getDate()} ${MONTHS[d.getMonth()]}`
  return withTime ? `${day} ${pad2(d.getHours())}:${pad2(d.getMinutes())}` : `${day} ${d.getFullYear()}`
}

// Exact under 10M (what you type into the GE), short above.
export function gpPrice (n: number | null): string {
  if (n === null || !Number.isFinite(n)) return '–'
  return Math.abs(n) < 1e7 ? gpFull(n) : gpShort(n)
}

// "▲ 4.2%" / "▼ 1.3%"
export function changeText (ratio: number): string {
  return `${ratio >= 0 ? '▲' : '▼'} ${(Math.abs(ratio) * 100).toFixed(1)}%`
}

// Expected waits: "~5m", "~40m", "~1.5h", "~9h", "~2d", "rarely fills".
export function duration (hours: number): string {
  if (!Number.isFinite(hours)) return 'rarely fills'
  const mins = hours * 60
  if (mins < 57.5) return `~${Math.max(5, Math.round(mins / 5) * 5)}m`
  if (hours < 9.95) return `~${trim(hours.toFixed(1))}h`
  if (hours < 47.5) return `~${Math.round(hours)}h`
  return `~${Math.round(hours / 24)}d`
}

// "0.8%" for small timing edges, which round to 0 with percent().
export function edgePercent (ratio: number): string {
  return Number.isFinite(ratio) ? `${trim((Math.abs(ratio) * 100).toFixed(1))}%` : '–'
}
