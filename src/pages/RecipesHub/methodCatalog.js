// Wiki recipe methods for the web Recipes page. Same catalog as the mobile app
// (mobile/src/lib/methods.ts): money makers, derived potion/herb recipes and
// the curated wiki processing methods, all priced live by the flipping engine.

import {
  decantingRecipes,
  herbCleaningRecipes,
  highAlchRecipes,
  moneyMakingRecipes,
  processingMethods,
  rankProcessFlips,
  unfinishedPotionRecipes
} from '../../domain/flipping/index.js'

export const SORTS = Object.freeze({
  perHour: { value: 'perHour', label: 'GP/hour' },
  profit: { value: 'profit', label: 'Profit each' },
  potential: { value: 'potential', label: '4h profit' },
  roi: { value: 'roi', label: 'ROI' }
})

const PER_HOUR_SORTS = [SORTS.perHour, SORTS.profit, SORTS.potential]
const PER_4H_SORTS = [SORTS.potential, SORTS.profit, SORTS.roi]

// Derived recipes depend only on item names, so build them once per market.
const perMarket = build => {
  let last = { market: null, recipes: [] }
  return market => {
    if (last.market !== market) last = { market, recipes: build(market.all()) }
    return last.recipes
  }
}

const LIVE_METHODS = [
  {
    key: 'high-alchemy',
    group: 'Magic',
    title: 'High alchemy',
    blurb: 'Buy an item instantly, cast High Level Alchemy (1 nature rune), keep the coins. No GE tax. Capped at 1,200 casts an hour.',
    sorts: PER_HOUR_SORTS,
    defaultSort: 'perHour',
    // Alching is done in bulk right away: price inputs at the instant-buy price.
    buyQuote: 'high',
    recipes: perMarket(highAlchRecipes)
  },
  {
    key: 'money-makers',
    group: 'Money making',
    title: 'Money makers',
    blurb: `${moneyMakingRecipes.length} OSRS Wiki money making guides where you buy on the GE and sell on the GE, priced live.`,
    sorts: PER_HOUR_SORTS,
    defaultSort: 'perHour',
    recipes: () => moneyMakingRecipes
  },
  {
    key: 'decanting',
    group: 'Herblore',
    title: 'Decanting',
    blurb: 'Bob Barter at the GE repours potions into any dose size for free. Every potion, every dose pair.',
    sorts: PER_4H_SORTS,
    defaultSort: 'potential',
    recipes: perMarket(decantingRecipes)
  },
  {
    key: 'unfinished-potions',
    group: 'Herblore',
    title: 'Unfinished potions',
    blurb: 'Clean herb + vial of water into an unfinished potion.',
    sorts: PER_4H_SORTS,
    defaultSort: 'potential',
    recipes: perMarket(unfinishedPotionRecipes)
  },
  {
    key: 'herb-cleaning',
    group: 'Herblore',
    title: 'Herb cleaning',
    blurb: 'Clean grimy herbs and sell the clean ones.',
    sorts: PER_4H_SORTS,
    defaultSort: 'potential',
    recipes: perMarket(herbCleaningRecipes)
  }
]

const PROCESSING_METHODS = processingMethods.map(m => {
  const recipes = m.recipes.map(r => ({ ...r, actionsPerHour: m.actionsPerHour, source: m.source }))
  return {
    key: m.key,
    group: 'Processing',
    title: m.title,
    blurb: m.description,
    requirements: m.requirements,
    source: m.source,
    sorts: m.actionsPerHour ? PER_HOUR_SORTS : PER_4H_SORTS,
    defaultSort: m.actionsPerHour ? 'perHour' : 'potential',
    recipes: () => recipes
  }
})

export const METHODS = Object.freeze([...LIVE_METHODS, ...PROCESSING_METHODS])
export const DEFAULT_METHOD_KEY = 'money-makers'
const byKey = new Map(METHODS.map(m => [m.key, m]))
export const findMethod = key => byKey.get(key) ?? byKey.get(DEFAULT_METHOD_KEY)

const moneyMakerMeta = new Map(moneyMakingRecipes.map(r => [r.id, r]))
// Extra wiki details (skills, location, members, guide link) for a money maker.
export const recipeMeta = id => moneyMakerMeta.get(id)

export const MAX_ROWS = 200

// Stale prices (over 6h old) are left out unless asked for: their margins
// usually aren't there any more.
export function rankMethod (market, method, { sortBy = method.defaultSort, query = '', includeSuspicious = false, includeStale = false, membersItems = true } = {}) {
  const q = query.trim().toLowerCase()
  return rankProcessFlips(method.recipes(market), market, { sortBy, includeSuspicious, buyQuote: method.buyQuote ?? 'low' })
    .filter(f => includeStale || !f.stale)
    .filter(f => membersItems || recipeMeta(f.id)?.members !== true)
    .filter(f => !q || f.name.toLowerCase().includes(q))
}
