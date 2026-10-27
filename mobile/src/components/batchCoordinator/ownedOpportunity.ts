import { compareOwnedInputOpportunity, type OwnedInputOpportunityRecipe, type OwnedInputOpportunityResult } from '../../lib/ownedInputOpportunity.ts'

export const parseBatchNumber = (text: string): number | null => {
  const raw = text.trim()
  const n = Number(raw)
  return /^\d+$/.test(raw) && Number.isSafeInteger(n) && n <= 1_000_000_000 ? n : null
}
type State = { kind: 'ready'; result: OwnedInputOpportunityResult } | { kind: 'unavailable'; reason: string }

/** Adapt only this recipe's IDs; unrelated saved stock/quotes cannot invalidate it. */
export function ownedOpportunity (
  recipe: OwnedInputOpportunityRecipe | undefined,
  goal: number | null,
  budget: number | null,
  ownedText: Readonly<Record<number, string>>,
  quote: (id: number) => { high: number | null; low: number | null } | null | undefined,
  tax: (price: number, id: number) => number
): State {
  if (!recipe || goal === null || budget === null) return { kind: 'unavailable', reason: 'Enter a whole batch goal and cash budget from 0 to 1,000,000,000.' }
  try {
    const inputIds = [...new Set(recipe.inputs.map(i => i.id))]
    const owned: Record<number, number> = {}
    for (const id of inputIds) {
      const quantity = parseBatchNumber(ownedText[id] ?? '0')
      if (quantity === null) return { kind: 'unavailable', reason: 'Enter whole owned units from 0 to 1,000,000,000 for each selected ingredient.' }
      owned[id] = quantity
    }
    const ids = [...new Set([...inputIds, ...recipe.outputs.map(i => i.id)])]
    const quotes = Object.fromEntries(ids.map(id => {
      const item = quote(id)
      return [id, { buy: item?.high ?? null, sell: item?.low ?? null }]
    }))
    return { kind: 'ready', result: compareOwnedInputOpportunity({ recipe, goal, budget, owned, quotes, tax }) }
  } catch (error) {
    return { kind: 'unavailable', reason: `This scenario cannot be estimated safely: ${error instanceof Error ? error.message : 'unsupported input'}. Use whole quantities and GP within supported limits.` }
  }
}
