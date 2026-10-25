import { useMemo } from 'react'
import { decantingRecipes, moneyMakingRecipes, processingMethods, rankProcessFlips, type Market, type ProcessFlip, type ProcessRecipe } from '@ge/engine'
import { useSettings } from '../state/settings'

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
  [MONEY_MAKERS, DECANTING, ...PROCESSING].map(m => [m.key, m])
)
export const PROCESSING_METHODS = PROCESSING

const recipeById = new Map<string, ProcessRecipe>(
  [...moneyMakingRecipes, ...PROCESSING_RECIPES.flat()].map(r => [r.id, r])
)
export const recipeMeta = (id: string): ProcessRecipe | undefined => recipeById.get(id)

const MAX_ROWS = 200

export function useRankedProcess (market: Market | null, method: MethodDef, sortBy: ProcessSort, query: string): { flips: ProcessFlip[]; total: number } {
  const { settings } = useSettings()
  return useMemo(() => {
    if (!market) return { flips: [], total: 0 }
    const q = query.trim().toLowerCase()
    const all = rankProcessFlips(method.recipes(market), market, { sortBy, includeSuspicious: !settings.hideFlukes })
      .filter(f => !settings.hideStale || !f.stale)
      .filter(f => settings.membersItems || recipeMeta(f.id)?.members !== true)
      .filter(f => !q || f.name.toLowerCase().includes(q))
    return { flips: all.slice(0, MAX_ROWS), total: all.length }
  }, [market, method, sortBy, query, settings.hideFlukes, settings.hideStale, settings.membersItems])
}
