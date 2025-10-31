// Magic Tablet recipes for creating tablets at lecterns
// Format: { itemSet: tabletId, itemsToCreateSet: [softClayId, ...runeIds], conversionCost: 0, itemQuantities: { runeId: quantity } }
// All tablets require 1 Soft clay + specific runes
// ONLY includes items listed on: https://oldschool.runescape.wiki/w/Magic_tablet
// Does NOT include teleport scrolls or other non-tablet items
// Reference: https://oldschool.runescape.wiki/w/Magic_tablet

// Common item IDs
const SOFT_CLAY_ID = 1761
const NATURE_RUNE_ID = 561
const LAW_RUNE_ID = 563
const AIR_RUNE_ID = 556
const FIRE_RUNE_ID = 554
const EARTH_RUNE_ID = 557
const WATER_RUNE_ID = 555
const COSMIC_RUNE_ID = 564
const SOUL_RUNE_ID = 566
const BLOOD_RUNE_ID = 565
const DEATH_RUNE_ID = 560
const ASTRAL_RUNE_ID = 9075

export const magicTabletRecipes = [
  // Standard Teleport Tablets
  { 
    itemSet: 8007, // Varrock teleport tablet
    itemsToCreateSet: [SOFT_CLAY_ID, AIR_RUNE_ID, FIRE_RUNE_ID, LAW_RUNE_ID],
    conversionCost: 0,
    itemQuantities: {
      [AIR_RUNE_ID]: 3,
      [FIRE_RUNE_ID]: 1,
      [LAW_RUNE_ID]: 1
    }
  },
  { 
    itemSet: 8008, // Lumbridge teleport tablet
    itemsToCreateSet: [SOFT_CLAY_ID, AIR_RUNE_ID, EARTH_RUNE_ID, LAW_RUNE_ID],
    conversionCost: 0,
    itemQuantities: {
      [AIR_RUNE_ID]: 3,
      [EARTH_RUNE_ID]: 1,
      [LAW_RUNE_ID]: 1
    }
  },
  { 
    itemSet: 8009, // Falador teleport tablet
    itemsToCreateSet: [SOFT_CLAY_ID, AIR_RUNE_ID, WATER_RUNE_ID, LAW_RUNE_ID],
    conversionCost: 0,
    itemQuantities: {
      [AIR_RUNE_ID]: 3,
      [WATER_RUNE_ID]: 1,
      [LAW_RUNE_ID]: 1
    }
  },
  { 
    itemSet: 8010, // Camelot teleport tablet
    itemsToCreateSet: [SOFT_CLAY_ID, AIR_RUNE_ID, LAW_RUNE_ID],
    conversionCost: 0,
    itemQuantities: {
      [AIR_RUNE_ID]: 5,
      [LAW_RUNE_ID]: 1
    }
  },
  { 
    itemSet: 8011, // Ardougne teleport tablet
    itemsToCreateSet: [SOFT_CLAY_ID, WATER_RUNE_ID, LAW_RUNE_ID],
    conversionCost: 0,
    itemQuantities: {
      [WATER_RUNE_ID]: 2,
      [LAW_RUNE_ID]: 2
    }
  },
  { 
    itemSet: 8012, // Watchtower teleport tablet (Yanille)
    itemsToCreateSet: [SOFT_CLAY_ID, EARTH_RUNE_ID, LAW_RUNE_ID],
    conversionCost: 0,
    itemQuantities: {
      [EARTH_RUNE_ID]: 2,
      [LAW_RUNE_ID]: 2
    }
  },
  { 
    itemSet: 8013, // Teleport to House tablet
    itemsToCreateSet: [SOFT_CLAY_ID, LAW_RUNE_ID, AIR_RUNE_ID, EARTH_RUNE_ID],
    conversionCost: 0,
    itemQuantities: {
      [LAW_RUNE_ID]: 1,
      [AIR_RUNE_ID]: 1,
      [EARTH_RUNE_ID]: 1
    }
  },
  { 
    itemSet: 12730, // Trollheim teleport tablet
    itemsToCreateSet: [SOFT_CLAY_ID, FIRE_RUNE_ID, LAW_RUNE_ID],
    conversionCost: 0,
    itemQuantities: {
      [FIRE_RUNE_ID]: 2,
      [LAW_RUNE_ID]: 2
    }
  },
  { 
    itemSet: 11741, // Seers' Village teleport tablet
    itemsToCreateSet: [SOFT_CLAY_ID, AIR_RUNE_ID, LAW_RUNE_ID],
    conversionCost: 0,
    itemQuantities: {
      [AIR_RUNE_ID]: 5,
      [LAW_RUNE_ID]: 1
    }
  },
  
  // Enchanting Tablets
  { 
    itemSet: 8016, // Enchant sapphire tablet
    itemsToCreateSet: [SOFT_CLAY_ID, WATER_RUNE_ID, COSMIC_RUNE_ID],
    conversionCost: 0,
    itemQuantities: {
      [WATER_RUNE_ID]: 1,
      [COSMIC_RUNE_ID]: 1
    }
  },
  { 
    itemSet: 8017, // Enchant emerald tablet
    itemsToCreateSet: [SOFT_CLAY_ID, AIR_RUNE_ID, COSMIC_RUNE_ID],
    conversionCost: 0,
    itemQuantities: {
      [AIR_RUNE_ID]: 3,
      [COSMIC_RUNE_ID]: 1
    }
  },
  { 
    itemSet: 8018, // Enchant ruby tablet
    itemsToCreateSet: [SOFT_CLAY_ID, FIRE_RUNE_ID, COSMIC_RUNE_ID],
    conversionCost: 0,
    itemQuantities: {
      [FIRE_RUNE_ID]: 5,
      [COSMIC_RUNE_ID]: 1
    }
  },
  { 
    itemSet: 8019, // Enchant diamond tablet
    itemsToCreateSet: [SOFT_CLAY_ID, EARTH_RUNE_ID, COSMIC_RUNE_ID],
    conversionCost: 0,
    itemQuantities: {
      [EARTH_RUNE_ID]: 10,
      [COSMIC_RUNE_ID]: 1
    }
  },
  { 
    itemSet: 8020, // Enchant dragonstone tablet
    itemsToCreateSet: [SOFT_CLAY_ID, WATER_RUNE_ID, EARTH_RUNE_ID, COSMIC_RUNE_ID],
    conversionCost: 0,
    itemQuantities: {
      [WATER_RUNE_ID]: 15,
      [EARTH_RUNE_ID]: 15,
      [COSMIC_RUNE_ID]: 1
    }
  },
  { 
    itemSet: 8021, // Enchant onyx tablet
    itemsToCreateSet: [SOFT_CLAY_ID, FIRE_RUNE_ID, EARTH_RUNE_ID, COSMIC_RUNE_ID],
    conversionCost: 0,
    itemQuantities: {
      [FIRE_RUNE_ID]: 20,
      [EARTH_RUNE_ID]: 20,
      [COSMIC_RUNE_ID]: 1
    }
  },
  
  // Ancient Magicks Teleport Tablets
  { 
    itemSet: 12402, // Paddewwa teleport tablet
    itemsToCreateSet: [SOFT_CLAY_ID, LAW_RUNE_ID, AIR_RUNE_ID, FIRE_RUNE_ID],
    conversionCost: 0,
    itemQuantities: {
      [LAW_RUNE_ID]: 1,
      [AIR_RUNE_ID]: 2,
      [FIRE_RUNE_ID]: 1
    }
  },
  { 
    itemSet: 12403, // Senntisten teleport tablet
    itemsToCreateSet: [SOFT_CLAY_ID, LAW_RUNE_ID, SOUL_RUNE_ID],
    conversionCost: 0,
    itemQuantities: {
      [LAW_RUNE_ID]: 1,
      [SOUL_RUNE_ID]: 2
    }
  },
  { 
    itemSet: 12404, // Kharyrll teleport tablet
    itemsToCreateSet: [SOFT_CLAY_ID, LAW_RUNE_ID, BLOOD_RUNE_ID],
    conversionCost: 0,
    itemQuantities: {
      [LAW_RUNE_ID]: 1,
      [BLOOD_RUNE_ID]: 1
    }
  },
  { 
    itemSet: 12405, // Lassar teleport tablet
    itemsToCreateSet: [SOFT_CLAY_ID, LAW_RUNE_ID, WATER_RUNE_ID],
    conversionCost: 0,
    itemQuantities: {
      [LAW_RUNE_ID]: 1,
      [WATER_RUNE_ID]: 4
    }
  },
  { 
    itemSet: 12406, // Dareeyak teleport tablet
    itemsToCreateSet: [SOFT_CLAY_ID, LAW_RUNE_ID, FIRE_RUNE_ID, AIR_RUNE_ID],
    conversionCost: 0,
    itemQuantities: {
      [LAW_RUNE_ID]: 1,
      [FIRE_RUNE_ID]: 3,
      [AIR_RUNE_ID]: 2
    }
  },
  { 
    itemSet: 12407, // Carrallangar teleport tablet
    itemsToCreateSet: [SOFT_CLAY_ID, LAW_RUNE_ID, SOUL_RUNE_ID],
    conversionCost: 0,
    itemQuantities: {
      [LAW_RUNE_ID]: 1,
      [SOUL_RUNE_ID]: 2
    }
  },
  { 
    itemSet: 12408, // Annakarl teleport tablet
    itemsToCreateSet: [SOFT_CLAY_ID, LAW_RUNE_ID, BLOOD_RUNE_ID],
    conversionCost: 0,
    itemQuantities: {
      [LAW_RUNE_ID]: 1,
      [BLOOD_RUNE_ID]: 2
    }
  },
  { 
    itemSet: 12409, // Ghorrock teleport tablet
    itemsToCreateSet: [SOFT_CLAY_ID, LAW_RUNE_ID, WATER_RUNE_ID, AIR_RUNE_ID],
    conversionCost: 0,
    itemQuantities: {
      [LAW_RUNE_ID]: 1,
      [WATER_RUNE_ID]: 8,
      [AIR_RUNE_ID]: 8
    }
  },
  
  // Lunar Spellbook Teleport Tablets
  { 
    itemSet: 12775, // Moonclan teleport tablet
    itemsToCreateSet: [SOFT_CLAY_ID, LAW_RUNE_ID, ASTRAL_RUNE_ID, EARTH_RUNE_ID],
    conversionCost: 0,
    itemQuantities: {
      [LAW_RUNE_ID]: 1,
      [ASTRAL_RUNE_ID]: 2,
      [EARTH_RUNE_ID]: 2
    }
  },
  { 
    itemSet: 12776, // Ourania teleport tablet
    itemsToCreateSet: [SOFT_CLAY_ID, LAW_RUNE_ID, ASTRAL_RUNE_ID, EARTH_RUNE_ID],
    conversionCost: 0,
    itemQuantities: {
      [LAW_RUNE_ID]: 1,
      [ASTRAL_RUNE_ID]: 2,
      [EARTH_RUNE_ID]: 2
    }
  },
  { 
    itemSet: 12777, // Waterbirth teleport tablet
    itemsToCreateSet: [SOFT_CLAY_ID, LAW_RUNE_ID, ASTRAL_RUNE_ID, WATER_RUNE_ID],
    conversionCost: 0,
    itemQuantities: {
      [LAW_RUNE_ID]: 1,
      [ASTRAL_RUNE_ID]: 2,
      [WATER_RUNE_ID]: 1
    }
  },
  { 
    itemSet: 12778, // Barbarian teleport tablet
    itemsToCreateSet: [SOFT_CLAY_ID, LAW_RUNE_ID, ASTRAL_RUNE_ID, FIRE_RUNE_ID],
    conversionCost: 0,
    itemQuantities: {
      [LAW_RUNE_ID]: 1,
      [ASTRAL_RUNE_ID]: 3,
      [FIRE_RUNE_ID]: 2
    }
  },
  { 
    itemSet: 12779, // Khazard teleport tablet
    itemsToCreateSet: [SOFT_CLAY_ID, LAW_RUNE_ID, ASTRAL_RUNE_ID, WATER_RUNE_ID],
    conversionCost: 0,
    itemQuantities: {
      [LAW_RUNE_ID]: 1,
      [ASTRAL_RUNE_ID]: 2,
      [WATER_RUNE_ID]: 4
    }
  },
  { 
    itemSet: 12780, // Fishing Guild teleport tablet
    itemsToCreateSet: [SOFT_CLAY_ID, LAW_RUNE_ID, ASTRAL_RUNE_ID, WATER_RUNE_ID],
    conversionCost: 0,
    itemQuantities: {
      [LAW_RUNE_ID]: 1,
      [ASTRAL_RUNE_ID]: 3,
      [WATER_RUNE_ID]: 10
    }
  },
  { 
    itemSet: 12781, // Catherby teleport tablet
    itemsToCreateSet: [SOFT_CLAY_ID, LAW_RUNE_ID, ASTRAL_RUNE_ID, WATER_RUNE_ID],
    conversionCost: 0,
    itemQuantities: {
      [LAW_RUNE_ID]: 1,
      [ASTRAL_RUNE_ID]: 3,
      [WATER_RUNE_ID]: 10
    }
  },
  { 
    itemSet: 12782, // Ice Plateau teleport tablet
    itemsToCreateSet: [SOFT_CLAY_ID, LAW_RUNE_ID, ASTRAL_RUNE_ID, WATER_RUNE_ID],
    conversionCost: 0,
    itemQuantities: {
      [LAW_RUNE_ID]: 1,
      [ASTRAL_RUNE_ID]: 3,
      [WATER_RUNE_ID]: 8
    }
  },
  
  // Arceuus Spellbook Teleport Tablets
  { 
    itemSet: 30622, // Arceuus Library teleport tablet
    itemsToCreateSet: [SOFT_CLAY_ID, LAW_RUNE_ID, SOUL_RUNE_ID],
    conversionCost: 0,
    itemQuantities: {
      [LAW_RUNE_ID]: 1,
      [SOUL_RUNE_ID]: 2
    }
  },
  { 
    itemSet: 30623, // Draynor Manor teleport tablet
    itemsToCreateSet: [SOFT_CLAY_ID, LAW_RUNE_ID, SOUL_RUNE_ID],
    conversionCost: 0,
    itemQuantities: {
      [LAW_RUNE_ID]: 1,
      [SOUL_RUNE_ID]: 2
    }
  },
  { 
    itemSet: 30624, // Battlefront teleport tablet
    itemsToCreateSet: [SOFT_CLAY_ID, LAW_RUNE_ID, SOUL_RUNE_ID],
    conversionCost: 0,
    itemQuantities: {
      [LAW_RUNE_ID]: 1,
      [SOUL_RUNE_ID]: 2
    }
  },
  { 
    itemSet: 30625, // Mind Altar teleport tablet
    itemsToCreateSet: [SOFT_CLAY_ID, LAW_RUNE_ID, SOUL_RUNE_ID],
    conversionCost: 0,
    itemQuantities: {
      [LAW_RUNE_ID]: 1,
      [SOUL_RUNE_ID]: 2
    }
  },
  { 
    itemSet: 30626, // Respawn teleport tablet
    itemsToCreateSet: [SOFT_CLAY_ID, LAW_RUNE_ID, SOUL_RUNE_ID],
    conversionCost: 0,
    itemQuantities: {
      [LAW_RUNE_ID]: 1,
      [SOUL_RUNE_ID]: 1
    }
  },
  { 
    itemSet: 30627, // Salve Graveyard teleport tablet
    itemsToCreateSet: [SOFT_CLAY_ID, LAW_RUNE_ID, SOUL_RUNE_ID],
    conversionCost: 0,
    itemQuantities: {
      [LAW_RUNE_ID]: 1,
      [SOUL_RUNE_ID]: 2
    }
  },
  { 
    itemSet: 30628, // Fenkenstrain's Castle teleport tablet
    itemsToCreateSet: [SOFT_CLAY_ID, LAW_RUNE_ID, SOUL_RUNE_ID],
    conversionCost: 0,
    itemQuantities: {
      [LAW_RUNE_ID]: 1,
      [SOUL_RUNE_ID]: 2
    }
  },
  { 
    itemSet: 30629, // West Ardougne teleport tablet
    itemsToCreateSet: [SOFT_CLAY_ID, LAW_RUNE_ID, SOUL_RUNE_ID],
    conversionCost: 0,
    itemQuantities: {
      [LAW_RUNE_ID]: 1,
      [SOUL_RUNE_ID]: 2
    }
  },
  { 
    itemSet: 30630, // Harmony Island teleport tablet
    itemsToCreateSet: [SOFT_CLAY_ID, LAW_RUNE_ID, SOUL_RUNE_ID],
    conversionCost: 0,
    itemQuantities: {
      [LAW_RUNE_ID]: 1,
      [SOUL_RUNE_ID]: 2
    }
  },
  { 
    itemSet: 30631, // Cemetery teleport tablet
    itemsToCreateSet: [SOFT_CLAY_ID, LAW_RUNE_ID, SOUL_RUNE_ID],
    conversionCost: 0,
    itemQuantities: {
      [LAW_RUNE_ID]: 1,
      [SOUL_RUNE_ID]: 2
    }
  },
  { 
    itemSet: 30632, // Barrows teleport tablet
    itemsToCreateSet: [SOFT_CLAY_ID, LAW_RUNE_ID, SOUL_RUNE_ID],
    conversionCost: 0,
    itemQuantities: {
      [LAW_RUNE_ID]: 1,
      [SOUL_RUNE_ID]: 2
    }
  },
  { 
    itemSet: 30633, // Ape Atoll teleport tablet
    itemsToCreateSet: [SOFT_CLAY_ID, LAW_RUNE_ID, SOUL_RUNE_ID],
    conversionCost: 0,
    itemQuantities: {
      [LAW_RUNE_ID]: 1,
      [SOUL_RUNE_ID]: 2
    }
  }
]

