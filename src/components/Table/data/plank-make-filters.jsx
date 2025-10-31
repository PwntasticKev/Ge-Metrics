// Log to Plank mappings for Plank Make spell
// Format: { itemSet: plankId, itemsToCreateSet: [logId, natureRuneId, astralRuneId], conversionCost: coinCost }
// Spell cost: 1 Nature rune + 2 Astral runes + coins per plank
// itemsToCreateSet includes the log and runes needed to show in the combination items column
// Coin costs per plank: Regular=70, Oak=175, Teak=350, Mahogany=1050
// Standard OSRS log IDs:
// - Regular logs: 1511
// - Oak logs: 1521
// - Teak logs: 1519
// - Mahogany logs: 1517
// - Maple logs: 1515
// - Yew logs: 1513
export const plankMakeRecipes = [
  { itemSet: 960, itemsToCreateSet: [1511, 561, 9075], conversionCost: 70 }, // Regular plank (960) <- Logs (1511) + Nature (561) + Astral (9075) + 70 coins
  { itemSet: 8778, itemsToCreateSet: [1521, 561, 9075], conversionCost: 175 }, // Oak plank (8778) <- Oak logs (1521) + Nature + Astral + 175 coins
  { itemSet: 8780, itemsToCreateSet: [1519, 561, 9075], conversionCost: 350 }, // Teak plank (8780) <- Teak logs (1519) + Nature + Astral + 350 coins
  { itemSet: 8782, itemsToCreateSet: [1517, 561, 9075], conversionCost: 1050 }, // Mahogany plank (8782) <- Mahogany logs (1517) + Nature + Astral + 1050 coins
  { itemSet: 8784, itemsToCreateSet: [1515, 561, 9075], conversionCost: 0 }, // Maple plank (8784) <- Maple logs (1515) + Nature + Astral (need to verify coin cost)
  { itemSet: 8786, itemsToCreateSet: [1513, 561, 9075], conversionCost: 0 }, // Yew plank (8786) <- Yew logs (1513) + Nature + Astral (need to verify coin cost)
]

// Rune IDs for Plank Make spell
export const PLANK_MAKE_RUNES = {
  NATURE_RUNE_ID: 561, // Nature rune
  ASTRAL_RUNE_ID: 9075 // Astral rune
}

