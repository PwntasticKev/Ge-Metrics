import type { CapitalPlanInput } from '../../lib/confirmedCapital.ts'

/** Strict whole GP: blank is unknown except for the optional reserve. */
export function parseGp (text: string, optional = false): number | null {
  const raw = text.trim()
  if (!raw) return optional ? 0 : null
  if (!/^\d+$/.test(raw)) return null
  const value = Number(raw)
  return Number.isSafeInteger(value) ? value : null
}

const ordered = <T extends { readonly id: string }>(rows: readonly T[]): T[] => [...rows].sort((a, b) => a.id.localeCompare(b.id))

/** Compare financial records, not notification/advice or cosmetic changes. */
export function capitalSnapshot (
  input: Pick<CapitalPlanInput, 'slots' | 'holdings' | 'sales'>,
  settings: { budget: number | null; membersItems: boolean; maxSellHours: number },
  reserve: string
): string {
  return JSON.stringify({
    slots: ordered(input.slots).map(({ id, itemId, side, price, qty, filled, filledValue, placedAt, updatedAt, lotId, costBasis, target, changes }) => ({ id, itemId, side, price, qty, filled, filledValue, placedAt, updatedAt, lotId, costBasis, target, changes })),
    holdings: ordered(input.holdings).map(({ id, itemId, qty, buyPrice, boughtAt, windowStart }) => ({ id, itemId, qty, buyPrice, boughtAt, windowStart })),
    sales: ordered(input.sales).map(({ id, lotId, itemId, qty, buyPrice, sellPrice, tax, profit, boughtAt, soldAt }) => ({ id, lotId, itemId, qty, buyPrice, sellPrice, tax, profit, boughtAt, soldAt })),
    budget: settings.budget,
    members: settings.membersItems,
    maxSellHours: settings.maxSellHours,
    reserve
  })
}

export function advanceActivity (previous: { snapshot: string; revision: number }, snapshot: string): { snapshot: string; revision: number } {
  return previous.snapshot === snapshot ? previous : { snapshot, revision: previous.revision + 1 }
}
