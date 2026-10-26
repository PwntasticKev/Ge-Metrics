import { describe, expect, it, vi } from 'vitest'
import { TtlCache } from '../src/cache.js'
import { buildNameIndex, extractItems, parseDataset, parseUpdateTemplate, parseWikiDate, updateFromPage, wikiPageUrl } from '../src/updates/parse.js'
import { createUpdateSource, filterUpdates, findByTitle } from '../src/updates/source.js'
import { MAPPING } from './fixtures/market.js'
import { DATASET, UPDATE_WIKITEXT } from './fixtures/updates.js'

const names = buildNameIndex(MAPPING)
const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 })

describe('update parsing', () => {
  it('parses wiki and ISO dates', () => {
    expect(parseWikiDate('20 October 2026')).toBe('2026-10-20')
    expect(parseWikiDate('5 May 2025')).toBe('2025-05-05')
    expect(parseWikiDate('2026-01-02')).toBe('2026-01-02')
    expect(parseWikiDate('Smarch 5 2026')).toBeNull()
  })

  it('reads the {{Update}} template', () => {
    expect(parseUpdateTemplate(UPDATE_WIKITEXT)).toEqual({
      date: '2026-10-20', url: 'https://secure.runescape.com/m=news/the-fractured-archive?oldschool=1', category: 'game'
    })
    expect(parseUpdateTemplate('no template here')).toBeNull()
  })

  it('finds linked items and multi-word mentions, not single-word noise', () => {
    const items = extractItems(UPDATE_WIKITEXT, names)
    expect(items).toEqual(expect.arrayContaining([4151, 4587, 536]))
    expect(items).not.toContain(1511) // "Logs" is only mentioned in plain text
  })

  it('builds an update from a page', () => {
    const update = updateFromPage('Update:The Fractured Archive', UPDATE_WIKITEXT, names)
    expect(update).toMatchObject({ date: '2026-10-20', title: 'The Fractured Archive', category: 'game', wikiUrl: wikiPageUrl('Update:The Fractured Archive') })
    expect(update?.wikiUrl).toBe('https://oldschool.runescape.wiki/w/Update:The_Fractured_Archive')
    expect(updateFromPage('Update:Nothing', 'plain text', names)).toBeNull()
  })

  it('validates the ge-metrics dataset', () => {
    const updates = parseDataset(DATASET)
    expect(updates).toHaveLength(3)
    expect(updates[2]?.items).toEqual([536])
    expect(() => parseDataset({ nope: true })).toThrow()
  })
})

describe('filterUpdates / findByTitle', () => {
  const updates = parseDataset(DATASET)
  it('filters by date, item and category, newest first', () => {
    expect(filterUpdates(updates, { limit: 10 }).map(u => u.date)).toEqual(['2026-10-20', '2026-10-14', '2026-09-01'])
    expect(filterUpdates(updates, { since: '2026-10-01', limit: 10 })).toHaveLength(2)
    expect(filterUpdates(updates, { itemId: 536, limit: 10 }).map(u => u.title)).toEqual(['Dev Blog: Sailing Rewards'])
    expect(filterUpdates(updates, { category: 'DEVBLOG', limit: 10 })).toHaveLength(1)
    expect(filterUpdates(updates, { limit: 1 })).toHaveLength(1)
  })

  it('matches titles loosely', () => {
    expect(findByTitle(updates, 'fractured archive')?.date).toBe('2026-10-20')
    expect(findByTitle(updates, 'Update:More Gathering Efficiencies')?.date).toBe('2026-10-14')
    expect(findByTitle(updates, 'nothing like this')).toBeNull()
  })
})

describe('createUpdateSource', () => {
  const mapping = async () => MAPPING

  it('prefers the ge-metrics dataset', async () => {
    const fetchImpl = vi.fn(async () => ok(DATASET))
    const source = createUpdateSource({ fetchImpl, cache: new TtlCache(), mapping })
    const result = await source.list({ limit: 2 })
    expect(result.source).toBe('ge-metrics dataset')
    expect(result.updates).toHaveLength(2)
    expect((await source.find('gathering'))?.date).toBe('2026-10-14')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('falls back to wiki Update: pages when the dataset is missing', async () => {
    const fetchImpl = vi.fn(async (url: string, _init?: RequestInit) => {
      if (url.includes('game-updates.json')) return new Response('', { status: 404 })
      const params = new URL(url).searchParams
      if (params.get('list') === 'categorymembers') {
        return ok({ query: { categorymembers: [{ title: 'Update:The Fractured Archive' }, { title: 'Update:Broken' }] } })
      }
      if (params.get('prop') === 'revisions') {
        return ok({ query: { pages: [
          { title: 'Update:The Fractured Archive', revisions: [{ slots: { main: { content: UPDATE_WIKITEXT } } }] },
          { title: 'Update:Broken', revisions: [{ slots: { main: { content: 'no template' } } }] }
        ] } })
      }
      return new Response('', { status: 400 })
    })
    const source = createUpdateSource({ fetchImpl, cache: new TtlCache(), mapping })
    const result = await source.list({ limit: 5 })
    expect(result.source).toBe('osrs wiki')
    expect(result.updates).toHaveLength(1)
    expect(result.updates[0]).toMatchObject({ title: 'The Fractured Archive', date: '2026-10-20' })
    const ua = (fetchImpl.mock.calls[1]?.[1]?.headers as Record<string, string>)['User-Agent']
    expect(ua).toMatch(/GE-Metrics/)
  })

  it('searches update text for an item when filtering by item on the wiki', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes('game-updates.json')) return new Response('', { status: 404 })
      const params = new URL(url).searchParams
      if (params.get('list') === 'search') {
        expect(params.get('srsearch')).toBe('"Logs"')
        return ok({ query: { search: [{ title: 'Update:The Fractured Archive' }] } })
      }
      return ok({ query: { pages: [{ title: 'Update:The Fractured Archive', revisions: [{ slots: { main: { content: UPDATE_WIKITEXT } } }] }] } })
    })
    const source = createUpdateSource({ fetchImpl, cache: new TtlCache(), mapping })
    const result = await source.list({ itemId: 1511, itemName: 'Logs', limit: 5 })
    expect(result.updates[0]?.items).toContain(1511)
  })
})
