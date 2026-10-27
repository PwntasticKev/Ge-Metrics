import type { Market, ProcessRecipe } from '@ge/engine'
import type { ProcessingSession } from '../../lib/processingSessions'

export function recorderUnavailableReason(recipe: ProcessRecipe): string | null {
  return [...recipe.inputs.map(i => i.qty), ...recipe.outputs.map(i => i.qty), recipe.coinCost ?? 0, recipe.coinRevenue ?? 0].every(n => Number.isSafeInteger(n) && n >= 0)
    ? null : 'Actual-session recording is unavailable for fractional recipes. This recorder requires whole item and coin ratios.'
}
export function snapshotRecipe(recipe: ProcessRecipe, methodKey: string, market: Market): ProcessingSession['recipe'] {
  const reason = recorderUnavailableReason(recipe)
  if (reason) throw new Error(reason)
  const items = (rows: ProcessRecipe['inputs']) => rows.map(row => {
    const item = market.get(row.id)
    if (!item) throw new Error('Item metadata is unavailable. Refresh the lab before recording this recipe.')
    return { itemId: item.id, name: item.name, icon: item.icon, qtyPerAction: row.qty }
  })
  const inputs = items(recipe.inputs); const outputs = items(recipe.outputs)
  return { id: recipe.id, methodKey, name: recipe.name ?? outputs[0]?.name ?? inputs[0]?.name ?? recipe.id, source: recipe.source ?? null, inputs, outputs, coinCostPerAction: recipe.coinCost ?? 0, coinRevenuePerAction: recipe.coinRevenue ?? 0, curatedActionsPerHour: recipe.actionsPerHour ?? null }
}
