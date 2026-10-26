// Game updates and dev blogs from the OSRS Wiki's `Update:` pages.
//
// Every page starts with a template like
//   {{Update|date=14 October 2026|url=https://secure.runescape.com/m=news/...|category=game}}
// and links the items it changes with [[Item name]] or [[Item name|text]].
// This module only parses and combines that data; fetching lives in
// src/api/gameUpdates.ts. No imports, so `node --test` can run it directly.

export interface GameUpdate {
  /** Page title without the `Update:` prefix. */
  title: string
  /** Post date, midnight UTC, in ms. */
  date: number
  /** Jagex news post, when the page has one. */
  url: string | null
  /** The template's category: game, future (dev blogs), community, ... */
  kind: string
  /**
   * Unique link targets on the page plus item names mentioned in its text,
   * normalised like wiki titles. Most posts are copies of Jagex news posts and
   * mention items without linking them.
   */
  links: string[]
}

export const DAY_MS = 86_400_000
// Updates go live around 11:30 UTC; markers sit there rather than at midnight.
const POST_TIME_OF_DAY_MS = 11.5 * 60 * 60 * 1000
const MAX_LINKS_PER_PAGE = 600
// Plain-text matches need at least two words: single-word item names
// ("Bones", "Feather") are too often ordinary words.
const MIN_MENTION_WORDS = 2
const MAX_MENTION_WORDS = 6

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
const SKIPPED_NAMESPACES = /^(file|image|category|update|template|user|user talk|talk|special|media|help|rs|rsw|wikipedia|wp|w|mw|osrsw|meta):/i

