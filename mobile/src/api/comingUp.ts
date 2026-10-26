import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { WikiMappingEntry } from '@ge/engine'
import { DAY_MS, buildMentionIndex, buildNameIndex } from '../lib/gameUpdates'
import { parseComingPost, parsePollPage, withPlurals, type ComingMention, type ComingPost, type ParseContext } from '../lib/comingUpParse'
import { loadJson, saveJson } from '../state/storage'
import { apiUrl, pageContent, queryPages } from './gameUpdates'
import { PERSISTED_GC_TIME_MS } from './queryCache'
import { fetchMapping, fetchWikiJson, isObject } from './wiki'

// Upcoming content from the OSRS Wiki: the newest dev blogs, behind-the-
// scenes posts, game updates (for their "next week" lines) and `Poll:` pages.
// Four requests a day, text included; only the parsed mentions are kept.
const UPDATE_NAMESPACE = 112
const POLL_NAMESPACE = 122
const SOURCES: readonly { category: string; limit: number }[] = [
  { category: 'Category:Future Updates', limit: 15 },
  { category: 'Category:Behind the Scenes updates', limit: 10 },
  { category: 'Category:Game updates', limit: 8 }
]
const POLL_LIMIT = 8
const KEEP_DAYS = 90
const REFRESH_MS = 12 * 60 * 60 * 1000
const MAPPING_STALE_MS = 6 * 60 * 60 * 1000
const STORAGE_KEY = 'gem.coming-up.v1'

interface CachedComingUp {
  fetchedAt: number
  posts: ComingPost[]
}

function isMention (v: unknown): v is ComingMention {
  return isObject(v) && typeof v.item === 'string' && typeof v.sentence === 'string' &&
    (v.pollShare === undefined || v.pollShare === null || typeof v.pollShare === 'number')
}

function isComingPost (v: unknown): v is ComingPost {
  return isObject(v) && typeof v.title === 'string' && typeof v.date === 'number' &&
    (v.url === null || typeof v.url === 'string') && typeof v.kind === 'string' &&
    (v.closes === null || typeof v.closes === 'number') &&
    Array.isArray(v.mentions) && v.mentions.every(isMention)
}

function isCached (v: unknown): v is CachedComingUp {
  return isObject(v) && typeof v.fetchedAt === 'number' && Array.isArray(v.posts) && v.posts.every(isComingPost)
}

async function fetchPages (params: Record<string, string>): Promise<{ title: string; content: string }[]> {
  const body = await fetchWikiJson(apiUrl({ ...params, prop: 'revisions', rvprop: 'content', rvslots: 'main' }), 'Wiki')
  return queryPages(body).flatMap(page => {
    const content = pageContent(page)
    return typeof page.title === 'string' && content ? [{ title: page.title, content }] : []
  })
}

// Newest first by when the page joined the category, which is about when it was posted.
function categoryPages (category: string, limit: number, namespace = UPDATE_NAMESPACE) {
  return fetchPages({
    generator: 'categorymembers',
    gcmtitle: category,
    gcmnamespace: String(namespace),
    gcmsort: 'timestamp',
    gcmdir: 'desc',
    gcmlimit: String(limit)
  })
}

function pollPages () {
  return categoryPages('Category:Polls', POLL_LIMIT, POLL_NAMESPACE)
}

async function fetchComingUp (ctx: ParseContext, keepSince: number): Promise<ComingPost[]> {
  const [polls, ...categories] = await Promise.all([pollPages(), ...SOURCES.map(s => categoryPages(s.category, s.limit))])
  const posts = [
    ...categories.flat().map(p => parseComingPost(p.title, p.content, ctx)),
    ...polls.map(p => parsePollPage(p.title, p.content, ctx))
  ].filter((p): p is ComingPost => p !== null && p.date >= keepSince)
  // A post can sit in two categories; keep one copy.
  return [...new Map(posts.map(p => [`${p.kind}:${p.title}`, p])).values()]
}

async function loadComingUp (getMapping: () => Promise<WikiMappingEntry[]>): Promise<ComingPost[]> {
  const cached = await loadJson<CachedComingUp | null>(STORAGE_KEY, null, (v): v is CachedComingUp | null => v === null || isCached(v))
  const now = Date.now()
  if (cached && now - cached.fetchedAt < REFRESH_MS) return cached.posts
  try {
    const mapping = await getMapping()
    const ctx: ParseContext = { mentions: withPlurals(buildMentionIndex(mapping)), names: buildNameIndex(mapping) }
    const posts = await fetchComingUp(ctx, now - KEEP_DAYS * DAY_MS)
    await saveJson(STORAGE_KEY, { fetchedAt: now, posts } satisfies CachedComingUp)
    return posts
  } catch (error) {
    if (cached) {
      console.warn('[coming-up] refresh failed, using cached posts', error)
      return cached.posts
    }
    throw error
  }
}

/** Upcoming-content posts from the last ~3 months that name tradeable items. Cached on the phone. */
export function useComingUp () {
  const client = useQueryClient()
  return useQuery({
    queryKey: ['coming-up'],
    queryFn: () => loadComingUp(() => client.fetchQuery({ queryKey: ['mapping'], queryFn: fetchMapping, staleTime: MAPPING_STALE_MS, gcTime: PERSISTED_GC_TIME_MS })),
    staleTime: 60 * 60_000,
    gcTime: PERSISTED_GC_TIME_MS,
    retry: 1
  })
}
