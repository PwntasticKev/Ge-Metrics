import type { Market, ProcessRecipe } from '@ge/engine'
import { geTax } from '../../../src/domain/flipping/geTax.js'
import { labMarket } from './processingLab.ts'

/** Reverified against live Wiki mapping and indexed primary Wiki mechanics.
 * Mapping: https://prices.runescape.wiki/api/v1/osrs/mapping
 * Pair: https://oldschool.runescape.wiki/w/Dharok%27s_platelegs_0
 * Fees: https://oldschool.runescape.wiki/w/Barrows_equipment#Repairing
 * Formula: https://oldschool.runescape.wiki/w/Armour_stand#Repair_cost_breakdown
 * Only fully broken -> undamaged; 4888 is NOT this broken item.
 */
export const repairDefinition = Object.freeze({
  id: 'repair:dharok-platelegs', inputId: 4902, outputId: 4722,
  name: "Dharok's platelegs", members: true, npcFee: 80000,
  source: 'https://oldschool.runescape.wiki/w/Dharok%27s_platelegs_0',
  feeSource: 'https://oldschool.runescape.wiki/w/Barrows_equipment#Repairing',
  formulaSource: 'https://oldschool.runescape.wiki/w/Armour_stand#Repair_cost_breakdown',
  mappingSource: 'https://prices.runescape.wiki/api/v1/osrs/mapping'
} as const)

export type RepairMethod = 'npc' | 'stand'
function levelCheck (level: number) {
  if (!Number.isInteger(level) || level < 1 || level > 99) throw new RangeError('Smithing must be a whole unboosted level from 1 to 99')
}
function checked (value: number): number {
  if (!Number.isSafeInteger(value)) throw new RangeError('Unsafe repair arithmetic')
  return value
}
/** Unboosted levels only. Fee = 80000 * (1 - level/200), exactly 400 GP per level. */
export function repairRecipe (method: RepairMethod, effectiveSmithing: number): ProcessRecipe {
  levelCheck(effectiveSmithing)
  if (method !== 'npc' && method !== 'stand') throw new RangeError('Unknown repair method')
  return {
    id: `${repairDefinition.id}:${method}`, method: 'repair', name: repairDefinition.name,
    inputs: [{ id: repairDefinition.inputId, qty: 1 }], outputs: [{ id: repairDefinition.outputId, qty: 1 }],
    coinCost: method === 'npc' ? repairDefinition.npcFee : repairDefinition.npcFee - 400 * effectiveSmithing,
    actionsPerHour: null, members: true, source: repairDefinition.source,
    location: method === 'npc' ? 'Barrows repair NPC' : 'Armour stand in any player-owned house'
  }
}

export interface RepairAmounts {
  purchase: number
  fee: number
  upfrontCash: number
  grossSale: number
  tax: number
  netSale: number
  profit: number
}
const zero = (): RepairAmounts => ({ purchase: 0, fee: 0, upfrontCash: 0, grossSale: 0, tax: 0, netSale: 0, profit: 0 })

/** Raw latest high buys / low sells, via the existing lab adapter. Quotes are
 * observations, never fills or proceeds. Fixed upfront batch, all inputs bought;
 * no owned stock, reinvestment, limit sizing, throughput or personal flow.
 * Unknown quotes leave per-item/batch amounts null (zero quantity has zero flow).
 * Timestamps and mapping limits are metadata, not remaining allowance. Stale
 * observations remain visible for comparison, never a recommendation.
 * Returned recipes can also be passed to existing price ceilings/floors using
 * labMarket(rawMarket, 'instant', 'instant', undefined).
 */
export function compareRepair (rawMarket: Market, effectiveSmithing: number, quantity: number, options: {
  tax?: (price: number, id: number) => number
  staleAfterSec?: number
} = {}) {
  const npc = repairRecipe('npc', effectiveSmithing)
  const stand = repairRecipe('stand', effectiveSmithing)
  if (!Number.isSafeInteger(quantity) || quantity < 0) throw new RangeError('Quantity must be a nonnegative safe whole count')
  const staleAfterSec = options.staleAfterSec ?? 300
  if (!Number.isFinite(staleAfterSec) || staleAfterSec < 0 || !Number.isFinite(rawMarket.nowSec)) throw new RangeError('Invalid quote age settings')
  const market = labMarket(rawMarket, 'instant', 'instant', undefined)
  const quote = (id: number, side: 'input' | 'output') => {
    const raw = rawMarket.get(id)
    const selected = market.get(id)
    const price = (side === 'input' ? selected?.low : selected?.high) ?? null
    if (price !== null && (!Number.isSafeInteger(price) || price <= 0)) throw new RangeError('Quote must be positive safe whole GP or null')
    const time = (side === 'input' ? raw?.highTime : raw?.lowTime) ?? null
    const ageSec = time === null || !Number.isSafeInteger(time) || time <= 0 || time > rawMarket.nowSec ? null : rawMarket.nowSec - time
    return { id, side: side === 'input' ? 'high' as const : 'low' as const, price, time,
      ageSec, stale: ageSec === null ? null : ageSec > staleAfterSec, mappingLimit: raw?.limit ?? null }
  }
  const input = quote(repairDefinition.inputId, 'input')
  const output = quote(repairDefinition.outputId, 'output')
  const missingSides = [input, output].filter(q => q.price === null).map(q => ({ id: q.id, side: q.side }))
  const tax = output.price === null ? null : checked((options.tax ?? geTax)(output.price, output.id))
  if (tax !== null && (tax < 0 || tax > output.price!)) throw new RangeError('Invalid sale tax')
  const evaluate = (recipe: ProcessRecipe) => {
    let perItem: RepairAmounts | null = null
    if (input.price !== null && output.price !== null && tax !== null) {
      const upfrontCash = checked(input.price + recipe.coinCost!)
      const netSale = checked(output.price - tax)
      perItem = { purchase: input.price, fee: recipe.coinCost!, upfrontCash, grossSale: output.price, tax, netSale, profit: checked(netSale - upfrontCash) }
    }
    let batch: RepairAmounts | null = quantity === 0 ? zero() : null
    if (quantity > 0 && perItem) {
      batch = zero()
      for (const key of Object.keys(batch) as (keyof RepairAmounts)[]) batch[key] = checked(perItem[key] * quantity)
    } else if (quantity > 0) {
      // Known fees must remain safe even when a market leg is absent.
      checked(recipe.coinCost! * quantity)
    }
    return { recipe, perItem, batch }
  }
  return { quantity, effectiveSmithing, quotes: { input, output }, missingSides,
    npc: evaluate(npc), stand: evaluate(stand) }
}
