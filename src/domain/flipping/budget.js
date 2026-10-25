// Caps a flip to what a cash stack can buy in one 4-hour window.
// Works for item, set and processing flips: each knows its cost per unit
// (buyAt or cost) and its quantity field (maxQty, maxSets or maxActions).

const QTY_FIELDS = ['maxQty', 'maxSets', 'maxActions']

export function applyBudget (flip, budget) {
  if (!flip || !Number.isFinite(budget) || budget <= 0) return flip
  const unitCost = flip.buyAt ?? flip.cost
  if (!Number.isFinite(unitCost) || unitCost <= 0) return flip
  const field = QTY_FIELDS.find(f => f in flip)
  if (!field) return flip
  const affordable = Math.floor(budget / unitCost)
  const qty = flip[field] === null ? affordable : Math.min(flip[field], affordable)
  // GP/hour can't exceed what the capped 4h quantity allows either.
  const perHour = 'perHour' in flip && flip.perHour !== null ? Math.min(flip.perHour, flip.profit * qty / 4) : flip.perHour
  return Object.freeze({ ...flip, [field]: qty, potential: flip.profit * qty, perHour, affordable: qty > 0 })
}

// Ranked list helper: cap every flip, drop the unaffordable, re-sort.
export function withBudget (flips, budget, sortBy = 'potential') {
  if (!Number.isFinite(budget) || budget <= 0) return flips
  return flips
    .map(f => applyBudget(f, budget))
    .filter(f => f.affordable)
    .sort((a, b) => (b[sortBy] ?? -Infinity) - (a[sortBy] ?? -Infinity))
}
