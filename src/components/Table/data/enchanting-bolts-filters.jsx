// Enchanting Crossbow Bolts recipes
// Format: { itemSet: enchantedBoltId, itemsToCreateSet: [baseBoltId, ...runeIds], conversionCost: 0, itemQuantities: { runeId: quantity } }
// Reference: https://oldschool.runescape.wiki/w/Enchantment_spells

// Common rune IDs
const COSMIC_RUNE_ID = 564
const WATER_RUNE_ID = 555
const FIRE_RUNE_ID = 554
const EARTH_RUNE_ID = 557
const AIR_RUNE_ID = 556
const BLOOD_RUNE_ID = 565
const DEATH_RUNE_ID = 560
const NATURE_RUNE_ID = 561
const LAW_RUNE_ID = 563
const SOUL_RUNE_ID = 566

// Crossbow bolt IDs (unenchanted - base items)
const OPAL_BOLTS_ID = 879
const JADE_BOLTS_ID = 9335
const PEARL_BOLTS_ID = 880
const TOPAZ_BOLTS_ID = 9336
const SAPPHIRE_BOLTS_ID = 9337
const EMERALD_BOLTS_ID = 9338
const RUBY_BOLTS_ID = 9339
const DIAMOND_BOLTS_ID = 9340
const DRAGONSTONE_BOLTS_ID = 9341
const ONYX_BOLTS_ID = 9342

// Enchanted bolt IDs (end with "(e)")
const OPAL_BOLTS_E_ID = 9236 // Opal bolts (e)
const JADE_BOLTS_E_ID = 9237 // Jade bolts (e)
const PEARL_BOLTS_E_ID = 9238 // Pearl bolts (e)
const TOPAZ_BOLTS_E_ID = 9239 // Topaz bolts (e)
const SAPPHIRE_BOLTS_E_ID = 9240 // Sapphire bolts (e)
const EMERALD_BOLTS_E_ID = 9241 // Emerald bolts (e)
const RUBY_BOLTS_E_ID = 9242 // Ruby bolts (e)
const DIAMOND_BOLTS_E_ID = 9243 // Diamond bolts (e)
const DRAGONSTONE_BOLTS_E_ID = 9244 // Dragonstone bolts (e)
const ONYX_BOLTS_E_ID = 9245 // Onyx bolts (e)

export const enchantingBoltsRecipes = [
  // Enchant Crossbow Bolt (Opal) - Level 4, 2 Air + 1 Cosmic
  { 
    itemSet: OPAL_BOLTS_E_ID, 
    itemsToCreateSet: [OPAL_BOLTS_ID, AIR_RUNE_ID, COSMIC_RUNE_ID], 
    conversionCost: 0, 
    itemQuantities: { [AIR_RUNE_ID]: 2, [COSMIC_RUNE_ID]: 1 } 
  },
  
  // Enchant Crossbow Bolt (Sapphire) - Level 7, 1 Water + 1 Cosmic
  { 
    itemSet: SAPPHIRE_BOLTS_E_ID, 
    itemsToCreateSet: [SAPPHIRE_BOLTS_ID, WATER_RUNE_ID, COSMIC_RUNE_ID], 
    conversionCost: 0, 
    itemQuantities: { [WATER_RUNE_ID]: 1, [COSMIC_RUNE_ID]: 1 } 
  },
  
  // Enchant Crossbow Bolt (Jade) - Level 14, 2 Earth + 1 Cosmic
  { 
    itemSet: JADE_BOLTS_E_ID, 
    itemsToCreateSet: [JADE_BOLTS_ID, EARTH_RUNE_ID, COSMIC_RUNE_ID], 
    conversionCost: 0, 
    itemQuantities: { [EARTH_RUNE_ID]: 2, [COSMIC_RUNE_ID]: 1 } 
  },
  
  // Enchant Crossbow Bolt (Pearl) - Level 24, 2 Water + 1 Cosmic
  { 
    itemSet: PEARL_BOLTS_E_ID, 
    itemsToCreateSet: [PEARL_BOLTS_ID, WATER_RUNE_ID, COSMIC_RUNE_ID], 
    conversionCost: 0, 
    itemQuantities: { [WATER_RUNE_ID]: 2, [COSMIC_RUNE_ID]: 1 } 
  },
  
  // Enchant Crossbow Bolt (Emerald) - Level 27, 3 Air + 1 Cosmic + 1 Nature
  { 
    itemSet: EMERALD_BOLTS_E_ID, 
    itemsToCreateSet: [EMERALD_BOLTS_ID, AIR_RUNE_ID, COSMIC_RUNE_ID, NATURE_RUNE_ID], 
    conversionCost: 0, 
    itemQuantities: { [AIR_RUNE_ID]: 3, [COSMIC_RUNE_ID]: 1, [NATURE_RUNE_ID]: 1 } 
  },
  
  // Enchant Crossbow Bolt (Red Topaz) - Level 29, 2 Fire + 1 Cosmic
  { 
    itemSet: TOPAZ_BOLTS_E_ID, 
    itemsToCreateSet: [TOPAZ_BOLTS_ID, FIRE_RUNE_ID, COSMIC_RUNE_ID], 
    conversionCost: 0, 
    itemQuantities: { [FIRE_RUNE_ID]: 2, [COSMIC_RUNE_ID]: 1 } 
  },
  
  // Enchant Crossbow Bolt (Ruby) - Level 49, 5 Fire + 1 Cosmic + 1 Blood
  { 
    itemSet: RUBY_BOLTS_E_ID, 
    itemsToCreateSet: [RUBY_BOLTS_ID, FIRE_RUNE_ID, COSMIC_RUNE_ID, BLOOD_RUNE_ID], 
    conversionCost: 0, 
    itemQuantities: { [FIRE_RUNE_ID]: 5, [COSMIC_RUNE_ID]: 1, [BLOOD_RUNE_ID]: 1 } 
  },
  
  // Enchant Crossbow Bolt (Diamond) - Level 57, 10 Earth + 1 Cosmic + 2 Law
  { 
    itemSet: DIAMOND_BOLTS_E_ID, 
    itemsToCreateSet: [DIAMOND_BOLTS_ID, EARTH_RUNE_ID, COSMIC_RUNE_ID, LAW_RUNE_ID], 
    conversionCost: 0, 
    itemQuantities: { [EARTH_RUNE_ID]: 10, [COSMIC_RUNE_ID]: 1, [LAW_RUNE_ID]: 2 } 
  },
  
  // Enchant Crossbow Bolt (Dragonstone) - Level 68, 15 Earth + 1 Cosmic + 1 Soul
  { 
    itemSet: DRAGONSTONE_BOLTS_E_ID, 
    itemsToCreateSet: [DRAGONSTONE_BOLTS_ID, EARTH_RUNE_ID, COSMIC_RUNE_ID, SOUL_RUNE_ID], 
    conversionCost: 0, 
    itemQuantities: { [EARTH_RUNE_ID]: 15, [COSMIC_RUNE_ID]: 1, [SOUL_RUNE_ID]: 1 } 
  },
  
  // Enchant Crossbow Bolt (Onyx) - Level 87, 20 Fire + 1 Cosmic + 1 Death
  { 
    itemSet: ONYX_BOLTS_E_ID, 
    itemsToCreateSet: [ONYX_BOLTS_ID, FIRE_RUNE_ID, COSMIC_RUNE_ID, DEATH_RUNE_ID], 
    conversionCost: 0, 
    itemQuantities: { [FIRE_RUNE_ID]: 20, [COSMIC_RUNE_ID]: 1, [DEATH_RUNE_ID]: 1 } 
  }
]

