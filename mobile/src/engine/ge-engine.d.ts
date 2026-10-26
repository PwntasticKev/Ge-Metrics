// Types for the shared JS flipping engine (../src/domain/flipping),
// resolved by Metro as `@ge/engine` (see metro.config.js).

declare module '@ge/engine' {
  export interface MarketItem {
    readonly id: number
    readonly name: string
    readonly icon: string | null
    readonly members: boolean
    readonly limit: number | null
    readonly highalch: number | null
    readonly high: number | null
    readonly low: number | null
    readonly highTime: number | null
    readonly lowTime: number | null
    readonly dailyVolume: number | null
  }

  export interface Market {
    readonly nowSec: number
    get(id: number): MarketItem | null
    all(): MarketItem[]
  }

  export interface WikiMappingEntry {
    id: number
    name: string
    icon?: string
    members?: boolean
    limit?: number
    highalch?: number
  }

  export interface WikiPrice {
    high: number | null
    highTime: number | null
    low: number | null
    lowTime: number | null
  }

  export type SortMetric = 'potential' | 'profit' | 'roi'

  export interface ItemFlip {
    readonly id: number
    readonly name: string
    readonly icon: string | null
    readonly members: boolean
    readonly buyAt: number
    readonly sellAt: number
    readonly tax: number
    readonly profit: number
    readonly roi: number
    readonly limit: number
    readonly limitAssumed: boolean
    readonly dailyVolume: number | null
    readonly maxQty: number | null
    readonly potential: number | null
    readonly ageSec: number | null
    readonly stale: boolean
    readonly suspicious: boolean
  }

  export interface FlipLine {
    readonly id: number
    readonly name: string
    readonly icon: string | null
    readonly qty: number
    readonly price: number
    readonly total: number
  }

  export interface SetFlip {
    readonly id: string
    readonly kind: 'ge-set' | 'combine'
    readonly setId: number
    readonly name: string
    readonly variant: string | null
    readonly icon: string | null
    readonly direction: 'combine' | 'split'
    readonly buy: readonly FlipLine[]
    readonly sell: readonly FlipLine[]
    readonly conversionCost: number
    readonly cost: number
    readonly revenue: number
    readonly tax: number
    readonly profit: number
    readonly roi: number
    readonly maxSets: number | null
    readonly potential: number | null
    readonly ageSec: number | null
    readonly stale: boolean
    readonly suspicious: boolean
  }

  export interface Recipe {
    readonly id: string
    readonly kind: 'ge-set' | 'combine'
    readonly setId: number
    readonly parts: readonly { id: number; qty: number }[]
    readonly conversionCost: number
    readonly reversible: boolean
    readonly variant?: string
  }

  export interface RankOptions {
    minProfit?: number
    sortBy?: SortMetric
    includeSuspicious?: boolean
    staleAfterSec?: number
  }

  export interface LegacyRecipe {
    name: string
    itemSet: number
    itemsToCreateSet: number[]
    qty?: { id: number; qty: number }
    conversionCost?: number
  }

  export interface ProcessRecipe {
    id: string
    method: string
    name?: string
    inputs: { id: number; qty: number }[]
    outputs: { id: number; qty: number }[]
    coinCost?: number
    coinRevenue?: number
    actionsPerHour?: number | null
    skill?: string | null
    members?: boolean
    location?: string | null
    source?: string
  }

  export interface ProcessFlip {
    readonly id: string
    readonly method: string
    readonly name: string
    readonly icon: string | null
    readonly buy: readonly FlipLine[]
    readonly sell: readonly FlipLine[]
    readonly coinCost: number
    readonly coinRevenue: number
    readonly cost: number
    readonly revenue: number
    readonly tax: number
    readonly profit: number
    readonly roi: number
    readonly maxActions: number | null
    readonly potential: number | null
    readonly perHour: number | null
    readonly ageSec: number | null
    readonly stale: boolean
    readonly suspicious: boolean
  }

  export function computeProcessFlip (recipe: ProcessRecipe, market: Market, options?: { staleAfterSec?: number; actionsPerHour?: number | null }): ProcessFlip | null
  export function rankProcessFlips (recipes: readonly ProcessRecipe[], market: Market, options?: Omit<RankOptions, 'sortBy'> & { sortBy?: SortMetric | 'perHour' }): ProcessFlip[]
  export function decantingRecipes (items: readonly MarketItem[]): ProcessRecipe[]
  export function herbCleaningRecipes (items: readonly MarketItem[]): ProcessRecipe[]
  export function unfinishedPotionRecipes (items: readonly MarketItem[]): ProcessRecipe[]
  export const moneyMakingRecipes: ProcessRecipe[]
  export interface ProcessingMethod {
    key: string
    title: string
    description: string
    requirements: string | null
    actionsPerHour: number | null
    source: string
    recipes: ProcessRecipe[]
  }
  export const processingMethods: ProcessingMethod[]
  export function withBudget<T extends { profit: number; potential: number | null }> (flips: T[], budget: number | null, sortBy?: string): T[]

  export function geTax (sellPrice: number, itemId?: number): number
  export function createMarketFromWiki (
    data: { mapping: WikiMappingEntry[]; latest: Record<string, WikiPrice>; volumes?: Record<string, number> },
    options?: { nowSec?: number }
  ): Market
  export function computeItemFlip (item: MarketItem, options?: { nowSec?: number; staleAfterSec?: number }): ItemFlip | null
  export function rankItemFlips (market: Market, options?: RankOptions): ItemFlip[]
  export function computeSetFlip (recipe: Recipe, market: Market, options?: { staleAfterSec?: number }): SetFlip | null
  export function rankSetFlips (recipes: readonly Recipe[], market: Market, options?: RankOptions): SetFlip[]
  export function buildRecipes (legacyRecipes?: LegacyRecipe[]): Recipe[]
  export const craftedRecipes: LegacyRecipe[]

  export interface WikiAverage {
    avgHighPrice: number | null
    highPriceVolume: number
    avgLowPrice: number | null
    lowPriceVolume: number
  }

  export interface PickOptions {
    h1?: Record<string, WikiAverage>
    h24?: Record<string, WikiAverage>
    budget?: number | null
  }

  export interface BuyPick {
    readonly id: number
    readonly name: string
    readonly icon: string | null
    readonly members: boolean
    readonly buyAt: number
    readonly sellAt: number
    readonly tax: number
    /** Margin per item after tax; for quick flips the smaller of live and last-hour margin. */
    readonly profit: number
    readonly roi: number
    readonly maxQty: number
    readonly potential: number
    readonly cost: number
    /** Trades per day on the thinner side (buys or sells). */
    readonly dayVolume: number
    /** Quick flips: margin at live prices, before the last-hour check. */
    readonly liveProfit?: number
    /** Overnight flips: last hour's price vs the day's average. */
    readonly trend?: number
  }

  export function rankQuickFlips (market: Market, options?: PickOptions): BuyPick[]
  export function rankOvernightFlips (market: Market, options?: PickOptions & { hours?: number }): BuyPick[]
}
