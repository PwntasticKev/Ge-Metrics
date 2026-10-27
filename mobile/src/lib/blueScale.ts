import type { ProcessRecipe } from '@ge/engine'

/** Lab-only, per-action mechanics; no measured processing rate or capacity. */
export const BLUE_SCALE_RECIPES: readonly ProcessRecipe[] = [
  { id: 'blue-scale:manual', name: 'Blue dragon scale → Dragon scale dust · manual grinding', coinCost: 0 },
  { id: 'blue-scale:wesley', name: 'Blue dragon scale → Dragon scale dust · Wesley service', coinCost: 50 }
].map(recipe => ({
  ...recipe,
  method: 'blue-scale',
  inputs: [{ id: 243, qty: 1 }],
  outputs: [{ id: 241, qty: 1 }],
  members: true,
  actionsPerHour: null,
  source: 'https://oldschool.runescape.wiki/w/Blue_dragon_scale'
}))

export const isBlueScale = (recipe: ProcessRecipe) => BLUE_SCALE_RECIPES.some(r => r.id === recipe.id)

/** Age of an observation against the current wall clock, never download time. */
export function blueScaleQuoteAgeSec (nowSec: number | null | undefined, quoteTime: number | null | undefined): number | null {
  if (nowSec == null || quoteTime == null || !Number.isInteger(nowSec) || !Number.isInteger(quoteTime) || nowSec <= 0 || quoteTime <= 0 || quoteTime > nowSec) return null
  return nowSec - quoteTime
}
