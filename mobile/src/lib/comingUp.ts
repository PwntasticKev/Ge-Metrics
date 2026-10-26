// "Coming up" rows: each item named in an upcoming-content post with its
// price now, its 7-day change, its change since the post (to spot buying
// late) and whether a later game update already released it. Pure.
import { changeSince, DAY_MS, linkedItemIds, midPrice, type GameUpdate, type NameIndex } from './gameUpdates.ts'
import type { ComingPost } from './comingUpParse.ts'
import { classifySignal, type Signal } from './updateSignals.ts'

/** A move this big since the post means the news is already priced in. */
export const LATE_MOVE = 0.1
/** Jagex polls pass at 70% Yes. */
export const POLL_PASS_SHARE = 0.7

export type ComingStatus = 'pending' | 'released' | 'voting'

export interface DayAverage {
  avgHighPrice: number | null
  avgLowPrice: number | null
}
type DayAverages = Readonly<Record<string, DayAverage>>

export interface ComingItem {
  id: number
  name: string
  icon: string | null
  high: number | null
  low: number | null
  dailyVolume: number | null
}

export interface ComingRow {
  id: number
  name: string
  icon: string | null
  sentence: string
  signal: Signal | null
  status: ComingStatus
  /** The later game update that mentions the item, when there is one. */
  releasedIn: string | null
  pollShare: number | null
  now: number | null
  /** Mid price over the day before the post. */
  before: number | null
  sincePost: number | null
  change7d: number | null
  dayVolume: number | null
  /** Already moved at least LATE_MOVE the way the signal points (up when unknown). */
  late: boolean
}

export interface ComingGroup {
  post: ComingPost
  rows: ComingRow[]
}

export interface ComingContext {
  names: NameIndex
  getItem: (id: number) => ComingItem | null
  /** Game updates and dev blogs, any order; game updates mark releases. */
  gameUpdates: readonly GameUpdate[]
  baselineFor: (post: ComingPost) => DayAverages | undefined
  weekAgo: DayAverages | undefined
  now: number
}

interface Release {
  title: string
  date: number
}

/** Item id -> game updates that name it, oldest first. */
export function releaseIndex (updates: readonly GameUpdate[], names: NameIndex): Map<number, Release[]> {
  const index = new Map<number, Release[]>()
  const games = updates.filter(u => u.kind === 'game').sort((a, b) => a.date - b.date)
  for (const u of games) {
    for (const id of linkedItemIds(u, names)) index.set(id, [...(index.get(id) ?? []), { title: u.title, date: u.date }])
  }
  return index
}

function dayMid (averages: DayAverages | undefined, id: number): number | null {
  const a = averages?.[String(id)]
  return a ? midPrice({ high: a.avgHighPrice, low: a.avgLowPrice }) : null
}

function isLate (sincePost: number | null, signal: Signal | null): boolean {
  if (sincePost === null) return false
  return signal?.direction === 'down' ? sincePost <= -LATE_MOVE : sincePost >= LATE_MOVE
}

function statusOf (post: ComingPost, released: Release | undefined, now: number): ComingStatus {
  if (post.kind === 'poll' && post.closes !== null && now < post.closes + DAY_MS) return 'voting'
  return released ? 'released' : 'pending'
}

const STATUS_ORDER: Record<ComingStatus, number> = { pending: 0, voting: 1, released: 2 }

function byInterest (a: ComingRow, b: ComingRow): number {
  return STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
    Number(Boolean(b.signal)) - Number(Boolean(a.signal)) ||
    (b.dayVolume ?? -1) - (a.dayVolume ?? -1)
}

function buildRows (post: ComingPost, ctx: ComingContext, releases: Map<number, Release[]>): ComingRow[] {
  const baseline = ctx.baselineFor(post)
  return post.mentions.flatMap((m): ComingRow[] => {
    const id = ctx.names.get(m.item.toLowerCase())
    const item = id === undefined ? null : ctx.getItem(id)
    if (!item) return []
    const pollShare = m.pollShare ?? null
    const released = releases.get(item.id)?.find(r => r.date > post.date)
    const status = statusOf(post, released, ctx.now)
    // A failed poll question won't ship.
    if (post.kind === 'poll' && status !== 'voting' && pollShare !== null && pollShare < POLL_PASS_SHARE) return []
    const signal = classifySignal(m.sentence)
    const now = midPrice(item)
    const before = dayMid(baseline, item.id)
    const sincePost = changeSince(before, now)
    return [{
      id: item.id,
      name: item.name,
      icon: item.icon,
      sentence: m.sentence,
      signal,
      status,
      releasedIn: released?.title ?? null,
      pollShare,
      now,
      before,
      sincePost,
      change7d: changeSince(dayMid(ctx.weekAgo, item.id), now),
      dayVolume: item.dailyVolume,
      late: isLate(sincePost, signal)
    }]
  }).sort(byInterest)
}

/** Posts newest first, each with its item rows; posts without known items are left out. */
export function buildComingUp (posts: readonly ComingPost[], ctx: ComingContext): ComingGroup[] {
  const releases = releaseIndex(ctx.gameUpdates, ctx.names)
  return [...posts]
    .sort((a, b) => b.date - a.date || a.title.localeCompare(b.title))
    .map(post => ({ post, rows: buildRows(post, ctx, releases) }))
    .filter(g => g.rows.length > 0)
}

/** Only items that are not out yet (pending or still being voted on). */
export function pendingOnly (groups: readonly ComingGroup[]): ComingGroup[] {
  return groups
    .map(g => ({ post: g.post, rows: g.rows.filter(r => r.status !== 'released') }))
    .filter(g => g.rows.length > 0)
}

/** "Released in <post>", "Voting, 82% yes" and similar short status text. */
export function statusText (row: Pick<ComingRow, 'status' | 'pollShare'>): string {
  if (row.status === 'voting') return row.pollShare === null ? 'voting' : `voting, ${Math.round(row.pollShare * 100)}% yes`
  if (row.status === 'released') return 'released'
  return row.pollShare !== null ? `passed ${Math.round(row.pollShare * 100)}%, not out yet` : 'not out yet'
}
