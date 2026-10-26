import type { McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { isoDate } from '../analysis/format.js'
import { pickTimestep, updateImpact } from '../analysis/impact.js'
import { ToolInputError, resolveItem } from '../analysis/resolve.js'
import { parseWikiDate } from '../updates/parse.js'
import type { MappingEntry } from '../wiki/types.js'
import type { ToolDeps } from './deps.js'
import { guarded } from './result.js'
import { READ_ONLY, itemRef, limit } from './schemas.js'

const MAX_ITEMS_PER_UPDATE = 25
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')

const toUnixDay = (date: string) => Date.parse(`${date}T00:00:00Z`) / 1000

function withItemNames (items: readonly number[], byId: ReadonlyMap<number, MappingEntry>) {
  return items.slice(0, MAX_ITEMS_PER_UPDATE).map(id => ({ id, name: byId.get(id)?.name ?? null }))
}

export function registerUpdateTools (server: McpServer, { prices, updates, now }: ToolDeps): void {
  const listInput = z.object({
    since: isoDateSchema.optional().describe('Only updates on or after this date (YYYY-MM-DD)'),
    item: itemRef.optional().describe('Only updates that mention this item (id or name)'),
    category: z.string().max(30).optional().describe('Filter by category, e.g. "game" or "devblog"'),
    limit: limit(50, 10)
  })
  server.registerTool('game_updates', {
    title: 'Game updates',
    description: 'Recent OSRS game updates and dev blogs (newest first) with the items each one mentions. Use with update_impact to see how an update moved an item\'s price. Source: the ge-metrics.com dataset, or the OSRS Wiki "Update:" pages when the dataset is unavailable.',
    inputSchema: listInput,
    annotations: READ_ONLY
  }, guarded('game_updates', async (a: z.infer<typeof listInput>) => {
    const mapping = await prices.mapping()
    const entry = a.item === undefined ? undefined : resolveItem(mapping, a.item)
    const result = await updates.list({ since: a.since, itemId: entry?.id, itemName: entry?.name, category: a.category, limit: a.limit })
    const byId = new Map(mapping.map(m => [m.id, m]))
    return {
      source: result.source,
      item: entry ? { id: entry.id, name: entry.name } : undefined,
      count: result.updates.length,
      updates: result.updates.map(u => ({ ...u, itemCount: u.items.length, items: withItemNames(u.items, byId) }))
    }
  }))

  const impactInput = z.object({
    item: itemRef,
    update: z.string().trim().min(3).max(200).describe('Update title (or part of it), e.g. "Fractured Archive", or a date YYYY-MM-DD'),
    window_days: z.number().min(0.25).max(60).default(7).describe('Days compared before vs after the update')
  })
  server.registerTool('update_impact', {
    title: 'Update impact',
    description: 'How an item\'s price and volume moved around a game update: average mid price and daily volume in a window before vs after the update date, % changes, and change from the pre-update average to the latest price. Picks the finest price history that covers the window.',
    inputSchema: impactInput,
    annotations: READ_ONLY
  }, guarded('update_impact', async (a: z.infer<typeof impactInput>) => {
    const entry = resolveItem(await prices.mapping(), a.item)
    const asDate = parseWikiDate(a.update)
    const update = asDate ? null : await updates.find(a.update)
    if (!asDate && !update) throw new ToolInputError(`No game update matches "${a.update}". Use game_updates to find the exact title.`)
    const date = asDate ?? (update as { date: string }).date
    const eventSec = toUnixDay(date)
    const nowSec = now()
    if (eventSec > nowSec) throw new ToolInputError(`${date} is in the future.`)
    const timestep = pickTimestep(eventSec, nowSec, a.window_days)
    const points = await prices.timeseries(entry.id, timestep)
    return {
      item: { id: entry.id, name: entry.name },
      update: update ? { title: update.title, date: update.date, url: update.url, wikiUrl: update.wikiUrl } : { date },
      note: `Update dates have day precision; windows split at ${isoDate(eventSec)} 00:00 UTC.`,
      ...updateImpact({ points, timestep, eventSec, windowDays: a.window_days, nowSec })
    }
  }))
}
