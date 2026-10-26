// "Coming up": items named in dev blogs, behind-the-scenes posts, polls and
// the "next week" lines of game updates, each with the sentence that names it.
// Turns wiki pages into posts; rows.ts adds prices. Ported from
// mobile/src/lib/comingUpParse.ts.

import { classifySignal } from './signals.js'
import { type MentionIndex, type NameIndex, extractLinks, mentionedItems, parseUpdateDate, parseUpdatePage, plainText } from './wikitext.js'

export interface ComingMention {
  /** Item name as a wiki title ("Dragon bones"). */
  readonly item: string
  /** The sentence (or poll question) that names the item, as plain text. */
  readonly sentence: string
  /** Polls only: share of Yes among Yes + No, null while voting. */
  readonly pollShare?: number | null
}

export interface ComingPost {
  readonly title: string
  /** Post date, or the day a poll opened (unix seconds, midnight UTC). */
  readonly date: number
  readonly url: string | null
  /** future (dev blog), bts (behind the scenes), game, poll. */
  readonly kind: string
  /** Polls only: the day voting ends. */
  readonly closes: number | null
  readonly mentions: readonly ComingMention[]
}

export interface ParseContext {
  readonly mentions: MentionIndex
  readonly names: NameIndex
}

const MAX_SENTENCE_CHARS = 280
const MIN_SENTENCE_CHARS = 12
const MAX_MENTIONS_PER_POST = 40
const MAX_TEMPLATE_PASSES = 5

// A game update is about what is out now; only its forward-looking lines count.
export const FORWARD_LOOKING = /\b(?:next week|coming soon|coming next|in the coming weeks|in a few weeks|later this (?:week|month|year)|upcoming|will (?:be )?(?:arriv|launch|releas|com)\w*|(?:is|are) coming|launch(?:es|ing)? on|releas(?:es|ing) on|out on)\b/i

function stripTemplates (text: string): string {
  let out = text
  for (let i = 0; i < MAX_TEMPLATE_PASSES; i++) {
    const next = out.replace(/\{\{[^{}]*\}\}/g, ' ')
    if (next === out) break
    out = next
  }
  return out
}

const stripNoise = (content: string): string => stripTemplates(content
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<ref[^>]*\/>/gi, ' ')
  .replace(/<ref[\s\S]*?<\/ref>/gi, ' ')
  .replace(/\[\[(?:file|image|category):(?:[^[\]]|\[\[[^\]]*\]\])*\]\]/gi, ' ')
  .replace(/<br\s*\/?>/gi, ' '))

const SKIP_LINE = /^(?:=|\{\||\|\}|\|-|__)/

