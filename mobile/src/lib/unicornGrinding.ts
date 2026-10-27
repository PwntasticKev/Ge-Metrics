import type { ProcessRecipe } from '@ge/engine'
import moneyMakingRecipes from '../../../src/domain/flipping/data/moneyMakingRecipes.js'

const manual = moneyMakingRecipes.find(recipe => recipe.id === 'mmg:Grinding unicorn horns')!

/** Local comparison copies only: the shared MMG guide keeps its curated rate. */
export const UNICORN_GRINDING_RECIPES: readonly ProcessRecipe[] = [
  { id: 'unicorn-grinding:manual', name: 'Unicorn horn → Unicorn horn dust · manual grinding', coinCost: 0 },
  { id: 'unicorn-grinding:wesley', name: 'Unicorn horn → Unicorn horn dust · Wesley service', coinCost: 50, location: 'Nardah', source: 'https://oldschool.runescape.wiki/w/Wesley' }
].map(variant => ({
  ...manual,
  ...variant,
  method: 'unicorn-grinding',
  inputs: manual.inputs.map(entry => ({ ...entry })),
  outputs: manual.outputs.map(entry => ({ ...entry })),
  actionsPerHour: null
}))

export const isUnicornGrinding = (recipe: ProcessRecipe) => UNICORN_GRINDING_RECIPES.some(local => local.id === recipe.id)
