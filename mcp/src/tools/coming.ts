import type { McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { isoDate, pct } from '../analysis/format.js'
import { type ComingGroup, type ComingRow, baselineDay, buildComingUp, pendingOnly } from '../analysis/coming/rows.js'
import { DAY_SEC } from '../analysis/coming/wikitext.js'
import type { AveragePrice, IdMap } from '../wiki/types.js'
import type { ToolDeps } from './deps.js'
import { guarded } from './result.js'
import { READ_ONLY, limit } from './schemas.js'

const WEEK_DAYS = 7
const MAX_ROWS_PER_POST = 15

const rowJson = (r: ComingRow) => ({
  id: r.id,
  name: r.name,
  signal: r.signal ? `${r.signal.direction} (${r.signal.reason})` : null,
  status: r.status,
  releasedIn: r.releasedIn ?? undefined,
  pollYesPct: r.pollShare === null ? undefined : pct(r.pollShare),
  now: r.now === null ? null : Math.round(r.now),
  dayBeforePost: r.before === null ? null : Math.round(r.before),
  sincePostPct: pct(r.sincePost),
  change7dPct: pct(r.change7d),
  dailyVolume: r.dayVolume,
  late: r.late,
  sentence: r.sentence
})

const groupJson = (g: ComingGroup) => ({
  title: g.post.title,
  kind: g.post.kind,
  date: isoDate(g.post.date),
  pollCloses: g.post.closes === null ? undefined : isoDate(g.post.closes),
  url: g.post.url,
  items: g.rows.slice(0, MAX_ROWS_PER_POST).map(rowJson),
  moreItems: Math.max(0, g.rows.length - MAX_ROWS_PER_POST) || undefined
})

export function registerComingTools (server: McpServer, { prices, coming, now }: ToolDeps): void {
  const input = z.object({
    limit: limit(20, 5).describe('Max posts to return (1-20), newest first'),
    pending_only: z.boolean().default(true).describe('Only items not released yet (pending or still being voted on)')
  })
  server.registerTool('coming_up', {
    title: 'Coming up (update pre-positioning)',
    description: 'Items named in recent dev blogs, behind-the-scenes posts, polls and the "next week" lines of game updates (last 90 days, OSRS Wiki), with a keyword guess of the price direction (new use / less supply = up; more supply / nerf = down) and the sentence it came from. Each row: price now, change since the day before the post, 7-day change, status (pending / voting / released in a later game update), poll Yes %, and late = already moved 10%+ the way the signal points (news priced in). Failed poll questions (<70% Yes) are dropped. Pre-position in pending, non-late items with liquid volume; verify the sentence yourself.',
    inputSchema: input,
    annotations: READ_ONLY
  }, guarded('coming_up', async ({ limit, pending_only }: z.infer<typeof input>) => {
    const nowSec = now()
    const [data, mapping, latest, volumes] = await Promise.all([coming.load(nowSec), prices.mapping(), prices.latest(), prices.volumes()])
    const byId = new Map(mapping.map(m => [m.id, m]))
    const getItem = (id: number) => {
      const entry = byId.get(id)
      const l = latest.get(id)
      return entry ? { id, name: entry.name, high: l?.high ?? null, low: l?.low ?? null, dailyVolume: volumes.get(id) ?? null } : null
    }
    const ctx = { names: data.names, getItem, gameUpdates: data.gameUpdates, now: nowSec, weekAgo: undefined, baselineFor: () => undefined }
    // First pass without prices picks the posts; only those get baseline snapshots.
    const unpriced = buildComingUp(data.posts, ctx)
    const picked = (pending_only ? pendingOnly(unpriced) : unpriced).slice(0, limit)
    const days = [...new Set(picked.map(g => baselineDay(g.post)))]
    const weekAgoDay = (Math.floor(nowSec / DAY_SEC) - WEEK_DAYS) * DAY_SEC
    const snapshots = new Map<number, IdMap<AveragePrice>>(await Promise.all(
      [...new Set([...days, weekAgoDay])].map(async d => [d, await prices.averagesAt('24h', d)] as const)))
    const priced = buildComingUp(picked.map(g => g.post), { ...ctx, weekAgo: snapshots.get(weekAgoDay), baselineFor: p => snapshots.get(baselineDay(p)) })
    const groups = pending_only ? pendingOnly(priced) : priced
    return {
      posts: groups.length,
      groups: groups.map(groupJson),
      note: 'Direction is a keyword heuristic; read the sentence. dayBeforePost is the 24h average mid the day before the post.'
    }
  }))
}
