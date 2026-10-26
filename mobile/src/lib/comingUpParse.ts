// "Coming up": items named in dev blogs, behind-the-scenes posts, polls and
// "next week" lines of game updates, each with the sentence that names it.
// This file turns wiki pages into posts; src/lib/comingUp.ts adds prices.
// Pure, so `node --test` can run it.
import { extractLinks, mentionedItems, parseUpdateDate, parseUpdatePage, plainText, type MentionIndex, type NameIndex } from './gameUpdates.ts'
import { classifySignal } from './updateSignals.ts'

export interface ComingMention {
  /** Item name as a wiki title ("Dragon bones"). */
  item: string
  /** The sentence (or poll question) that names the item, as plain text. */
  sentence: string
  /** Polls only: share of Yes among Yes + No, null while voting. */
  pollShare?: number | null
}

export interface ComingPost {
  title: string
  /** Post date, or the day a poll opened (midnight UTC, ms). */
  date: number
  url: string | null
  /** future (dev blog), bts (behind the scenes), game, poll. */
  kind: string
  /** Polls only: the day voting ends. */
  closes: number | null
  mentions: ComingMention[]
}

export interface ParseContext {
  /** Item names that can be found in plain text. */
  mentions: MentionIndex
  /** Lowercased item name -> id; only tradeable items are kept. */
  names: NameIndex
}

const MAX_SENTENCE_CHARS = 280
const MIN_SENTENCE_CHARS = 12
const MAX_MENTIONS_PER_POST = 40
const MAX_TEMPLATE_PASSES = 5

// A game update is about what is out now; only its forward-looking lines
// ("coming next week", "launches on ...") count as coming up.
export const FORWARD_LOOKING = /\b(?:next week|coming soon|coming next|in the coming weeks|in a few weeks|later this (?:week|month|year)|upcoming|will (?:be )?(?:arriv|launch|releas|com)\w*|(?:is|are) coming|launch(?:es|ing)? on|releas(?:es|ing) on|out on)\b/i

/** Adds plural keys ("ascension shards") so plain-text matching finds them. */
export function withPlurals (index: MentionIndex): Map<string, string> {
  const result = new Map(index)
  for (const [key, title] of index) {
    if (!key.endsWith('s') && !result.has(`${key}s`)) result.set(`${key}s`, title)
  }
  return result
}

function stripTemplates (text: string): string {
  let out = text
  for (let i = 0; i < MAX_TEMPLATE_PASSES; i++) {
    const next = out.replace(/\{\{[^{}]*\}\}/g, ' ')
    if (next === out) break
    out = next
  }
  return out
}

function stripNoise (content: string): string {
  return stripTemplates(content
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<ref[^>]*\/>/gi, ' ')
    .replace(/<ref[\s\S]*?<\/ref>/gi, ' ')
    .replace(/\[\[(?:file|image|category):(?:[^[\]]|\[\[[^\]]*\]\])*\]\]/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' '))
}

const SKIP_LINE = /^(?:=|\{\||\|\}|\|-|__)/

/** Sentences of a page, still in wikitext so links can be read. */
export function wikiSentences (content: string): string[] {
  const sentences: string[] = []
  for (const line of stripNoise(content).split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || SKIP_LINE.test(trimmed)) continue
    const text = trimmed
      .replace(/^[*#:;]+\s*/, '')
      .replace(/^[|!]\s*/, '')
      .replace(/\s*(?:\|\||!!)\s*/g, ', ')
    // No lookbehind: older JS engines on phones lack it.
    for (const part of text.replace(/([.!?])\s+(?=[^a-z\s])/g, '$1\u0000').split('\u0000')) {
      if (part.trim()) sentences.push(part.trim())
    }
  }
  return sentences
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

/**
 * One mention per item: the first sentence that hints at a direction,
 * otherwise the first sentence that names it.
 */
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
  if (!mentions.length) return null
  return { title: page.title, date: page.date, url: page.url, kind: page.kind, closes: null, mentions }
}

export interface PollQuestion {
  text: string
  yes: number | null
  no: number | null
}

function voteCount (value: string | undefined): number | null {
  if (!value) return null
  const n = Number(value.replace(/[,\s]/g, ''))
  return Number.isFinite(n) && n >= 0 ? n : null
}

/** The {{Poll|Question=...|AnswerN=...|VotesN=...}} blocks of a poll page. */
export function parsePollQuestions (content: string): PollQuestion[] {
  const questions: PollQuestion[] = []
  for (const match of content.matchAll(/\{\{\s*Poll\s*\|([\s\S]*?)\}\}/g)) {
    const params: Record<string, string> = {}
    for (const part of match[1].split(/\n\s*\|/)) {
      const eq = part.indexOf('=')
      if (eq > 0) params[part.slice(0, eq).trim().toLowerCase()] = part.slice(eq + 1).trim()
    }
    if (!params.question) continue
    const votesFor = (answer: string): number | null => {
      const key = Object.keys(params).find(k => /^answer\d+$/.test(k) && params[k].toLowerCase() === answer)
      return key ? voteCount(params[key.replace('answer', 'votes')]) : null
    }
    questions.push({ text: params.question, yes: votesFor('yes'), no: votesFor('no') })
  }
  return questions
}

/** Share of Yes among Yes + No, or null before results are in. */
export function yesShare (q: Pick<PollQuestion, 'yes' | 'no'>): number | null {
  if (q.yes === null || q.no === null || q.yes + q.no === 0) return null
  return q.yes / (q.yes + q.no)
}

/** A `Poll:` page; null without a {{PollNotice}} date or tradeable items. */
export function parsePollPage (title: string, content: string, ctx: ParseContext): ComingPost | null {
  const notice = /\{\{\s*PollNotice\s*\|([^{}]*)\}\}/i.exec(content)
  const [, opens, closes] = notice ? notice[1].split('|').map(s => s.trim()) : []
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
  const url = /\[(https:\/\/secure\.runescape\.com\/[^\s\]]+)/.exec(content)?.[1] ?? null
  return {
    title: title.replace(/^Poll:/, '').trim(),
    date,
    url,
    kind: 'poll',
    closes: parseUpdateDate(closes ?? ''),
    mentions: mentions.slice(0, MAX_MENTIONS_PER_POST)
  }
}
