// Upcoming content from the OSRS Wiki: the newest dev blogs, behind-the-scenes
// posts, game updates (for their "next week" lines and to mark releases) and
// `Poll:` pages. Four wiki requests per refresh, cached for an hour.

import { TtlCache } from '../cache.js'
import { TTL, WIKI_API_URL } from '../config.js'
import { type ComingPost, type ParseContext, parseComingPost, parsePollPage } from '../analysis/coming/parse.js'
import { DAY_SEC, type UpdatePage, buildMentionIndex, buildNameIndex, parseUpdatePage, withPlurals } from '../analysis/coming/wikitext.js'
import { type FetchLike, UpstreamError, getJson } from '../wiki/http.js'
import { isObject } from '../wiki/parse.js'
import type { MappingEntry } from '../wiki/types.js'

const UPDATE_NAMESPACE = 112
const POLL_NAMESPACE = 122
const GAME_CATEGORY = 'Category:Game updates'
const SOURCES: readonly { readonly category: string; readonly limit: number }[] = [
  { category: 'Category:Future Updates', limit: 15 },
  { category: 'Category:Behind the Scenes updates', limit: 10 }
]
// Enough weekly game updates to cover the 90-day window (also used for releases).
const GAME_LIMIT = 15
const POLL_LIMIT = 8
export const KEEP_DAYS = 90

export interface ComingData {
  readonly posts: readonly ComingPost[]
  /** Game update pages with every item they link or name, to mark releases. */
  readonly gameUpdates: readonly UpdatePage[]
  readonly names: ReadonlyMap<string, number>
}

export interface ComingSource {
  load (nowSec: number): Promise<ComingData>
}

interface Page { readonly title: string; readonly content: string }

export function pagesFrom (body: unknown): Page[] {
  if (!isObject(body)) throw new UpstreamError('Unexpected response from the wiki API')
  if (!isObject(body.query)) return [] // empty category
  const pages = Array.isArray(body.query.pages) ? body.query.pages : []
  return pages.filter(isObject).flatMap(page => {
    const revision = Array.isArray(page.revisions) ? page.revisions[0] : null
    const content = isObject(revision) && isObject(revision.slots) && isObject(revision.slots.main) ? revision.slots.main.content : null
    return typeof page.title === 'string' && typeof content === 'string' ? [{ title: page.title, content }] : []
  })
}

/** Turns fetched pages into posts and release pages. Pure, for tests. */
export function comingFromPages (
  { blogs, games, polls }: { blogs: readonly Page[]; games: readonly Page[]; polls: readonly Page[] },
  mapping: readonly MappingEntry[],
  keepSince: number
): ComingData {
  const mentions = withPlurals(buildMentionIndex(mapping))
  const names = buildNameIndex(mapping)
  const ctx: ParseContext = { mentions, names }
  const posts = [
    ...[...blogs, ...games].map(p => parseComingPost(p.title, p.content, ctx)),
    ...polls.map(p => parsePollPage(p.title, p.content, ctx))
  ].filter((p): p is ComingPost => p !== null && p.date >= keepSince)
  // A post can sit in two categories; keep one copy.
  const unique = [...new Map(posts.map(p => [`${p.kind}:${p.title}`, p])).values()]
  const gameUpdates = games.map(p => parseUpdatePage(p.title, p.content, mentions)).filter((u): u is UpdatePage => u !== null)
  return { posts: unique, gameUpdates, names }
}

export function createComingSource ({ fetchImpl = fetch, cache = new TtlCache(), mapping }: {
  readonly fetchImpl?: FetchLike
  readonly cache?: TtlCache
  readonly mapping: () => Promise<readonly MappingEntry[]>
}): ComingSource {
  // Newest first by when the page joined the category (about when it was posted).
  const category = async (title: string, limit: number, namespace = UPDATE_NAMESPACE): Promise<Page[]> => pagesFrom(await getJson(`${WIKI_API_URL}?${new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2', prop: 'revisions', rvprop: 'content', rvslots: 'main',
    generator: 'categorymembers', gcmtitle: title, gcmnamespace: String(namespace), gcmsort: 'timestamp', gcmdir: 'desc', gcmlimit: String(limit)
  })}`, fetchImpl))

  return {
    async load (nowSec) {
      const day = Math.floor(nowSec / DAY_SEC)
      return cache.get(`coming:${day}`, TTL.comingUp, async () => {
        const [items, polls, games, ...blogs] = await Promise.all([
          mapping(),
          category('Category:Polls', POLL_LIMIT, POLL_NAMESPACE),
          category(GAME_CATEGORY, GAME_LIMIT),
          ...SOURCES.map(s => category(s.category, s.limit))
        ])
        return comingFromPages({ blogs: blogs.flat(), games, polls }, items, (day - KEEP_DAYS) * DAY_SEC)
      })
    }
  }
}
