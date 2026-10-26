// Parsing for OSRS game update data: the ge-metrics.com dataset and raw wiki
// `Update:` pages, which begin `{{Update|date=..|url=..|category=game}}`.

import { isObject } from '../wiki/parse.js'

export interface GameUpdate {
  readonly date: string // YYYY-MM-DD
  readonly title: string
  readonly url: string | null
  readonly wikiUrl: string | null
  readonly category: string | null
  readonly items: readonly number[]
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const MAX_NGRAM = 6

export const wikiPageUrl = (title: string): string =>
  `https://oldschool.runescape.wiki/w/${encodeURIComponent(title.replace(/ /g, '_')).replace(/%3A/g, ':').replace(/%2F/g, '/')}`

// "20 October 2026" (wiki style) or "2026-10-20" -> "2026-10-20".
export function parseWikiDate (raw: string): string | null {
  const text = raw.trim()
  if (ISO_DATE.test(text)) return text
  const match = text.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/)
  if (!match) return null
  const [, day, monthName, year] = match as unknown as [string, string, string, string]
  const month = MONTHS.indexOf(monthName.toLowerCase())
  if (month < 0) return null
  return `${year}-${String(month + 1).padStart(2, '0')}-${day.padStart(2, '0')}`
}

export interface UpdateTemplate {
  readonly date: string | null
  readonly url: string | null
  readonly category: string | null
}

export function parseUpdateTemplate (wikitext: string): UpdateTemplate | null {
  const match = wikitext.match(/\{\{\s*Update\s*\|([^}]*)\}\}/i)
  if (!match?.[1]) return null
  const params = new Map(match[1].split('|').flatMap(part => {
    const eq = part.indexOf('=')
    return eq < 0 ? [] : [[part.slice(0, eq).trim().toLowerCase(), part.slice(eq + 1).trim()] as const]
  }))
  const date = params.get('date')
  return {
    date: date ? parseWikiDate(date) : null,
    url: params.get('url') || null,
    category: params.get('category')?.toLowerCase() || null
  }
}

export type NameIndex = ReadonlyMap<string, number>

const normalizeName = (s: string): string => s.trim().toLowerCase().replace(/_/g, ' ').replace(/\s+/g, ' ')

export function buildNameIndex (items: readonly { id: number; name: string }[]): NameIndex {
  return new Map(items.map(item => [normalizeName(item.name), item.id]))
}

// Items an update talks about: every [[wiki link]] whose target is an item
// name, plus plain-text mentions of multi-word item names (single words like
// "Logs" or "Coins" are too noisy to count without a link).
export function extractItems (wikitext: string, names: NameIndex): number[] {
  const found = new Set<number>()
  for (const link of wikitext.matchAll(/\[\[([^\]|#]+)/g)) {
    const id = names.get(normalizeName(link[1] ?? ''))
    if (id !== undefined) found.add(id)
  }
  const words = wikitext
    .replace(/\[\[(?:File|Image):[^\]]*\]\]/gi, ' ')
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    .toLowerCase()
    .split(/[^a-z0-9'()+-]+/)
    .filter(Boolean)
  for (let i = 0; i < words.length; i++) {
    for (let n = 2; n <= MAX_NGRAM && i + n <= words.length; n++) {
      const id = names.get(words.slice(i, i + n).join(' '))
      if (id !== undefined) found.add(id)
    }
  }
  return [...found]
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)

// The ge-metrics.com dataset: { generatedAt, updates: [{ date, title, url, wikiUrl, category, items }] }.
export function parseDataset (body: unknown): GameUpdate[] {
  if (!isObject(body) || !Array.isArray(body.updates)) throw new Error('Unexpected game-updates dataset shape')
  return body.updates.filter(isObject).flatMap(u => {
    const title = str(u.title)
    const date = str(u.date) ? parseWikiDate(String(u.date).slice(0, 10)) : null
    if (!title || !date) return []
    const items = Array.isArray(u.items) ? u.items.filter((id): id is number => Number.isInteger(id)) : []
    return [Object.freeze({ date, title, url: str(u.url), wikiUrl: str(u.wikiUrl), category: str(u.category), items })]
  })
}

// Wiki page -> GameUpdate. Returns null for pages without a dated template.
export function updateFromPage (title: string, wikitext: string, names: NameIndex): GameUpdate | null {
  const template = parseUpdateTemplate(wikitext)
  if (!template?.date) return null
  return Object.freeze({
    date: template.date,
    title: title.replace(/^Update:/, ''),
    url: template.url,
    wikiUrl: wikiPageUrl(title),
    category: template.category,
    items: extractItems(wikitext, names)
  })
}
