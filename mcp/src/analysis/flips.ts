// Ranked opportunities from the shared flipping engine, trimmed for agents.

import {
  type ItemFlip,
  type Market,
  type ProcessFlip,
  type ProcessRecipe,
  type SetFlip,
  buildRecipes,
  craftedRecipes,
  decantingRecipes,
  herbCleaningRecipes,
  processingMethods,
  rankItemFlips,
  rankProcessFlips,
  rankSetFlips,
  unfinishedPotionRecipes,
  withBudget
} from '@ge/engine'
import { pct, round } from './format.js'

export type FlipSort = 'profit' | 'roi' | 'profit_per_limit'
export type ProcessSort = FlipSort | 'per_hour'

const ENGINE_SORT = { profit: 'profit', roi: 'roi', profit_per_limit: 'potential', per_hour: 'perHour' } as const

const ageMin = (ageSec: number | null) => (ageSec === null ? null : round(ageSec / 60, 1))
const budgeted = <T extends { profit: number; potential: number | null }>(flips: T[], budget: number | undefined, sort: string) =>
  budget ? withBudget(flips, budget, sort) : flips

export interface TopFlipsOptions {
  readonly minVolume: number
  readonly maxPrice?: number
  readonly budget?: number
  readonly sort: FlipSort
  readonly limit: number
  readonly includeMembers: boolean
  readonly includeStale: boolean
}

export function topFlips (market: Market, o: TopFlipsOptions) {
  const sortBy = ENGINE_SORT[o.sort]
  const candidates = rankItemFlips(market, { sortBy }).filter((f: ItemFlip) =>
    (o.minVolume <= 0 || (f.dailyVolume ?? 0) >= o.minVolume) &&
    (o.maxPrice === undefined || f.buyAt <= o.maxPrice) &&
    (o.includeMembers || !f.members) &&
    (o.includeStale || !f.stale))
  return budgeted(candidates, o.budget, sortBy).slice(0, o.limit).map(f => ({
    id: f.id,
    name: f.name,
    buyAt: f.buyAt,
    sellAt: f.sellAt,
    tax: f.tax,
    marginAfterTax: f.profit,
    roiPct: pct(f.roi),
    limit: f.limit,
    limitAssumed: f.limitAssumed,
    dailyVolume: f.dailyVolume,
    qtyPer4h: f.maxQty,
    profitPer4h: f.potential,
    priceAgeMin: ageMin(f.ageSec)
  }))
}

const lines = (ls: SetFlip['buy']) => ls.map(l => ({ id: l.id, name: l.name, qty: l.qty, price: l.price }))

export interface RankOptions {
  readonly sort: FlipSort
  readonly limit: number
  readonly budget?: number
  readonly includeStale: boolean
}

export function setArbitrage (market: Market, o: RankOptions) {
  const sortBy = ENGINE_SORT[o.sort]
  const flips = rankSetFlips(buildRecipes(craftedRecipes), market, { sortBy }).filter(f => o.includeStale || !f.stale)
  return budgeted(flips, o.budget, sortBy).slice(0, o.limit).map(f => ({
    name: f.variant ? `${f.name} (${f.variant})` : f.name,
    setId: f.setId,
    kind: f.kind === 'ge-set' ? 'GE item set (exchange free at GE clerk)' : 'crafted combination',
    direction: f.direction,
    buy: lines(f.buy),
    sell: lines(f.sell),
    conversionCost: f.conversionCost,
    cost: f.cost,
    revenue: f.revenue,
    tax: f.tax,
    profit: f.profit,
    roiPct: pct(f.roi),
    setsPer4h: f.maxSets,
    profitPer4h: f.potential,
    priceAgeMin: ageMin(f.ageSec)
  }))
}

interface MethodInfo { readonly key: string; readonly title: string; readonly requirements: string | null; readonly source: string | null }

const DERIVED_METHODS: readonly (MethodInfo & { readonly build: (market: Market) => ProcessRecipe[] })[] = [
  { key: 'decanting', title: 'Decanting (Bob Barter, free)', requirements: null, source: 'https://oldschool.runescape.wiki/w/Bob_Barter_(herbs)', build: m => decantingRecipes(m.all()) },
  { key: 'herb-cleaning', title: 'Cleaning grimy herbs', requirements: 'Herblore level of the herb', source: 'https://oldschool.runescape.wiki/w/Herb', build: m => herbCleaningRecipes(m.all()) },
  { key: 'unfinished-potions', title: 'Unfinished potions (herb + vial of water)', requirements: 'Herblore level of the herb', source: 'https://oldschool.runescape.wiki/w/Unfinished_potion', build: m => unfinishedPotionRecipes(m.all()) }
]

export const PROCESSING_METHOD_KEYS: readonly string[] = [...processingMethods.map(m => m.key), ...DERIVED_METHODS.map(m => m.key)]

const methodInfo = new Map<string, MethodInfo>([
  ...processingMethods.map(m => [m.key, { key: m.key, title: m.title, requirements: m.requirements, source: m.source }] as const),
  ...DERIVED_METHODS.map(m => [m.key, m] as const)
])

function processingRecipes (market: Market, method: string | undefined): ProcessRecipe[] {
  const curated = processingMethods
    .filter(m => !method || m.key === method)
    .flatMap(m => m.recipes.map(r => ({ ...r, method: m.key, actionsPerHour: m.actionsPerHour })))
  const derived = DERIVED_METHODS.filter(m => !method || m.key === method).flatMap(m => m.build(market))
  return [...curated, ...derived]
}

export function processing (market: Market, o: Omit<RankOptions, 'sort'> & { readonly method?: string; readonly sort: ProcessSort }) {
  const sortBy = ENGINE_SORT[o.sort]
  const flips = rankProcessFlips(processingRecipes(market, o.method), market, { sortBy }).filter((f: ProcessFlip) => o.includeStale || !f.stale)
  return budgeted(flips, o.budget, sortBy).slice(0, o.limit).map(f => {
    const info = methodInfo.get(f.method)
    return {
      name: f.name,
      method: f.method,
      methodTitle: info?.title ?? f.method,
      requirements: info?.requirements ?? null,
      buy: lines(f.buy),
      sell: lines(f.sell),
      coinCost: f.coinCost,
      costPerAction: round(f.cost),
      profitPerAction: round(f.profit),
      roiPct: pct(f.roi),
      actionsPer4h: f.maxActions,
      profitPer4h: f.potential === null ? null : Math.round(f.potential),
      profitPerHour: f.perHour === null ? null : Math.round(f.perHour),
      priceAgeMin: ageMin(f.ageSec),
      source: info?.source ?? null
    }
  })
}