/** Sentences of a page, still in wikitext so links can be read. */
export function wikiSentences (content: string): string[] {
  return stripNoise(content).split('\n').flatMap(line => {
    const trimmed = line.trim()
    if (!trimmed || SKIP_LINE.test(trimmed)) return []
    const text = trimmed.replace(/^[*#:;]+\s*/, '').replace(/^[|!]\s*/, '').replace(/\s*(?:\|\||!!)\s*/g, ', ')
    return text.replace(/([.!?])\s+(?=[^a-z\s])/g, '$1\u0000').split('\u0000').map(p => p.trim()).filter(Boolean)
  })
}

/** Readable text of one wikitext sentence, capped in length. */
export function cleanSentence (raw: string): string {
  const text = plainText(stripTemplates(raw)).replace(/\[https?:\/\/\S+\s*([^\]]*)\]/g, '$1').replace(/\s+/g, ' ').trim()
  return text.length > MAX_SENTENCE_CHARS ? `${text.slice(0, MAX_SENTENCE_CHARS - 1).trimEnd()}…` : text
}

function itemsIn (raw: string, ctx: ParseContext): string[] {
  const titles = new Set([...extractLinks(raw), ...mentionedItems(raw, ctx.mentions)])
  return [...titles].filter(t => ctx.names.has(t.toLowerCase()))
}

/** One mention per item: the first sentence that hints at a direction, else the first that names it. */
export function mentionsIn (content: string, ctx: ParseContext, keep?: (sentence: string) => boolean): ComingMention[] {
  const byItem = new Map<string, ComingMention>()
  for (const raw of wikiSentences(content)) {
    const sentence = cleanSentence(raw)
    if (sentence.length < MIN_SENTENCE_CHARS || (keep && !keep(sentence))) continue
    for (const item of itemsIn(raw, ctx)) {
      const previous = byItem.get(item)
      if (!previous || (!classifySignal(previous.sentence) && classifySignal(sentence))) byItem.set(item, { item, sentence })
    }
  }
  return [...byItem.values()].slice(0, MAX_MENTIONS_PER_POST)
}

/** A dev blog, behind-the-scenes post or game update; null when it names no items. */
export function parseComingPost (title: string, content: string, ctx: ParseContext): ComingPost | null {
  const page = parseUpdatePage(title, content)
  if (!page) return null
  const keep = page.kind === 'game' ? (s: string) => FORWARD_LOOKING.test(s) : undefined
  const mentions = mentionsIn(content, ctx, keep)
  return mentions.length ? { title: page.title, date: page.date, url: page.url, kind: page.kind, closes: null, mentions } : null
}

export interface PollQuestion {
  readonly text: string
  readonly yes: number | null
  readonly no: number | null
}

function voteCount (value: string | undefined): number | null {
  if (!value) return null
  const n = Number(value.replace(/[,\s]/g, ''))
  return Number.isFinite(n) && n >= 0 ? n : null
}

function pollParams (body: string): Readonly<Record<string, string>> {
  return Object.fromEntries(body.split(/\n\s*\|/).flatMap(part => {
    const eq = part.indexOf('=')
    return eq > 0 ? [[part.slice(0, eq).trim().toLowerCase(), part.slice(eq + 1).trim()]] : []
  }))
}

/** The {{Poll|Question=...|AnswerN=...|VotesN=...}} blocks of a poll page. */
export function parsePollQuestions (content: string): PollQuestion[] {
  return [...content.matchAll(/\{\{\s*Poll\s*\|([\s\S]*?)\}\}/g)].flatMap(match => {
    const params = pollParams(match[1] ?? '')
    if (!params.question) return []
    const votesFor = (answer: string): number | null => {
      const key = Object.keys(params).find(k => /^answer\d+$/.test(k) && params[k]?.toLowerCase() === answer)
      return key ? voteCount(params[key.replace('answer', 'votes')]) : null
    }
    return [{ text: params.question, yes: votesFor('yes'), no: votesFor('no') }]
  })
}

export function yesShare (q: Pick<PollQuestion, 'yes' | 'no'>): number | null {
  if (q.yes === null || q.no === null || q.yes + q.no === 0) return null
  return q.yes / (q.yes + q.no)
}

/** A `Poll:` page; null without a {{PollNotice}} date or tradeable items. */
export function parsePollPage (title: string, content: string, ctx: ParseContext): ComingPost | null {
  const notice = /\{\{\s*PollNotice\s*\|([^{}]*)\}\}/i.exec(content)
  const [, opens, closes] = notice?.[1] ? notice[1].split('|').map(s => s.trim()) : []
  const date = parseUpdateDate(opens ?? '')
  if (date === null) return null
  const byItem = new Map<string, ComingMention>()
  for (const q of parsePollQuestions(content)) {
    const pollShare = yesShare(q)
    const sentence = cleanSentence(q.text)
    for (const item of itemsIn(q.text, ctx)) {
      if (!byItem.has(item)) byItem.set(item, { item, sentence, pollShare })
    }
  }
  const mentions = [...byItem.values()]
  if (!mentions.length) return null
  return {
    title: title.replace(/^Poll:/, '').trim(),
    date,
    url: /\[(https:\/\/secure\.runescape\.com\/[^\s\]]+)/.exec(content)?.[1] ?? null,
    kind: 'poll',
    closes: parseUpdateDate(closes ?? ''),
    mentions: mentions.slice(0, MAX_MENTIONS_PER_POST)
  }
}
