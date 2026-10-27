// Presentation-only overlay for exact imported rows inspected against MMG data.
// Do not infer eligibility from names/skills or change yields or guide rates.
const COOKING_IDS = new Set([
  'mmg:Cooking plain pizzas',
  'mmg:Cooking raw anchovies',
  'mmg:Cooking raw anglerfish',
  'mmg:Cooking raw chicken',
  'mmg:Cooking raw dark crabs',
  'mmg:Cooking raw dashing kebbit',
  'mmg:Cooking raw herring',
  'mmg:Cooking raw karambwan',
  'mmg:Cooking raw lobster',
  'mmg:Cooking raw marlin',
  'mmg:Cooking raw monkfish',
  'mmg:Cooking raw moonlight antelope',
  'mmg:Cooking raw salmon',
  'mmg:Cooking raw sharks',
  'mmg:Cooking raw shrimp',
  'mmg:Cooking raw sunlight antelope',
  'mmg:Cooking raw swordfish',
  'mmg:Cooking raw trout',
  'mmg:Cooking raw tuna',
  'mmg:Cooking raw yellowfin'
])

interface CookingAssumptions {
  summary: string
  detail: string
}

const summary = 'Assumes no burns; guide-rate estimate.'
const generic: CookingAssumptions = {
  summary,
  detail: 'This declared scenario assumes no burns and uses the Wiki guide rate. The listed Cooking requirement does not establish your no-burn setup or personal throughput. Burns and slower cooking reduce profit; no burn-rate adjustment is included.'
}
const karambwan: CookingAssumptions = {
  summary,
  detail: 'Cooking 30 is the minimum requirement, not a no-burn guarantee. An equipped cooking cape prevents burns; cooking gauntlets do not affect karambwan burns. The 1,300/h guide estimate is a tick-perfect normal-rate assumption, not your personal throughput. This scenario assumes every raw karambwan produces one cooked karambwan; burns and slower cooking reduce profit.'
}

export function cookingAssumptions (id: string): CookingAssumptions | undefined {
  if (!COOKING_IDS.has(id)) return undefined
  return id === 'mmg:Cooking raw karambwan' ? karambwan : generic
}
