// "Coming up" rows: each item named in an upcoming-content post with its price
// now, its 7-day change, its change since the post (to spot buying late) and
// whether a later game update already released it. Ported from
// mobile/src/lib/comingUp.ts.

import type { AveragePrice, IdMap } from '../../wiki/types.js'
import type { ComingPost } from './parse.js'
import { type Signal, classifySignal } from './signals.js'
import { DAY_SEC, type NameIndex, type UpdatePage, linkedItemIds } from './wikitext.js'

/** A move this big since the post means the news is already priced in. */
export const LATE_MOVE = 0.1
/** Jagex polls pass at 70% Yes. */
export const POLL_PASS_SHARE = 0.7

export type ComingStatus = 'pending' | 'released' | 'voting'

export interface ComingItem {
  readonly id: number
  readonly name: string
  readonly high: number | null
  readonly low: number | null
  readonly dailyVolume: number | null
}

export interface ComingRow {
  readonly id: number
  readonly name: string
  readonly sentence: string
  readonly signal: Signal | null
  readonly status: ComingStatus
  /** The later game update that mentions the item, when there is one. */
  readonly releasedIn: string | null
  readonly pollShare: number | null
  readonly now: number | null
  /** Mid price over the day before the post. */
  readonly before: number | null
  readonly sincePost: number | null
  readonly change7d: number | null
  readonly dayVolume: number | null
  /** Already moved at least LATE_MOVE the way the signal points (up when unknown). */
  readonly late: boolean
}

export interface ComingGroup {
  readonly post: ComingPost
  readonly rows: readonly ComingRow[]
}

export interface ComingContext {
  readonly names: NameIndex
  readonly getItem: (id: number) => ComingItem | null
  /** Game update pages (any order); they mark releases. */
  readonly gameUpdates: readonly UpdatePage[]
  readonly baselineFor: (post: ComingPost) => IdMap<AveragePrice> | undefined
  readonly weekAgo: IdMap<AveragePrice> | undefined
  /** Unix seconds. */
  readonly now: number
}

interface Release { readonly title: string; readonly date: number }

export function midPrice (high: number | null | undefined, low: number | null | undefined): number | null {
  if (high && low) return (high + low) / 2
  return high || low || null
}

export const changeSince = (before: number | null, after: number | null): number | null =>
  before && after ? (after - before) / before : null

/** Item id -> game updates that name it, oldest first. */
export function releaseIndex (updates: readonly UpdatePage[], names: NameIndex): Map<number, Release[]> {
  const games = updates.filter(u => u.kind === 'game').sort((a, b) => a.date - b.date)
  const index = new Map<number, Release[]>()
  for (const u of games) {
    for (const id of linkedItemIds(u, names)) index.set(id, [...(index.get(id) ?? []), { title: u.title, date: u.date }])
  }
  return index
}

const dayMid = (averages: IdMap<AveragePrice> | undefined, id: number) => {
  const a = averages?.get(id)
  return a ? midPrice(a.avgHighPrice, a.avgLowPrice) : null
}

function isLate (sincePost: number | null, signal: Signal | null): boolean {
  if (sincePost === null) return false
  return signal?.direction === 'down' ? sincePost <= -LATE_MOVE : sincePost >= LATE_MOVE
}

function statusOf (post: ComingPost, released: Release | undefined, now: number): ComingStatus {
  if (post.kind === 'poll' && post.closes !== null && now < post.closes + DAY_SEC) return 'voting'
  return released ? 'released' : 'pending'
}

const STATUS_ORDER: Readonly<Record<ComingStatus, number>> = { pending: 0, voting: 1, released: 2 }

const byInterest = (a: ComingRow, b: ComingRow): number =>
  STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
  Number(Boolean(b.signal)) - Number(Boolean(a.signal)) ||
  (b.dayVolume ?? -1) - (a.dayVolume ?? -1)

function buildRows (post: ComingPost, ctx: ComingContext, releases: ReadonlyMap<number, readonly Release[]>): ComingRow[] {
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
    const now = midPrice(item.high, item.low)
    const before = dayMid(baseline, item.id)
    const sincePost = changeSince(before, now)
    return [{
      id: item.id,
      name: item.name,
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

/** The 24h period to compare against: the whole day before the post (unix seconds). */
export const baselineDay = (post: Pick<ComingPost, 'date'>): number => post.date - DAY_SEC
