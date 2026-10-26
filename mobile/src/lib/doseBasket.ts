/** Pure ordinary-vial planning. GP inputs must be nonnegative safe integers; null means unknown.
 * Unsafe monetary inputs, aggregates, or injected tax results throw RangeError. Inject the shared engine's geTax. */
export interface DoseQuote { id: number; buy: number | null; sell: number | null; buyCap?: number | null; sellCap?: number | null }
export interface DoseBasketRequest {
  family: { ordinaryVial: boolean; limitGroup: string; remainingAllowance: number | null; vialId: number; items: { id: number; dose: number }[] }
  targetDose: number
  cash: number
  quotes: DoseQuote[]
  vial: { buy: number | null; sell: number | null; buyCap?: number | null; sellCap?: number | null; provenance: string }
  owned?: { id: number; quantity: number; netLiquidation: number | null }[]
  ownedVials?: { quantity: number; netLiquidation: number | null }
  snapshot: string
  scenario: string
  tax: (price: number, id: number) => number
}
export interface DoseBasketPlan {
  kind: 'conversion' | 'zero-action'
  purchases: { id: number; quantity: number }[]
  sales: { id: number; quantity: number }[]
  inputDoses: number; inputContainers: number; outputContainers: number
  targetQuantity: number; remainderDose: number; extraVials: number; releasedVials: number
  suppliedVials: number; purchasedVials: number; soldVials: number
  cashOutlay: number | null; netRevenue: number | null; ownedOpportunityCost: number | null
  cashSurplus: number | null; economicGain: number | null
  missingInputs: string[]; violations: string[]; assumptions: string[]
  status: 'feasible' | 'incomplete' | 'infeasible' | 'unsupported'
}
const whole = (n: number): boolean => Number.isSafeInteger(n) && n >= 0
const valued = (n: number | null | undefined): n is number => n != null && whole(n)
const assumptions = (r: DoseBasketRequest) => [r.snapshot, r.scenario, r.vial.provenance, 'All declared sales fill; no reinvestment; all opted-in stock and outputs sold; caps are planning assumptions.']
const safeMoney = (n: number): number => {
  if (!Number.isSafeInteger(n)) throw new RangeError('Unsafe monetary aggregate')
  return n
}
const unsupportedReasons = (r: DoseBasketRequest): string[] => [
  ...(!r.family.ordinaryVial ? ['unsupported family'] : []),
  ...(r.owned ?? []).filter(p => p.quantity > 0 && !r.family.items.some(i => i.id === p.id)).map(p => `unsupported owned:${p.id}`),
].sort()
function validate (r: DoseBasketRequest) {
  const money = [r.cash, ...r.quotes.flatMap(q => [q.buy, q.sell]), r.vial.buy, r.vial.sell,
    ...(r.owned ?? []).map(p => p.netLiquidation), r.ownedVials?.netLiquidation]
  if (money.some(n => n != null && !valued(n))) throw new RangeError('GP values must be nonnegative safe integers')
  if (!valued(r.cash) || !whole(r.targetDose) || r.targetDose < 1 || r.targetDose > 4 ||
    r.family.items.some(i => !whole(i.id) || !whole(i.dose) || i.dose < 1 || i.dose > 4) ||
    new Set(r.family.items.map(i => i.id)).size !== r.family.items.length ||
    new Set(r.family.items.map(i => i.dose)).size !== r.family.items.length ||
    r.family.items.some(i => i.id === r.family.vialId) ||
    new Set(r.quotes.map(q => q.id)).size !== r.quotes.length ||
    new Set((r.owned ?? []).map(q => q.id)).size !== (r.owned ?? []).length ||
    (r.owned ?? []).some(i => !whole(i.quantity)) || !whole(r.ownedVials?.quantity ?? 0)) throw new RangeError('Invalid dose basket quantities or duplicate item IDs')
}
export function evaluateDoseBasket (r: DoseBasketRequest, quantities: Readonly<Record<number, number>>): DoseBasketPlan {
  validate(r)
  const missingInputs: string[] = []; const violations: string[] = []
  const missing = (s: string) => { if (!missingInputs.includes(s)) missingInputs.push(s) }
  const price = (n: number | null | undefined, label: string) => { if (!valued(n)) { missing(label); return 0 }; return n }
  const cap = (n: number | null | undefined, quantity: number, label: string) => {
    if (quantity === 0) return
    if (n == null || !whole(n)) missing(label)
    else if (quantity > n) violations.push(label)
  }
  const purchases = Object.entries(quantities).map(([id, quantity]) => ({ id: Number(id), quantity })).filter(p => p.quantity !== 0).sort((a, b) => a.id - b.id)
  if (purchases.some(p => !whole(p.quantity))) throw new RangeError('Expected nonnegative integer purchases')
  if (purchases.length > 2) violations.push('at most two purchased source doses')
  let inputDoses = 0; let inputContainers = 0; let cashOutlay = 0; let ownedOpportunityCost = 0
  for (const p of purchases) {
    const item = r.family.items.find(i => i.id === p.id)
    if (!item) { violations.push(`unsupported input:${p.id}`); continue }
    inputDoses += item.dose * p.quantity; inputContainers += p.quantity
    const q = r.quotes.find(q => q.id === p.id)
    cashOutlay = safeMoney(cashOutlay + safeMoney(price(q?.buy, `buy:${p.id}`) * p.quantity))
    cap(q?.buyCap, p.quantity, `buy cap:${p.id}`)
  }
  for (const p of r.owned ?? []) if (p.quantity) {
    const item = r.family.items.find(i => i.id === p.id)
    if (!item) { violations.push(`unsupported owned:${p.id}`); continue }
    inputDoses += item.dose * p.quantity; inputContainers += p.quantity
    ownedOpportunityCost = safeMoney(ownedOpportunityCost + safeMoney(price(p.netLiquidation, `owned liquidation:${p.id}`) * p.quantity))
  }
  const ownedVials = r.ownedVials?.quantity ?? 0
  if (ownedVials) ownedOpportunityCost = safeMoney(ownedOpportunityCost + safeMoney(price(r.ownedVials?.netLiquidation, 'owned vial liquidation') * ownedVials))
  if (![inputDoses, inputContainers].every(whole)) throw new RangeError('Unsafe dose totals')
  cap(r.family.remainingAllowance, purchases.reduce((s, p) => s + p.quantity, 0), 'family allowance')
  if (!r.family.limitGroup) missing('verified shared limit group')
  const targetQuantity = Math.floor(inputDoses / r.targetDose); const remainderDose = inputDoses % r.targetDose
  const outputContainers = targetQuantity + Number(remainderDose > 0)
  const extraVials = Math.max(0, outputContainers - inputContainers); const releasedVials = Math.max(0, inputContainers - outputContainers)
  const suppliedVials = Math.min(ownedVials, extraVials); const purchasedVials = extraVials - suppliedVials
  const soldVials = ownedVials - suppliedVials + releasedVials
  if (purchasedVials) cashOutlay = safeMoney(cashOutlay + safeMoney(price(r.vial.buy, 'vial buy') * purchasedVials))
  cap(r.vial.buyCap, purchasedVials, 'vial buy cap')
  const salesMap = new Map<number, number>()
  const addDose = (dose: number, quantity: number) => {
    if (!quantity) return
    const item = r.family.items.find(i => i.dose === dose)
    if (!item) { missing(`output item for dose:${dose}`); return }
    salesMap.set(item.id, (salesMap.get(item.id) ?? 0) + quantity)
  }
  addDose(r.targetDose, targetQuantity); addDose(remainderDose, Number(remainderDose > 0))
  if (soldVials) salesMap.set(r.family.vialId, soldVials)
  const sales = [...salesMap].map(([id, quantity]) => ({ id, quantity })).sort((a, b) => a.id - b.id)
  let netRevenue = 0
  for (const s of sales) {
    const vial = s.id === r.family.vialId; const q = r.quotes.find(q => q.id === s.id)
    const sell = price(vial ? r.vial.sell : q?.sell, `sell:${s.id}`)
    cap(vial ? r.vial.sellCap : q?.sellCap, s.quantity, `sell cap:${s.id}`)
    const tax = r.tax(sell, s.id)
    if (!whole(tax) || tax > sell) throw new RangeError('Tax must be safe whole GP between zero and sale price')
    netRevenue = safeMoney(netRevenue + safeMoney((sell - tax) * s.quantity))
  }
  if (cashOutlay > r.cash) violations.push('cash')
  const unsupported = unsupportedReasons(r).length > 0
  const cashSurplus = safeMoney(netRevenue - cashOutlay)
  const economicGain = safeMoney(cashSurplus - ownedOpportunityCost)
  const incomplete = missingInputs.length > 0
  return { kind: 'conversion', purchases, sales, inputDoses, inputContainers, outputContainers, targetQuantity, remainderDose,
    extraVials, releasedVials, suppliedVials, purchasedVials, soldVials,
    cashOutlay: incomplete ? null : cashOutlay, netRevenue: incomplete ? null : netRevenue, ownedOpportunityCost: incomplete ? null : ownedOpportunityCost,
    cashSurplus: incomplete ? null : cashSurplus, economicGain: incomplete ? null : economicGain,
    missingInputs, violations, assumptions: assumptions(r), status: unsupported ? 'unsupported' : violations.length ? 'infeasible' : incomplete ? 'incomplete' : 'feasible' }
}
function zero (r: DoseBasketRequest): DoseBasketPlan {
  return { kind: 'zero-action', purchases: [], sales: [], inputDoses: 0, inputContainers: 0, outputContainers: 0, targetQuantity: 0, remainderDose: 0, extraVials: 0, releasedVials: 0, suppliedVials: 0, purchasedVials: 0, soldVials: 0, cashOutlay: 0, netRevenue: 0, ownedOpportunityCost: 0, cashSurplus: 0, economicGain: 0, missingInputs: [], violations: [], assumptions: [...assumptions(r), 'Zero action retains all owned inventory unchanged.'], status: 'feasible' }
}
function better (a: DoseBasketPlan, b: DoseBasketPlan): boolean {
  if (a.economicGain !== b.economicGain) return a.economicGain! > b.economicGain!
  if (a.cashOutlay !== b.cashOutlay) return a.cashOutlay! < b.cashOutlay!
  const count = (p: DoseBasketPlan) => p.purchases.reduce((s, q) => s + q.quantity, 0)
  if (count(a) !== count(b)) return count(a) < count(b)
  const ids = [...new Set([...a.purchases, ...b.purchases].map(p => p.id))].sort((x, y) => x - y)
  for (const id of ids) {
    const x = a.purchases.find(p => p.id === id)?.quantity ?? 0; const y = b.purchases.find(p => p.id === id)?.quantity ?? 0
    if (x !== y) return x < y
  }
  return false
}
/** Exhaustive only within reported bounds. Hard ceilings keep synchronous mobile work bounded. */
export function optimizeDoseBasket (r: DoseBasketRequest, options: { maxQuantity?: number; maxCandidates?: number } = {}) {
  validate(r)
  const maxQuantity = options.maxQuantity ?? 100; const maxCandidates = options.maxCandidates ?? 20000
  if (!whole(maxQuantity) || maxQuantity > 1000 || !whole(maxCandidates) || maxCandidates < 1 || maxCandidates > 100000) throw new RangeError('Search bounds exceed hard ceilings (1000 quantity / 100000 candidates)')
  let best = zero(r); let bestSingle = best; let evaluated = 0; let bounded = false
  const missingInputs = new Set<string>(); const unsupported = unsupportedReasons(r)
  const sources = [...r.family.items].sort((a, b) => a.id - b.id).map(i => {
    const q = r.quotes.find(q => q.id === i.id)
    const caps = [q?.buyCap, r.family.remainingAllowance]
    for (const c of caps) if (c == null || !whole(c)) missingInputs.add(c === q?.buyCap ? `buy cap:${i.id}` : 'family allowance')
    if (q?.buyCap !== 0 && r.family.remainingAllowance !== 0 && !valued(q?.buy)) missingInputs.add(`buy:${i.id}`)
    const natural = Math.min(...caps.map(c => c != null && whole(c) ? c : Infinity), valued(q?.buy) && q.buy > 0 ? Math.floor(r.cash / q.buy) : Infinity)
    if (natural > maxQuantity) bounded = true
    return { id: i.id, max: Math.min(natural, maxQuantity) }
  })
  const visit = (quantities: Record<number, number>) => {
    if (evaluated >= maxCandidates) { bounded = true; return false }
    evaluated++
    const p = evaluateDoseBasket(r, quantities)
    p.missingInputs.forEach(v => missingInputs.add(v))
    if (p.status === 'feasible') {
      if (better(p, best)) best = p
      if (p.purchases.length <= 1 && better(p, bestSingle)) bestSingle = p
    }
    return true
  }
  visit({})
  // Singles first so a capped pair search cannot crowd out the baseline.
  outer: for (const a of sources) for (let x = 1; x <= a.max; x++) if (!visit({ [a.id]: x })) break outer
  pairs: for (let i = 0; i < sources.length; i++) for (let j = i + 1; j < sources.length; j++) {
    const a = sources[i]; const b = sources[j]
    for (let x = 1; x <= a.max; x++) for (let y = 1; y <= b.max; y++) {
      if (r.family.remainingAllowance != null && x + y > r.family.remainingAllowance) continue
      if (!visit({ [a.id]: x, [b.id]: y })) break pairs
    }
  }
  return { best, bestSingle, uplift: safeMoney(best.economicGain! - bestSingle.economicGain!),
    status: unsupported.length ? 'unsupported' as const : missingInputs.size ? 'incomplete' as const : 'supported' as const, unsupportedReasons: unsupported, missingInputs: [...missingInputs].sort(),
    assumptions: assumptions(r), coverage: { status: missingInputs.size || unsupported.length ? 'incomplete' as const : bounded ? 'bounded' as const : 'complete' as const,
      evaluated, maxQuantity, maxCandidates, sourceBounds: sources, description: 'Best among evaluated candidates; complete means exhaustive declared feasible quantity domain, not guaranteed execution.' } }
}
