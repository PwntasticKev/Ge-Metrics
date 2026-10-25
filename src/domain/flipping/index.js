// Pure flipping math shared by the web app and (later) the mobile app.
// No React, no fetching: give it prices, get ranked opportunities back.

export { geTax } from './geTax.js'
export { createMarket, createMarketFromWiki } from './market.js'
export { computeItemFlip, rankItemFlips } from './itemFlip.js'
export { computeSetFlip, rankSetFlips } from './setFlip.js'
export { buildRecipes, geSetRecipes, normalizeLegacyRecipe } from './recipes.js'
export { itemRecipes as craftedRecipes } from './data/craftedRecipes.js'
export { computeProcessFlip, rankProcessFlips } from './processFlip.js'
export { decantingRecipes, herbCleaningRecipes, unfinishedPotionRecipes } from './derivedRecipes.js'
export { default as moneyMakingRecipes } from './data/moneyMakingRecipes.js'
export { default as processingMethods } from './data/processingMethods.js'
export { applyBudget, withBudget } from './budget.js'
