import type { Flip, Lot } from './pnl/journal'
import type { Slot } from './slots/slots'

/** Replacement balance, already excluding cash committed to existing offers. */
export interface CashDeclaration {
  readonly id: string
  readonly amountGp: number
  readonly confirmedAt: number
  readonly activityRevision: number
}

export interface CapitalPlanInput {
  readonly declaration: CashDeclaration | null
  /** Caller must advance this on placement, repricing, fills, closure and manual buy/sell logging. */
  readonly activityRevision: number
  readonly now: number
  readonly reserveGp: number
  readonly slotCount: number
  readonly slots: readonly Slot[]
  readonly holdings: readonly Lot[]
  readonly sales: readonly Flip[]
}

export type CapitalReason = 'invalid-declaration' | 'invalid-reserve' | 'invalid-time' | 'invalid-activity-revision' | 'invalid-slot-count' | 'activity-changed' | 'too-many-occupied-slots' | 'duplicate-record-id' | 'missing-linked-lot' | 'conflicting-linked-slots' | 'linked-quantity-exceeds-lot' | 'linked-item-mismatch'

export interface CapitalPlanBudget {
  readonly status: 'unknown' | 'invalid' | 'reconfirm' | 'reconcile' | 'ready'
  /** Null means unavailable for planning, rather than a known zero balance. */
  readonly spendableGp: number | null
  readonly freeSlots: number
  /** Pass these bounds to the existing allocation engine; this module allocates nothing. */
  readonly planBudget: { readonly cash: number; readonly slots: number } | null
  readonly reasons: readonly CapitalReason[]
  readonly nextActions: {
    readonly reviewOpenOffers: number
    /** Filled offers have unknown collection status, not proven uncollected cash. */
    readonly reviewCollection: number
    readonly reviewInventory: number
    /** Sales are historical evidence only; collection and current cash remain unknown. */
    readonly reviewHistoricalSales: number
  }
}

const whole = (value: number): boolean => Number.isSafeInteger(value) && value >= 0
const time = (value: number): boolean => Number.isSafeInteger(value) && value > 0
const duplicateIds = (records: readonly { readonly id: string }[]): boolean => new Set(records.map(r => r.id)).size !== records.length

/**
 * Pure funding bounds for Buy now → Plan. No age-based expiry is invented:
 * freshness is explicit activity revision equality plus a non-future confirmation.
 * Holdings, sales and fills never supply or credit cash. Collection provenance
 * deliberately has no budget input; after collecting, confirm a replacement total.
 */
export function deriveCapitalPlan (input: CapitalPlanInput): CapitalPlanBudget {
  const { declaration, activityRevision, now, reserveGp, slotCount, slots, holdings, sales } = input
  const reasons: CapitalReason[] = []
  const validSlotCount = slotCount === 3 || slotCount === 8
  if (!whole(reserveGp)) reasons.push('invalid-reserve')
  if (!time(now)) reasons.push('invalid-time')
  if (!whole(activityRevision)) reasons.push('invalid-activity-revision')
  if (!validSlotCount) reasons.push('invalid-slot-count')
  if (declaration && (!declaration.id.trim() || !whole(declaration.amountGp) || !time(declaration.confirmedAt) || declaration.confirmedAt > now || !whole(declaration.activityRevision))) reasons.push('invalid-declaration')
  const invalid = reasons.length > 0
  if (declaration && declaration.activityRevision !== activityRevision) reasons.push('activity-changed')
  if (validSlotCount && slots.length > slotCount) reasons.push('too-many-occupied-slots')
  if (duplicateIds(slots) || duplicateIds(holdings) || duplicateIds(sales)) reasons.push('duplicate-record-id')
  const linkedSells = slots.filter(s => s.side === 'sell' && s.lotId !== null)
  for (const slot of linkedSells) {
    const lot = holdings.find(l => l.id === slot.lotId)
    if (!lot) reasons.push('missing-linked-lot')
    else {
      if (lot.itemId !== slot.itemId) reasons.push('linked-item-mismatch')
      // Linked sell fills stay in Bought until closure: qty includes filled items.
      const linked = linkedSells.filter(s => s.lotId === slot.lotId)
      const total = linked.reduce((sum, s) => sum + s.qty, 0)
      if (!Number.isSafeInteger(total) || total > lot.qty) {
        reasons.push('linked-quantity-exceeds-lot')
        if (linked.length > 1) reasons.push('conflicting-linked-slots')
      }
    }
  }
  const status = invalid ? 'invalid' : reasons.includes('activity-changed') ? 'reconfirm' : reasons.length ? 'reconcile' : !declaration ? 'unknown' : 'ready'
  const freeSlots = validSlotCount ? Math.max(0, slotCount - slots.length) : 0
  const spendableGp = status === 'ready' && declaration ? Math.max(0, declaration.amountGp - reserveGp) : null
  return {
    status,
    spendableGp,
    freeSlots,
    planBudget: spendableGp === null ? null : { cash: spendableGp, slots: freeSlots },
    reasons: [...new Set(reasons)],
    nextActions: {
      reviewOpenOffers: slots.length,
      reviewCollection: slots.filter(s => s.filled > 0).length,
      // Count lots needing review, never combine lot and linked-slot quantities.
      reviewInventory: holdings.length,
      reviewHistoricalSales: sales.length
    }
  }
}
