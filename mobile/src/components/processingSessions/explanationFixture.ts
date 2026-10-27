import type { ProcessingSession } from '../../lib/processingSessions.ts'
export function example(): ProcessingSession {
  const item = { itemId: 1, name: 'Synthetic item', icon: null }
  return { id: 's', status: 'processed', recipe: { id: 'r', methodKey: 'm', name: 'Synthetic', source: null, inputs: [], outputs: [], coinCostPerAction: 0, coinRevenuePerAction: 0, curatedActionsPerHour: null }, processingStartedAt: 0, processingEndedAt: 1000, elapsedTimeConfirmed: true, pauses: [], externalGeWaits: [], actionsCompleted: 100,
    inputs: [{ id: 'i', item, acquiredQty: 100, consumedQty: 100, origin: 'purchased', acquisitionCostGp: 100000, consumedCostGp: 100000, opportunityValueGp: 200000 }], outputs: [{ id: 'o', item, producedQty: 100 }], processingFeesGp: 12000, otherExpensesGp: 1000, directCoinReceiptsGp: 0,
    sales: [{ id: 'a', outputId: 'o', qty: 60, unitPriceGp: 2000, soldAt: 1000, taxGp: 2400, taxBasis: 'engine', taxRuleVersion: null }, { id: 'b', outputId: 'o', qty: 40, unitPriceGp: 2100, soldAt: 1000, taxGp: 1680, taxBasis: 'player_confirmed', taxRuleVersion: 'saved-v' }] }
}
