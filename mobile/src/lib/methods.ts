import { useMemo } from 'react'
import { decantingRecipes, moneyMakingRecipes, potionRecipes, processingMethods, rankProcessFlips, withBudget, type Market, type ProcessFlip, type ProcessRecipe } from '@ge/engine'
import { useSettings, type Settings } from '../state/settings'

export type ProcessSort = 'perHour' | 'potential' | 'profit' | 'roi'

export interface MethodDef {
  key: string
  title: string
  blurb: string
  requirements?: string | null
  source?: string
  group: 'live' | 'processing'
  sorts: readonly { value: ProcessSort; label: string }[]
  defaultSort: ProcessSort
  recipes: (market: Market) => readonly ProcessRecipe[]
}

const MONEY_MAKERS: MethodDef = {
  key: 'money-makers',
  group: 'live',
  title: 'Money makers',
  blurb: `${moneyMakingRecipes.length} OSRS Wiki guides where you buy on the GE and sell on the GE, priced live.`,
  sorts: [
    { value: 'perHour', label: 'GP/hour' },
    { value: 'profit', label: 'Each' },
    { value: 'potential', label: '4h profit' }
  ],
  defaultSort: 'perHour',
  recipes: () => moneyMakingRecipes
}

// Decanting recipes depend only on item names, so build them once per market.
let decantCache: { market: Market; recipes: ProcessRecipe[] } | null = null
const DECANTING: MethodDef = {
  key: 'decanting',
  group: 'live',
  title: 'Decanting',
  blurb: 'Bob Barter at the GE repours potions into any dose size for free. Every potion, every dose pair.',
  sorts: [
    { value: 'potential', label: '4h profit' },
    { value: 'profit', label: 'Each' },
    { value: 'roi', label: 'ROI' }
  ],
  defaultSort: 'potential',
  recipes: market => {
    if (decantCache?.market !== market) decantCache = { market, recipes: decantingRecipes(market.all()) }
    return decantCache.recipes
  }
}

// Finished potions from the wiki's Herblore recipes, ~2,500 an hour.
const POTION_RECIPES: ProcessRecipe[] = potionRecipes()
const POTIONS: MethodDef = {
  key: 'potions',
  group: 'live',
  title: 'Making potions',
  blurb: 'Unfinished potion + secondary into a finished potion, plus barbarian mixes and extended/divine upgrades. About 2,500 potions an hour.',
  sorts: [
    { value: 'perHour', label: 'GP/hour' },
    { value: 'profit', label: 'Each' },
    { value: 'potential', label: '4h profit' }
  ],
  defaultSort: 'perHour',
  recipes: () => POTION_RECIPES
}

const PER_HOUR_SORTS = [
  { value: 'perHour', label: 'GP/hour' },
  { value: 'profit', label: 'Each' },
  { value: 'potential', label: '4h profit' }
] as const
const PER_4H_SORTS = [
  { value: 'potential', label: '4h profit' },
  { value: 'profit', label: 'Each' },
  { value: 'roi', label: 'ROI' }
] as const

// Curated wiki processing methods (sawmill, spells, tanning, ...). Actions per
// hour come from the wiki where it states them.
const PROCESSING_RECIPES: ProcessRecipe[][] = processingMethods.map(m =>
  m.recipes.map(r => ({ ...r, actionsPerHour: m.actionsPerHour, source: m.source }))
)

const PROCESSING: MethodDef[] = processingMethods.map((m, i) => ({
  key: m.key,
  group: 'processing',
  title: m.title,
  blurb: m.description,
  requirements: m.requirements,
  source: m.source,
  sorts: m.actionsPerHour ? PER_HOUR_SORTS : PER_4H_SORTS,
  defaultSort: m.actionsPerHour ? 'perHour' : 'potential',
  recipes: () => PROCESSING_RECIPES[i]
}))

export const METHODS: Record<string, MethodDef> = Object.fromEntries(
  [MONEY_MAKERS, POTIONS, DECANTING, ...PROCESSING].map(m => [m.key, m])
)
export const PROCESSING_METHODS = PROCESSING

const recipeById = new Map<string, ProcessRecipe>(
  [...moneyMakingRecipes, ...POTION_RECIPES, ...PROCESSING_RECIPES.flat()].map(r => [r.id, r])
)
export const recipeMeta = (id: string): ProcessRecipe | undefined => recipeById.get(id)

// Finds any processing recipe by id, including decanting recipes that are
// generated from the current item list.
export function findProcessRecipe (id: string, market: Market): ProcessRecipe | undefined {
  return recipeById.get(id) ?? (id.startsWith('decant:') ? DECANTING.recipes(market).find(r => r.id === id) : undefined)
}

const MAX_ROWS = 200

// One ranking used by both the method lists and the Tools hub, so the hub's
// "best now" always matches the top of the list.
export function rankMethod (market: Market, method: MethodDef, sortBy: ProcessSort, settings: Settings, query = ''): ProcessFlip[] {
  const q = query.trim().toLowerCase()
  return withBudget(rankProcessFlips(method.recipes(market), market, { sortBy, includeSuspicious: !settings.hideFlukes }), settings.budget, sortBy)
    .filter(f => !settings.hideStale || !f.stale)
    .filter(f => settings.membersItems || recipeMeta(f.id)?.members !== true)
    .filter(f => !q || f.name.toLowerCase().includes(q))
}

export function useRankedProcess (market: Market | null, method: MethodDef, sortBy: ProcessSort, query: string): { flips: ProcessFlip[]; total: number } {
  const { settings } = useSettings()
  return useMemo(() => {
    if (!market) return { flips: [], total: 0 }
    const all = rankMethod(market, method, sortBy, settings, query)
    return { flips: all.slice(0, MAX_ROWS), total: all.length }
  }, [market, method, sortBy, query, settings])
}
