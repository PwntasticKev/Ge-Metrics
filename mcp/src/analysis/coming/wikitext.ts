// Wikitext helpers for upcoming-content posts: dates, links, plain text and
// plain-text item mentions. Ported from mobile/src/lib/gameUpdates.ts.

export const DAY_SEC = 86_400
const MAX_LINKS_PER_PAGE = 600
// Plain-text matches need at least two words: single-word item names
// ("Bones", "Feather") are too often ordinary words.
const MIN_MENTION_WORDS = 2
const MAX_MENTION_WORDS = 6

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
const SKIPPED_NAMESPACES = /^(file|image|category|update|template|user|user talk|talk|special|media|help|rs|rsw|wikipedia|wp|w|mw|osrsw|meta):/i

/** "14 October 2026" -> unix seconds at midnight UTC. */
export function parseUpdateDate (text: string): number | null {
  const match = /^\s*(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\s*$/.exec(text)
  if (!match) return null
  const day = Number(match[1])
  const month = MONTHS.indexOf((match[2] ?? '').toLowerCase())
  const year = Number(match[3])
  if (month < 0 || day < 1 || day > 31) return null
  const ms = Date.UTC(year, month, day)
  return new Date(ms).getUTCDate() === day ? ms / 1000 : null
}

/** Wiki titles: underscores are spaces, first letter case-insensitive, anchors ignored. */
export function normalizeTitle (raw: string): string {
  const title = raw.replace(/#.*$/, '').replace(/_/g, ' ').replace(/&nbsp;| /g, ' ').replace(/\s+/g, ' ').trim()
  return title ? title.charAt(0).toUpperCase() + title.slice(1) : ''
}

/** Parameters of the first {{Update|...}} template on the page. */
export function updateTemplateParams (content: string): Readonly<Record<string, string>> | null {
  const match = /\{\{\s*Update\s*\|([^{}]*)\}\}/i.exec(content)
  if (!match?.[1]) return null
  return Object.fromEntries(match[1].split('|').flatMap(part => {
    const eq = part.indexOf('=')
    return eq > 0 ? [[part.slice(0, eq).trim().toLowerCase(), part.slice(eq + 1).trim()]] : []
  }))
}

/** Item-looking link targets: [[Target]], [[Target|text]], {{plink|Target}}. */
export function extractLinks (content: string): string[] {
  const targets = [
    ...[...content.matchAll(/\[\[([^[\]|]+)(?:\|[^[\]]*)?\]\]/g)].map(m => m[1] ?? ''),
    ...[...content.matchAll(/\{\{\s*plinkp?\s*\|([^|{}]+)/gi)].map(m => m[1] ?? '')
  ]
  const titles = targets
    .map(t => t.trim())
    .filter(t => t && !t.startsWith(':') && !SKIPPED_NAMESPACES.test(t))
    .map(normalizeTitle)
    .filter(Boolean)
  return [...new Set(titles)].slice(0, MAX_LINKS_PER_PAGE)
}

/** Lowercase words only, so "Dragon bones," and "dragon  bones" compare equal. */
export const phraseKey = (text: string): string =>
  text.toLowerCase().replace(/[^a-z0-9' -]+/g, ' ').replace(/\s+/g, ' ').trim()

/** Phrase key -> wiki title, for item names findable in plain text. */
export type MentionIndex = ReadonlyMap<string, string>
/** Lowercased item name -> id. */
export type NameIndex = ReadonlyMap<string, number>

export function buildMentionIndex (items: Iterable<{ name: string }>): Map<string, string> {
  const entries = [...items].flatMap(item => {
    const key = phraseKey(item.name)
    const words = key.split(' ').length
    return words >= MIN_MENTION_WORDS && words <= MAX_MENTION_WORDS ? [[key, normalizeTitle(item.name)] as const] : []
  })
  // First name wins, like the app.
  return new Map(entries.reverse())
}

/** Adds plural keys ("ascension shards") so plain-text matching finds them. */
export function withPlurals (index: MentionIndex): Map<string, string> {
  const plurals = [...index].filter(([key]) => !key.endsWith('s') && !index.has(`${key}s`)).map(([key, title]) => [`${key}s`, title] as const)
  return new Map([...plurals, ...index])
}

export function buildNameIndex (items: Iterable<{ id: number; name: string }>): Map<string, number> {
  const entries = [...items].map(item => [normalizeTitle(item.name).toLowerCase(), item.id] as const).filter(([key]) => key)
  return new Map(entries.reverse())
}

/** Readable text: link labels kept, files, templates and markup removed. */
export function plainText (content: string): string {
  return content
    .replace(/\[\[(?:file|image|category):[^\]]*\]\]/gi, ' ')
    .replace(/\[\[[^[\]|]*\|([^[\]]*)\]\]/g, '$1')
    .replace(/\[\[([^[\]]*)\]\]/g, '$1')
    .replace(/\{\{[^{}]*\}\}/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/'{2,}/g, '')
}

/** Item names written in the text. */
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

export const cleanUrl = (url: string | undefined): string | null => (url && /^https:\/\/\S+$/.test(url) ? url : null)

export interface UpdatePage {
  readonly title: string
  /** Unix seconds, midnight UTC. */
  readonly date: number
  readonly url: string | null
  /** The template's category: game, future (dev blogs), bts, ... */
  readonly kind: string
  /** Link targets plus plain-text item mentions, normalised like wiki titles. */
  readonly links: readonly string[]
}

/** One `Update:` page, or null without a usable {{Update}} template. */
export function parseUpdatePage (title: string, content: string, mentions?: MentionIndex): UpdatePage | null {
  const params = updateTemplateParams(content)
  const date = params ? parseUpdateDate(params.date ?? '') : null
  if (!params || date === null) return null
  const links = [...new Set([...extractLinks(content), ...(mentions ? mentionedItems(content, mentions) : [])])]
  return { title: title.replace(/^Update:/, '').trim(), date, url: cleanUrl(params.url), kind: (params.category ?? 'other').toLowerCase(), links: links.slice(0, MAX_LINKS_PER_PAGE) }
}

/** Ids of the tradeable items a page links or names, in page order. */
export function linkedItemIds (page: Pick<UpdatePage, 'links'>, names: NameIndex): number[] {
  return [...new Set(page.links.map(l => names.get(l.toLowerCase())).filter((id): id is number => id !== undefined))]
}
