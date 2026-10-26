// Game updates: prefer the curated ge-metrics.com dataset, fall back to
// reading `Update:` pages (namespace 112) straight from the OSRS Wiki API.

import { TtlCache } from '../cache.js'
import { GAME_UPDATES_URL, TTL, WIKI_API_URL } from '../config.js'
import { type FetchLike, UpstreamError, getJson } from '../wiki/http.js'
import { isObject } from '../wiki/parse.js'
import type { MappingEntry } from '../wiki/types.js'
import { type GameUpdate, type NameIndex, buildNameIndex, parseDataset, updateFromPage } from './parse.js'

const UPDATE_NAMESPACE = 112
const UPDATES_CATEGORY = 'Category:Old School RuneScape updates'
const PAGE_BATCH = 50
const MAX_LIST_PAGES = 3

export interface UpdateQuery {
  readonly since?: string
  readonly itemId?: number
  readonly itemName?: string
  readonly category?: string
  readonly limit: number
}

export interface UpdateResult {
  readonly source: 'ge-metrics dataset' | 'osrs wiki'
  readonly updates: readonly GameUpdate[]
}

export interface UpdateSource {
  list (query: UpdateQuery): Promise<UpdateResult>
  find (titleQuery: string): Promise<GameUpdate | null>
}

export function filterUpdates (updates: readonly GameUpdate[], q: UpdateQuery): GameUpdate[] {
  return updates
    .filter(u => !q.since || u.date >= q.since)
    .filter(u => q.itemId === undefined || u.items.includes(q.itemId))
    .filter(u => !q.category || u.category === q.category.toLowerCase())
    .sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title))
    .slice(0, q.limit)
}

const normalizeTitle = (s: string) => s.toLowerCase().replace(/^update:/, '').replace(/[^a-z0-9]+/g, ' ').trim()

export function findByTitle (updates: readonly GameUpdate[], query: string): GameUpdate | null {
  const q = normalizeTitle(query)
  const byRecency = [...updates].sort((a, b) => b.date.localeCompare(a.date))
  return byRecency.find(u => normalizeTitle(u.title) === q) ?? byRecency.find(u => normalizeTitle(u.title).includes(q)) ?? null
}

interface Deps {
  readonly fetchImpl?: FetchLike
  readonly cache?: TtlCache
  readonly mapping: () => Promise<readonly MappingEntry[]>
}

export function createUpdateSource ({ fetchImpl = fetch, cache = new TtlCache(), mapping }: Deps): UpdateSource {
  const wiki = (params: Record<string, string>) =>
    getJson(`${WIKI_API_URL}?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`, fetchImpl)

  // null = dataset not published (yet); remembered briefly so we don't refetch every call.
  const dataset = () => cache.get('updates:dataset', TTL.updates, async () => {
    try {
      return parseDataset(await getJson(GAME_UPDATES_URL, fetchImpl))
    } catch {
      return null
    }
  })

  const names = () => cache.get<NameIndex>('updates:names', TTL.mapping, async () => buildNameIndex(await mapping()))

  async function pages (titles: readonly string[]): Promise<GameUpdate[]> {
    const index = await names()
    const batches = Array.from({ length: Math.ceil(titles.length / PAGE_BATCH) }, (_, i) => titles.slice(i * PAGE_BATCH, (i + 1) * PAGE_BATCH))
    const results = await Promise.all(batches.map(batch =>
      cache.get(`updates:pages:${batch.join('|')}`, TTL.updates, async () => {
        const body = await wiki({ action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main', titles: batch.join('|') })
        const list = isObject(body) && isObject(body.query) && Array.isArray(body.query.pages) ? body.query.pages : []
        return list.filter(isObject).flatMap(page => {
          const revisions = Array.isArray(page.revisions) ? page.revisions : []
          const first = revisions[0]
          const content = isObject(first) && isObject(first.slots) && isObject(first.slots.main) ? first.slots.main.content : null
          const update = typeof page.title === 'string' && typeof content === 'string' ? updateFromPage(page.title, content, index) : null
          return update ? [update] : []
        })
      })))
    return results.flat()
  }

  const titlesFrom = (list: unknown): string[] =>
    Array.isArray(list) ? list.filter(isObject).map(p => p.title).filter((t): t is string => typeof t === 'string') : []

  // Newest update pages first (category membership time ~ publish time).
  async function recentTitles (count: number): Promise<string[]> {
    const titles: string[] = []
    let cont: string | undefined
    for (let i = 0; i < MAX_LIST_PAGES && titles.length < count; i++) {
      const body = await cache.get(`updates:recent:${cont ?? ''}`, TTL.updates, () => wiki({
        action: 'query', list: 'categorymembers', cmtitle: UPDATES_CATEGORY, cmnamespace: String(UPDATE_NAMESPACE),
        cmsort: 'timestamp', cmdir: 'desc', cmlimit: String(PAGE_BATCH), ...(cont ? { cmcontinue: cont } : {})
      }))
      if (!isObject(body) || !isObject(body.query)) throw new UpstreamError('Unexpected response from the wiki API')
      titles.push(...titlesFrom(body.query.categorymembers))
      cont = isObject(body.continue) && typeof body.continue.cmcontinue === 'string' ? body.continue.cmcontinue : undefined
      if (!cont) break
    }
    return titles.slice(0, count)
  }

  async function search (text: string, limit: number): Promise<string[]> {
    const body = await cache.get(`updates:search:${text}:${limit}`, TTL.updates, () => wiki({
      action: 'query', list: 'search', srsearch: text, srnamespace: String(UPDATE_NAMESPACE),
      srsort: 'create_timestamp_desc', srlimit: String(limit), srprop: ''
    }))
    return isObject(body) && isObject(body.query) ? titlesFrom(body.query.search) : []
  }

  async function fromWiki (q: UpdateQuery): Promise<GameUpdate[]> {
    // An item filter searches update text for the item's name, which also
    // finds older updates the recent-pages listing wouldn't reach.
    if (q.itemName) {
      const found = await pages(await search(`"${q.itemName.replace(/"/g, '')}"`, PAGE_BATCH))
      const { itemId } = q
      // Every search hit mentions the item, even when it isn't linked.
      const tagged = itemId === undefined
        ? found
        : found.map(u => (u.items.includes(itemId) ? u : Object.freeze({ ...u, items: [...u.items, itemId] })))
      return filterUpdates(tagged, q)
    }
    const want = q.since ? PAGE_BATCH * MAX_LIST_PAGES : Math.max(q.limit * 2, 20)
    return filterUpdates(await pages(await recentTitles(want)), q)
  }

  return {
    async list (q) {
      const data = await dataset()
      if (data) return { source: 'ge-metrics dataset', updates: filterUpdates(data, q) }
      return { source: 'osrs wiki', updates: await fromWiki(q) }
    },
    async find (titleQuery) {
      const data = await dataset()
      if (data) return findByTitle(data, titleQuery)
      const exact = await pages([`Update:${titleQuery.replace(/^Update:/i, '').trim()}`])
      if (exact[0]) return exact[0]
      const hits = await search(`intitle:${titleQuery.replace(/[^\w\s'-]/g, ' ')}`, 5)
      return findByTitle(await pages(hits), titleQuery) ?? (await pages(hits.slice(0, 1)))[0] ?? null
    }
  }
}