/** "14 October 2026" or "06 October 2026" -> ms at midnight UTC. */
export function parseUpdateDate (text: string): number | null {
  const match = /^\s*(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\s*$/.exec(text)
  if (!match) return null
  const day = Number(match[1])
  const month = MONTHS.indexOf(match[2].toLowerCase())
  const year = Number(match[3])
  if (month < 0 || day < 1 || day > 31) return null
  const ms = Date.UTC(year, month, day)
  return new Date(ms).getUTCDate() === day ? ms : null
}

/** Wiki titles: underscores are spaces, the first letter is case-insensitive, anchors don't matter. */
export function normalizeTitle (raw: string): string {
  const title = raw
    .replace(/#.*$/, '')
    .replace(/_/g, ' ')
    .replace(/&nbsp;| /g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return title ? title[0].toUpperCase() + title.slice(1) : ''
}

/** The parameters of the first {{Update|...}} template on the page. */
function updateTemplateParams (content: string): Record<string, string> | null {
  const match = /\{\{\s*Update\s*\|([^{}]*)\}\}/i.exec(content)
  if (!match) return null
  const params: Record<string, string> = {}
  for (const part of match[1].split('|')) {
    const eq = part.indexOf('=')
    if (eq > 0) params[part.slice(0, eq).trim().toLowerCase()] = part.slice(eq + 1).trim()
  }
  return params
}

/** Item-looking link targets: [[Target]], [[Target|text]], {{plink|Target}}, {{plinkp|Target}}. */
export function extractLinks (content: string): string[] {
  const found = new Set<string>()
  const add = (raw: string) => {
    if (found.size >= MAX_LINKS_PER_PAGE) return
    const target = raw.trim()
    if (!target || target.startsWith(':') || SKIPPED_NAMESPACES.test(target)) return
    const title = normalizeTitle(target)
    if (title) found.add(title)
  }
  for (const m of content.matchAll(/\[\[([^[\]|]+)(?:\|[^[\]]*)?\]\]/g)) add(m[1])
  for (const m of content.matchAll(/\{\{\s*plinkp?\s*\|([^|{}]+)/gi)) add(m[1])
  return [...found]
}

/** Lowercase words only, so "Dragon bones," and "dragon  bones" compare equal. */
export function phraseKey (text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9' -]+/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Item names that can be found in plain text: phrase key -> wiki title. */
export type MentionIndex = ReadonlyMap<string, string>

export function buildMentionIndex (items: Iterable<{ name: string }>): Map<string, string> {
  const index = new Map<string, string>()
  for (const item of items) {
    const key = phraseKey(item.name)
    const words = key.split(' ').length
    if (words >= MIN_MENTION_WORDS && words <= MAX_MENTION_WORDS && !index.has(key)) index.set(key, normalizeTitle(item.name))
  }
  return index
}

/** Readable text of a page: link labels kept, files, templates and markup removed. */
function plainText (content: string): string {
  return content
    .replace(/\[\[(?:file|image|category):[^\]]*\]\]/gi, ' ')
    .replace(/\[\[[^[\]|]*\|([^[\]]*)\]\]/g, '$1')
    .replace(/\[\[([^[\]]*)\]\]/g, '$1')
    .replace(/\{\{[^{}]*\}\}/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/'{2,}/g, '')
}

/** Item names written in the text of a page. */
export function mentionedItems (content: string, index: MentionIndex): string[] {
  const words = phraseKey(plainText(content)).split(' ')
  const found = new Set<string>()
  for (let i = 0; i < words.length; i++) {
    for (let n = MIN_MENTION_WORDS; n <= MAX_MENTION_WORDS && i + n <= words.length; n++) {
      const title = index.get(words.slice(i, i + n).join(' '))
      if (title) found.add(title)
    }
  }
  return [...found]
}

function cleanUrl (url: string | undefined): string | null {
  if (!url) return null
  return /^https:\/\/[^\s]+$/.test(url) ? url : null
}

/** One `Update:` page, or null when it has no usable {{Update}} template. */
export function parseUpdatePage (title: string, content: string, mentions?: MentionIndex): GameUpdate | null {
  const params = updateTemplateParams(content)
  if (!params) return null
  const date = parseUpdateDate(params.date ?? '')
  if (date === null) return null
  return {
    title: title.replace(/^Update:/, '').trim(),
    date,
    url: cleanUrl(params.url),
    kind: (params.category ?? 'other').toLowerCase(),
    links: [...new Set([...extractLinks(content), ...(mentions ? mentionedItems(content, mentions) : [])])].slice(0, MAX_LINKS_PER_PAGE)
  }
}

/** When the post most likely went live (11:30 UTC on its date). */
export function postTime (update: Pick<GameUpdate, 'date'>): number {
  return update.date + POST_TIME_OF_DAY_MS
}

/** Newer copies win; newest first; anything older than `keepSince` is dropped. */
export function mergeUpdates (existing: readonly GameUpdate[], incoming: readonly GameUpdate[], keepSince: number): GameUpdate[] {
  const byTitle = new Map<string, GameUpdate>()
  for (const u of existing) byTitle.set(u.title, u)
  for (const u of incoming) byTitle.set(u.title, u)
  return [...byTitle.values()]
    .filter(u => u.date >= keepSince)
    .sort((a, b) => b.date - a.date || a.title.localeCompare(b.title))
}

export function isGameUpdate (value: unknown): value is GameUpdate {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.title === 'string' &&
    typeof v.date === 'number' && Number.isFinite(v.date) &&
    (v.url === null || typeof v.url === 'string') &&
    typeof v.kind === 'string' &&
    Array.isArray(v.links) && v.links.every(l => typeof l === 'string')
}

/** Lowercased item name -> id, for matching links. */
export type NameIndex = ReadonlyMap<string, number>

export function buildNameIndex (items: Iterable<{ id: number; name: string }>): Map<string, number> {
  const index = new Map<string, number>()
  for (const item of items) {
    const key = normalizeTitle(item.name).toLowerCase()
    if (key && !index.has(key)) index.set(key, item.id)
  }
  return index
}

/** Ids of the tradeable items a post links, in page order. */
export function linkedItemIds (update: Pick<GameUpdate, 'links'>, index: NameIndex): number[] {
  const ids = new Set<number>()
  for (const link of update.links) {
    const id = index.get(link.toLowerCase())
    if (id !== undefined) ids.add(id)
  }
  return [...ids]
}

/** Posts that matter for prices: game updates and dev blogs. */
export const PRICE_MOVING_KINDS: readonly string[] = ['game', 'future']

export function kindLabel (kind: string): string {
  if (kind === 'game') return 'Game update'
  if (kind === 'future') return 'Dev blog'
  return kind ? kind[0].toUpperCase() + kind.slice(1) : 'Update'
}

export interface UpdateMarker {
  title: string
  time: number
  date: number
  url: string | null
  kind: string
  /** The post links this item. */
  mentionsItem: boolean
}

/** Price-moving posts that went live between `from` and `to` (ms), oldest first. */
export function markersInRange (updates: readonly GameUpdate[], from: number, to: number, itemId: number, index: NameIndex): UpdateMarker[] {
  return updates
    .filter(u => PRICE_MOVING_KINDS.includes(u.kind))
    .map(u => ({ u, time: postTime(u) }))
    .filter(({ time }) => time >= from && time <= to)
    .sort((a, b) => a.time - b.time)
    .map(({ u, time }) => ({
      title: u.title,
      time,
      date: u.date,
      url: u.url,
      kind: u.kind,
      mentionsItem: linkedItemIds(u, index).includes(itemId)
    }))
}

/** The latest `count` price-moving posts that link at least one item. */
export function latestItemPosts (updates: readonly GameUpdate[], index: NameIndex, count: number): { update: GameUpdate; itemIds: number[] }[] {
  const result: { update: GameUpdate; itemIds: number[] }[] = []
  for (const update of updates) {
    if (result.length >= count) break
    if (!PRICE_MOVING_KINDS.includes(update.kind)) continue
    const itemIds = linkedItemIds(update, index)
    if (itemIds.length) result.push({ update, itemIds })
  }
  return result
}

/** The 24h price period to compare against: the whole day before the post. */
export function baselineDay (update: Pick<GameUpdate, 'date'>): number {
  return Math.floor((update.date - DAY_MS) / 1000)
}

export interface PricePair {
  high: number | null
  low: number | null
}

/** Mid price, or whichever side traded. */
export function midPrice (p: PricePair | undefined | null): number | null {
  if (!p) return null
  if (p.high && p.low) return (p.high + p.low) / 2
  return p.high || p.low || null
}

/** Relative change from `before` to `after`, or null when either is unknown. */
export function changeSince (before: number | null, after: number | null): number | null {
  if (!before || !after) return null
  return (after - before) / before
}
