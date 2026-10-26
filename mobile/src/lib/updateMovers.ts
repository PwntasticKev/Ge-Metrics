// "Update movers": items mentioned in the latest game updates and dev blogs,
// with their price move since the post. Pure; the screen supplies prices.
import { changeSince, midPrice, type GameUpdate, type PricePair } from './gameUpdates.ts'

export interface MoverItem {
  id: number
  name: string
  icon: string | null
  high: number | null
  low: number | null
}

export interface MoverRow {
  id: number
  name: string
  icon: string | null
  /** Mid price over the day before the post. */
  before: number | null
  /** Mid price now. */
  now: number | null
  change: number | null
}

export interface MoverGroup {
  update: GameUpdate
  rows: MoverRow[]
  /** Items left out to keep the list short. */
  hidden: number
}

/** Largest moves first (up or down); items without a move last. */
function byMove (a: MoverRow, b: MoverRow): number {
  if (a.change === null || b.change === null) return a.change === null ? (b.change === null ? 0 : 1) : -1
  return Math.abs(b.change) - Math.abs(a.change)
}

export function buildMoverGroup (
  update: GameUpdate,
  itemIds: readonly number[],
  getItem: (id: number) => MoverItem | null,
  baseline: Readonly<Record<string, { avgHighPrice: number | null; avgLowPrice: number | null }>> | undefined,
  maxRows: number
): MoverGroup {
  const rows = itemIds.flatMap((id): MoverRow[] => {
    const item = getItem(id)
    if (!item) return []
    const past = baseline?.[String(id)]
    const before = midPrice(past ? { high: past.avgHighPrice, low: past.avgLowPrice } satisfies PricePair : null)
    const now = midPrice(item)
    return [{ id, name: item.name, icon: item.icon, before, now, change: changeSince(before, now) }]
  }).sort(byMove)
  return { update, rows: rows.slice(0, maxRows), hidden: Math.max(0, rows.length - maxRows) }
}
