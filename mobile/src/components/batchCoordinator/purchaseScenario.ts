import type { OwnedInputOpportunityRecipe } from '../../lib/ownedInputOpportunity.ts'
import { ownedOpportunity, parseBatchNumber } from './ownedOpportunity.ts'

export interface PurchaseLeg {
  id: number
  raw: string
  shopping: number | null
  observed: number | null
  price: number | null
  source: 'observed' | 'manual' | 'unknown' | 'invalid'
}
const observedQuote = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null

/** Screen-local assumptions: raw market data and every sell-side quote stay untouched. */
export function purchaseScenario (
  recipe: OwnedInputOpportunityRecipe | undefined,
  goal: number | null,
  budget: number | null,
  ownedText: Readonly<Record<number, string>>,
  purchaseText: Readonly<Record<number, string>>,
  quote: (id: number) => { high: number | null; low: number | null } | null | undefined,
  tax: (price: number, id: number) => number
) {
  const legs: PurchaseLeg[] = []
  try {
    const inputIds = [...new Set(recipe?.inputs.map(i => i.id) ?? [])]
    const ids = [...new Set([...inputIds, ...(recipe?.outputs.map(i => i.id) ?? [])])]
    const observed = new Map(ids.map(id => {
      const item = quote(id)
      return [id, { high: observedQuote(item?.high), low: observedQuote(item?.low) }] as const
    }))
    for (const id of inputIds) {
      const raw = purchaseText[id] ?? ''
      const inherited = observed.get(id)?.high ?? null
      const manual = parseBatchNumber(raw)
      const source = raw.trim() === '' ? (inherited === null ? 'unknown' : 'observed') : manual !== null && manual > 0 ? 'manual' : 'invalid'
      const quantity = recipe!.inputs.filter(i => i.id === id).reduce((sum, i) => sum + i.qty, 0)
      const owned = parseBatchNumber(ownedText[id] ?? '0')
      const required = goal === null ? null : quantity * goal
      const shopping = required !== null && Number.isSafeInteger(required) && owned !== null ? Math.max(0, required - owned) : null
      legs.push({ id, raw, shopping, observed: inherited, price: source === 'manual' ? manual : source === 'observed' ? inherited : null, source })
    }
    const purchases = new Map(legs.map(leg => [leg.id, leg.price]))
    const comparison = ownedOpportunity(recipe, goal, budget, ownedText, id => ({
      high: purchases.has(id) ? purchases.get(id)! : observed.get(id)?.high ?? null,
      low: observed.get(id)?.low ?? null
    }), tax)
    return { legs, comparison }
  } catch (error) {
    return { legs, comparison: { kind: 'unavailable' as const, reason: `Custom scenario unavailable: ${error instanceof Error ? error.message : 'unsupported input'}` } }
  }
}
