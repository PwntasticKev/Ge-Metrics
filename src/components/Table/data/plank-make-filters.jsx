// Log to Plank mappings for Plank Make spell
// Format: { itemSet: plankId, itemsToCreateSet: [logId, earthRuneId, astralRuneId, natureRuneId], conversionCost: coinCost }
// Spell cost: 15 Earth runes + 2 Astral runes + 1 Nature rune + coins per plank
// Reference: https://oldschool.runescape.wiki/w/Plank_Make
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
  { itemSet: 960, itemsToCreateSet: [1511, 557, 9075, 561], conversionCost: 70 }, // Regular plank (960) <- Logs (1511) + 15 Earth (557) + 2 Astral (9075) + 1 Nature (561) + 70 coins
  { itemSet: 8778, itemsToCreateSet: [1521, 557, 9075, 561], conversionCost: 175 }, // Oak plank (8778) <- Oak logs (1521) + 15 Earth + 2 Astral + 1 Nature + 175 coins
  { itemSet: 8780, itemsToCreateSet: [1519, 557, 9075, 561], conversionCost: 350 }, // Teak plank (8780) <- Teak logs (1519) + 15 Earth + 2 Astral + 1 Nature + 350 coins
  { itemSet: 8782, itemsToCreateSet: [1517, 557, 9075, 561], conversionCost: 1050 }, // Mahogany plank (8782) <- Mahogany logs (1517) + 15 Earth + 2 Astral + 1 Nature + 1050 coins
  { itemSet: 8784, itemsToCreateSet: [1515, 557, 9075, 561], conversionCost: 0 }, // Maple plank (8784) <- Maple logs (1515) + 15 Earth + 2 Astral + 1 Nature (need to verify coin cost)
  { itemSet: 8786, itemsToCreateSet: [1513, 557, 9075, 561], conversionCost: 0 }, // Yew plank (8786) <- Yew logs (1513) + 15 Earth + 2 Astral + 1 Nature (need to verify coin cost)
]

// Explicit mappings for validation (log ID -> plank ID)
export const PLANK_LOG_MAPPINGS = {
  1519: 8780, // Teak logs -> Teak plank
  1517: 8782, // Mahogany logs -> Mahogany plank
  1511: 960,  // Regular logs -> Regular plank
  1521: 8778, // Oak logs -> Oak plank
  1515: 8784, // Maple logs -> Maple plank
  1513: 8786  // Yew logs -> Yew plank
}

// Rune IDs for Plank Make spell
export const PLANK_MAKE_RUNES = {
  EARTH_RUNE_ID: 557, // Earth rune (15 required)
  ASTRAL_RUNE_ID: 9075, // Astral rune (2 required)
  NATURE_RUNE_ID: 561 // Nature rune (1 required)
}

