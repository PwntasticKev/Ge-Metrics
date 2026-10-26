import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { WikiMappingEntry } from '@ge/engine'
import { buildMentionIndex, buildNameIndex, DAY_MS, isGameUpdate, mergeUpdates, parseUpdatePage, type GameUpdate, type MentionIndex, type NameIndex } from '../lib/gameUpdates'
import { loadJson, saveJson } from '../state/storage'
import { PERSISTED_GC_TIME_MS } from './queryCache'
import { fetchMapping, fetchWikiJson, isObject, WikiError } from './wiki'

// OSRS Wiki MediaWiki API. Native apps have no CORS limits, so the phone
// reads `Update:` pages directly; nothing goes through a server of ours.
//
// Step 1 lists each year's posts (`Category:2026 updates`), keeping only game
// updates and dev blogs. Step 2 downloads the text of posts not cached yet,
// 50 per request. After the first run a daily refresh is a few small requests.
const WIKI_API = 'https://oldschool.runescape.wiki/api.php'
const UPDATE_NAMESPACE = 112
const KIND_CATEGORIES = 'Category:Game updates|Category:Future Updates'
const TITLES_PER_REQUEST = 50
const MAX_REQUESTS = 24
// Enough history for the 1Y chart.
const KEEP_DAYS = 400
// Re-read posts from the last few days to pick up late edits.
const RECHECK_DAYS = 3
const REFRESH_MS = DAY_MS
const MAPPING_STALE_MS = 6 * 60 * 60 * 1000
const STORAGE_KEY = 'gem.game-updates.v1'

interface CachedUpdates {
  fetchedAt: number
  updates: GameUpdate[]
}

function isCachedUpdates (value: unknown): value is CachedUpdates {
  return isObject(value) && typeof value.fetchedAt === 'number' && Array.isArray(value.updates) && value.updates.every(isGameUpdate)
}

export function apiUrl (params: Record<string, string>): string {
  return `${WIKI_API}?${new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', ...params }).toString()}`
}

export function queryPages (body: unknown): Record<string, unknown>[] {
  if (!isObject(body)) throw new WikiError('Unexpected response from the wiki')
  if (isObject(body.error)) throw new WikiError(`Wiki error: ${String(body.error.info ?? body.error.code)}`)
  const query = body.query
  if (!isObject(query) || !Array.isArray(query.pages)) return []
  return query.pages.filter(isObject)
}

function continuation (body: unknown): Record<string, string> | null {
  if (!isObject(body) || !isObject(body.continue)) return null
  return Object.fromEntries(Object.entries(body.continue).map(([k, v]) => [k, String(v)]))
}

// Runs a query and its continuations, handing every page to `onPage`.
async function forEachPage (params: Record<string, string>, budget: { left: number }, onPage: (page: Record<string, unknown>) => void): Promise<void> {
  let cont: Record<string, string> = {}
  for (;;) {
    if (budget.left-- <= 0) throw new WikiError('Too many wiki requests')
    const body = await fetchWikiJson(apiUrl({ ...params, ...cont }), 'Wiki')
    queryPages(body).forEach(onPage)
    const next = continuation(body)
    if (!next) return
    cont = next
  }
}

// Titles of a year's game updates and dev blogs.
async function listPriceMovingPosts (year: number, budget: { left: number }): Promise<Set<string>> {
  const titles = new Set<string>()
  await forEachPage({
    generator: 'categorymembers',
    gcmtitle: `Category:${year} updates`,
    gcmnamespace: String(UPDATE_NAMESPACE),
    gcmlimit: 'max',
    prop: 'categories',
    clcategories: KIND_CATEGORIES,
    cllimit: 'max'
  }, budget, page => {
    if (typeof page.title === 'string' && Array.isArray(page.categories) && page.categories.length) titles.add(page.title)
  })
  return titles
}

export function pageContent (page: Record<string, unknown>): string | null {
  const revision = Array.isArray(page.revisions) ? page.revisions[0] : null
  const slots = isObject(revision) ? revision.slots : null
  const main = isObject(slots) ? slots.main : null
  return isObject(main) && typeof main.content === 'string' ? main.content : null
}

async function fetchPosts (titles: string[], mentions: MentionIndex, budget: { left: number }): Promise<GameUpdate[]> {
  const updates: GameUpdate[] = []
  for (let i = 0; i < titles.length; i += TITLES_PER_REQUEST) {
    const batch = titles.slice(i, i + TITLES_PER_REQUEST)
    await forEachPage({ titles: batch.join('|'), prop: 'revisions', rvprop: 'content', rvslots: 'main' }, budget, page => {
      const content = pageContent(page)
      const parsed = typeof page.title === 'string' && content ? parseUpdatePage(page.title, content, mentions) : null
      if (parsed) updates.push(parsed)
    })
  }
  return updates
}

async function fetchNewPosts (cached: readonly GameUpdate[], mentions: MentionIndex, keepSince: number, now: number): Promise<GameUpdate[]> {
  const budget = { left: MAX_REQUESTS }
  const years: number[] = []
  for (let y = new Date(keepSince).getUTCFullYear(); y <= new Date(now).getUTCFullYear(); y++) years.push(y)
  const listed = (await Promise.all(years.map(y => listPriceMovingPosts(y, budget)))).flatMap(set => [...set])
  const recheckSince = now - RECHECK_DAYS * DAY_MS
  const known = new Map(cached.map(u => [`Update:${u.title}`, u]))
  const wanted = listed.filter(title => {
    const old = known.get(title)
    return !old || old.date >= recheckSince
  })
  return fetchPosts(wanted, mentions, budget)
}

async function loadGameUpdates (getMapping: () => Promise<WikiMappingEntry[]>): Promise<GameUpdate[]> {
  const cached = await loadJson<CachedUpdates | null>(STORAGE_KEY, null, (v): v is CachedUpdates | null => v === null || isCachedUpdates(v))
  const now = Date.now()
  if (cached && now - cached.fetchedAt < REFRESH_MS) return cached.updates

  const keepSince = now - KEEP_DAYS * DAY_MS
  try {
    const mentions = buildMentionIndex(await getMapping())
    const fresh = await fetchNewPosts(cached?.updates ?? [], mentions, keepSince, now)
    const updates = mergeUpdates(cached?.updates ?? [], fresh, keepSince)
    await saveJson(STORAGE_KEY, { fetchedAt: now, updates } satisfies CachedUpdates)
    return updates
  } catch (error) {
    // Offline or the wiki is down: older posts are still useful.
    if (cached) {
      console.warn('[game-updates] refresh failed, using cached posts', error)
      return cached.updates
    }
    throw error
  }
}

/** Game updates and dev blogs from the last ~year, newest first. Cached on the phone, refreshed daily. */
export function useGameUpdates () {
  const client = useQueryClient()
  return useQuery({
    queryKey: ['game-updates'],
    queryFn: () => loadGameUpdates(() => client.fetchQuery({ queryKey: ['mapping'], queryFn: fetchMapping, staleTime: MAPPING_STALE_MS, gcTime: PERSISTED_GC_TIME_MS })),
    staleTime: 60 * 60_000,
    gcTime: PERSISTED_GC_TIME_MS,
    retry: 1
  })
}

/** Item name -> id from the cached mapping, for matching wiki links. */
export function useItemNameIndex (): NameIndex | null {
  const { data } = useQuery<WikiMappingEntry[]>({ queryKey: ['mapping'], queryFn: fetchMapping, staleTime: MAPPING_STALE_MS, gcTime: PERSISTED_GC_TIME_MS })
  return useMemo(() => (data ? buildNameIndex(data) : null), [data])
}
