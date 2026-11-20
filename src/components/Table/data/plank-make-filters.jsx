// Log to Plank mappings for Plank Make spell
// Format: { itemSet: plankId, itemsToCreateSet: [logId, earthRuneId, astralRuneId, natureRuneId], conversionCost: coinCost }
// Spell cost: 15 Earth runes + 2 Astral runes + 1 Nature rune + coins per plank
// Reference: https://oldschool.runescape.wiki/w/Plank_Make
// itemsToCreateSet includes the log and runes needed to show in the combination items column
// Coin costs per plank: Regular=70, Oak=175, Teak=350, Mahogany=1050
// Log IDs (checked against the wiki prices API mapping):
// - Logs: 1511, Oak logs: 1521, Teak logs: 6333, Mahogany logs: 6332
// There are no maple or yew planks in OSRS.
export const plankMakeRecipes = [
  { itemSet: 960, itemsToCreateSet: [1511, 557, 9075, 561], conversionCost: 70 }, // Plank <- Logs
  { itemSet: 8778, itemsToCreateSet: [1521, 557, 9075, 561], conversionCost: 175 }, // Oak plank <- Oak logs
  { itemSet: 8780, itemsToCreateSet: [6333, 557, 9075, 561], conversionCost: 350 }, // Teak plank <- Teak logs
  { itemSet: 8782, itemsToCreateSet: [6332, 557, 9075, 561], conversionCost: 1050 } // Mahogany plank <- Mahogany logs
]

// Explicit mappings (log ID -> plank ID)
export const PLANK_LOG_MAPPINGS = {
  1511: 960, // Logs -> Plank
  1521: 8778, // Oak logs -> Oak plank
  6333: 8780, // Teak logs -> Teak plank
  6332: 8782 // Mahogany logs -> Mahogany plank
}

// Rune IDs for Plank Make spell
export const PLANK_MAKE_RUNES = {
  EARTH_RUNE_ID: 557, // Earth rune (15 required)
  ASTRAL_RUNE_ID: 9075, // Astral rune (2 required)
  NATURE_RUNE_ID: 561 // Nature rune (1 required)
}

