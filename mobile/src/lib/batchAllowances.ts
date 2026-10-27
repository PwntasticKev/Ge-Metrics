/** A manual declaration for this purchase window; null means unknown, never unlimited. */
export type BatchAllowance = {
  owned: number
  remaining: number | null
  /** Verified full mapping limit, when available. This is not a remaining allowance. */
  knownFullLimit?: number | null
}
export type BatchAllowanceIngredient = {
  id: number
  qty: number
  owned: number
  remaining: number | null
  required: number
  shopping: number
  status: 'enough' | 'exceeds' | 'unknown'
  knownShortfall: number | null
  maxActions: number | null
}
export type BatchAllowanceResult = {
  ingredients: BatchAllowanceIngredient[]
  status: 'feasible' | 'blocked' | 'unknown'
  maxActions: { kind: 'exact' | 'known-upper-bound'; value: number } | { kind: 'unknown'; value: null }
}

const whole = (value: number, label: string, minimum = 0): number => {
  if (!Number.isSafeInteger(value) || value < minimum) throw new RangeError(`${label} must be a safe whole number >= ${minimum}`)
  return value
}

/**
 * Ingredient allowance feasibility only, for whole deterministic actions in the current window.
 * IDs are independent: connected limit groups, cash, fills, resets and reinvestment are not modeled.
 * Missing declarations mean zero owned and unknown remaining; owned units never consume remaining.
 * "feasible" means the goal fits declared ingredient allowances, not that purchases will fill.
 * Any unknown remaining keeps the maximum non-exact, even if owned stock covers the goal.
 * Invalid numbers and unsafe intermediate arithmetic throw RangeError rather than clamp.
 */
export function calculateBatchAllowances (
  inputs: readonly { id: number; qty: number }[],
  goal: number,
  allowances: Readonly<Partial<Record<number, BatchAllowance>>>
): BatchAllowanceResult {
  whole(goal, 'goal')
  if (!inputs.length) throw new RangeError('At least one recipe input is required')
  const grouped = new Map<number, number>()
  for (const input of inputs) {
    whole(input.id, 'input ID', 1)
    whole(input.qty, 'input quantity', 1)
    grouped.set(input.id, whole((grouped.get(input.id) ?? 0) + input.qty, 'aggregated input quantity', 1))
  }
  const ingredients: BatchAllowanceIngredient[] = [...grouped].map(([id, qty]) => {
    const declaration = allowances[id]
    const owned = whole(declaration ? declaration.owned : 0, `owned for ${id}`)
    const remaining = declaration ? declaration.remaining : null
    if (remaining !== null) whole(remaining, `remaining for ${id}`)
    const fullLimit = declaration?.knownFullLimit
    if (fullLimit !== undefined && fullLimit !== null) {
      whole(fullLimit, `full limit for ${id}`)
      if (remaining !== null && remaining > fullLimit) throw new RangeError(`remaining for ${id} exceeds verified full limit`)
    }
    const required = whole(qty * goal, `required for ${id}`)
    const shopping = Math.max(required - owned, 0)
    const maxActions = remaining === null ? null : Math.floor(whole(owned + remaining, `available units for ${id}`) / qty)
    const knownShortfall = remaining === null ? (shopping === 0 ? 0 : null) : Math.max(shopping - remaining, 0)
    const status = shopping === 0 ? 'enough' : remaining === null ? 'unknown' : shopping <= remaining ? 'enough' : 'exceeds'
    return { id, qty, owned, remaining, required, shopping, status, knownShortfall, maxActions }
  })
  const knownBounds = ingredients.flatMap(i => i.maxActions === null ? [] : [i.maxActions])
  const allKnown = knownBounds.length === ingredients.length
  const maxActions: BatchAllowanceResult['maxActions'] = !knownBounds.length
    ? { kind: 'unknown', value: null }
    : { kind: allKnown ? 'exact' : 'known-upper-bound', value: Math.min(...knownBounds) }
  const status = ingredients.some(i => i.status === 'exceeds') ? 'blocked'
    : ingredients.some(i => i.status === 'unknown') ? 'unknown' : 'feasible'
  return { ingredients, status, maxActions }
}
