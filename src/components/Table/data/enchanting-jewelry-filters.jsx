// Enchanting Jewellery recipes
// Format: { itemSet: enchantedItemId, itemsToCreateSet: [baseItemId, ...runeIds], conversionCost: 0, itemQuantities: { runeId: quantity } }
// Reference: https://oldschool.runescape.wiki/w/Enchantment_spells

// Common rune IDs
const COSMIC_RUNE_ID = 564
const WATER_RUNE_ID = 555
const FIRE_RUNE_ID = 554
const EARTH_RUNE_ID = 557
const AIR_RUNE_ID = 556
const BLOOD_RUNE_ID = 565
const DEATH_RUNE_ID = 560

// Base jewellery item IDs (unenchanted)
const SAPPHIRE_RING_ID = 1637
const SAPPHIRE_NECKLACE_ID = 1656
const SAPPHIRE_BRACELET_ID = 11074
const SAPPHIRE_AMULET_ID = 1694

const EMERALD_RING_ID = 1639
const EMERALD_NECKLACE_ID = 1658
const EMERALD_BRACELET_ID = 11076
const EMERALD_AMULET_ID = 1696

const RUBY_RING_ID = 1641
const RUBY_NECKLACE_ID = 1660
const RUBY_BRACELET_ID = 11085
const RUBY_AMULET_ID = 1698

const DIAMOND_RING_ID = 1643
const DIAMOND_NECKLACE_ID = 1662
const DIAMOND_BRACELET_ID = 11088
const DIAMOND_AMULET_ID = 1700

const DRAGONSTONE_RING_ID = 1645
const DRAGONSTONE_NECKLACE_ID = 1664
const DRAGONSTONE_BRACELET_ID = 11115
const DRAGONSTONE_AMULET_ID = 1702

const ONYX_RING_ID = 6575
const ONYX_NECKLACE_ID = 6577
const ONYX_BRACELET_ID = 11130
const ONYX_AMULET_ID = 6579

const ZENYTE_RING_ID = 19538
const ZENYTE_NECKLACE_ID = 19540
const ZENYTE_BRACELET_ID = 19544
const ZENYTE_AMULET_ID = 19532

export const enchantingJewelryRecipes = [
  // Lvl-1 Enchant (Sapphire/Opal) - 1 Water + 1 Cosmic
  { itemSet: 1638, itemsToCreateSet: [SAPPHIRE_RING_ID, WATER_RUNE_ID, COSMIC_RUNE_ID], conversionCost: 0, itemQuantities: { [WATER_RUNE_ID]: 1, [COSMIC_RUNE_ID]: 1 } }, // Ring of Recoil
  { itemSet: 1657, itemsToCreateSet: [SAPPHIRE_NECKLACE_ID, WATER_RUNE_ID, COSMIC_RUNE_ID], conversionCost: 0, itemQuantities: { [WATER_RUNE_ID]: 1, [COSMIC_RUNE_ID]: 1 } }, // Games Necklace
  { itemSet: 11075, itemsToCreateSet: [SAPPHIRE_BRACELET_ID, WATER_RUNE_ID, COSMIC_RUNE_ID], conversionCost: 0, itemQuantities: { [WATER_RUNE_ID]: 1, [COSMIC_RUNE_ID]: 1 } }, // Bracelet of Clay
  { itemSet: 1695, itemsToCreateSet: [SAPPHIRE_AMULET_ID, WATER_RUNE_ID, COSMIC_RUNE_ID], conversionCost: 0, itemQuantities: { [WATER_RUNE_ID]: 1, [COSMIC_RUNE_ID]: 1 } }, // Amulet of Magic
  
  // Lvl-2 Enchant (Emerald/Jade) - 3 Air + 1 Cosmic
  { itemSet: 2552, itemsToCreateSet: [EMERALD_RING_ID, AIR_RUNE_ID, COSMIC_RUNE_ID], conversionCost: 0, itemQuantities: { [AIR_RUNE_ID]: 3, [COSMIC_RUNE_ID]: 1 } }, // Ring of Dueling
  { itemSet: 5521, itemsToCreateSet: [EMERALD_NECKLACE_ID, AIR_RUNE_ID, COSMIC_RUNE_ID], conversionCost: 0, itemQuantities: { [AIR_RUNE_ID]: 3, [COSMIC_RUNE_ID]: 1 } }, // Binding Necklace
  { itemSet: 11079, itemsToCreateSet: [EMERALD_BRACELET_ID, AIR_RUNE_ID, COSMIC_RUNE_ID], conversionCost: 0, itemQuantities: { [AIR_RUNE_ID]: 3, [COSMIC_RUNE_ID]: 1 } }, // Castle Wars Bracelet
  { itemSet: 1697, itemsToCreateSet: [EMERALD_AMULET_ID, AIR_RUNE_ID, COSMIC_RUNE_ID], conversionCost: 0, itemQuantities: { [AIR_RUNE_ID]: 3, [COSMIC_RUNE_ID]: 1 } }, // Amulet of Defence
  
  // Lvl-3 Enchant (Ruby/Topaz) - 5 Fire + 1 Cosmic
  { itemSet: 2568, itemsToCreateSet: [RUBY_RING_ID, FIRE_RUNE_ID, COSMIC_RUNE_ID], conversionCost: 0, itemQuantities: { [FIRE_RUNE_ID]: 5, [COSMIC_RUNE_ID]: 1 } }, // Ring of Forging
  { itemSet: 11113, itemsToCreateSet: [RUBY_NECKLACE_ID, FIRE_RUNE_ID, COSMIC_RUNE_ID], conversionCost: 0, itemQuantities: { [FIRE_RUNE_ID]: 5, [COSMIC_RUNE_ID]: 1 } }, // Digsite Pendant
  { itemSet: 11086, itemsToCreateSet: [RUBY_BRACELET_ID, FIRE_RUNE_ID, COSMIC_RUNE_ID], conversionCost: 0, itemQuantities: { [FIRE_RUNE_ID]: 5, [COSMIC_RUNE_ID]: 1 } }, // Inoculation Bracelet
  { itemSet: 1699, itemsToCreateSet: [RUBY_AMULET_ID, FIRE_RUNE_ID, COSMIC_RUNE_ID], conversionCost: 0, itemQuantities: { [FIRE_RUNE_ID]: 5, [COSMIC_RUNE_ID]: 1 } }, // Amulet of Strength
  
  // Lvl-4 Enchant (Diamond) - 10 Earth + 1 Cosmic
  { itemSet: 2570, itemsToCreateSet: [DIAMOND_RING_ID, EARTH_RUNE_ID, COSMIC_RUNE_ID], conversionCost: 0, itemQuantities: { [EARTH_RUNE_ID]: 10, [COSMIC_RUNE_ID]: 1 } }, // Ring of Life
  { itemSet: 11105, itemsToCreateSet: [DIAMOND_NECKLACE_ID, EARTH_RUNE_ID, COSMIC_RUNE_ID], conversionCost: 0, itemQuantities: { [EARTH_RUNE_ID]: 10, [COSMIC_RUNE_ID]: 1 } }, // Phoenix Necklace
  { itemSet: 11090, itemsToCreateSet: [DIAMOND_BRACELET_ID, EARTH_RUNE_ID, COSMIC_RUNE_ID], conversionCost: 0, itemQuantities: { [EARTH_RUNE_ID]: 10, [COSMIC_RUNE_ID]: 1 } }, // Abyssal Bracelet
  { itemSet: 1701, itemsToCreateSet: [DIAMOND_AMULET_ID, EARTH_RUNE_ID, COSMIC_RUNE_ID], conversionCost: 0, itemQuantities: { [EARTH_RUNE_ID]: 10, [COSMIC_RUNE_ID]: 1 } }, // Amulet of Power
  
  // Lvl-5 Enchant (Dragonstone) - 15 Water + 15 Earth + 1 Cosmic
  { itemSet: 2572, itemsToCreateSet: [DRAGONSTONE_RING_ID, WATER_RUNE_ID, EARTH_RUNE_ID, COSMIC_RUNE_ID], conversionCost: 0, itemQuantities: { [WATER_RUNE_ID]: 15, [EARTH_RUNE_ID]: 15, [COSMIC_RUNE_ID]: 1 } }, // Ring of Wealth
  { itemSet: 11115, itemsToCreateSet: [DRAGONSTONE_NECKLACE_ID, WATER_RUNE_ID, EARTH_RUNE_ID, COSMIC_RUNE_ID], conversionCost: 0, itemQuantities: { [WATER_RUNE_ID]: 15, [EARTH_RUNE_ID]: 15, [COSMIC_RUNE_ID]: 1 } }, // Skills Necklace
  { itemSet: 11118, itemsToCreateSet: [DRAGONSTONE_BRACELET_ID, WATER_RUNE_ID, EARTH_RUNE_ID, COSMIC_RUNE_ID], conversionCost: 0, itemQuantities: { [WATER_RUNE_ID]: 15, [EARTH_RUNE_ID]: 15, [COSMIC_RUNE_ID]: 1 } }, // Combat Bracelet
  { itemSet: 1702, itemsToCreateSet: [DRAGONSTONE_AMULET_ID, WATER_RUNE_ID, EARTH_RUNE_ID, COSMIC_RUNE_ID], conversionCost: 0, itemQuantities: { [WATER_RUNE_ID]: 15, [EARTH_RUNE_ID]: 15, [COSMIC_RUNE_ID]: 1 } }, // Amulet of Glory
  
  // Lvl-6 Enchant (Onyx) - 20 Fire + 20 Earth + 1 Cosmic
  { itemSet: 6583, itemsToCreateSet: [ONYX_RING_ID, FIRE_RUNE_ID, EARTH_RUNE_ID, COSMIC_RUNE_ID], conversionCost: 0, itemQuantities: { [FIRE_RUNE_ID]: 20, [EARTH_RUNE_ID]: 20, [COSMIC_RUNE_ID]: 1 } }, // Ring of Stone
  { itemSet: 6585, itemsToCreateSet: [ONYX_NECKLACE_ID, FIRE_RUNE_ID, EARTH_RUNE_ID, COSMIC_RUNE_ID], conversionCost: 0, itemQuantities: { [FIRE_RUNE_ID]: 20, [EARTH_RUNE_ID]: 20, [COSMIC_RUNE_ID]: 1 } }, // Berserker Necklace
  { itemSet: 11133, itemsToCreateSet: [ONYX_BRACELET_ID, FIRE_RUNE_ID, EARTH_RUNE_ID, COSMIC_RUNE_ID], conversionCost: 0, itemQuantities: { [FIRE_RUNE_ID]: 20, [EARTH_RUNE_ID]: 20, [COSMIC_RUNE_ID]: 1 } }, // Regen Bracelet
  { itemSet: 6581, itemsToCreateSet: [ONYX_AMULET_ID, FIRE_RUNE_ID, EARTH_RUNE_ID, COSMIC_RUNE_ID], conversionCost: 0, itemQuantities: { [FIRE_RUNE_ID]: 20, [EARTH_RUNE_ID]: 20, [COSMIC_RUNE_ID]: 1 } }, // Amulet of Fury
  
  // Lvl-7 Enchant (Zenyte) - 20 Blood + 20 Death + 1 Cosmic
  { itemSet: 19550, itemsToCreateSet: [ZENYTE_RING_ID, BLOOD_RUNE_ID, DEATH_RUNE_ID, COSMIC_RUNE_ID], conversionCost: 0, itemQuantities: { [BLOOD_RUNE_ID]: 20, [DEATH_RUNE_ID]: 20, [COSMIC_RUNE_ID]: 1 } }, // Ring of Suffering
  { itemSet: 19547, itemsToCreateSet: [ZENYTE_NECKLACE_ID, BLOOD_RUNE_ID, DEATH_RUNE_ID, COSMIC_RUNE_ID], conversionCost: 0, itemQuantities: { [BLOOD_RUNE_ID]: 20, [DEATH_RUNE_ID]: 20, [COSMIC_RUNE_ID]: 1 } }, // Necklace of Anguish
  { itemSet: 19544, itemsToCreateSet: [ZENYTE_BRACELET_ID, BLOOD_RUNE_ID, DEATH_RUNE_ID, COSMIC_RUNE_ID], conversionCost: 0, itemQuantities: { [BLOOD_RUNE_ID]: 20, [DEATH_RUNE_ID]: 20, [COSMIC_RUNE_ID]: 1 } }, // Tormented Bracelet
  { itemSet: 19532, itemsToCreateSet: [ZENYTE_AMULET_ID, BLOOD_RUNE_ID, DEATH_RUNE_ID, COSMIC_RUNE_ID], conversionCost: 0, itemQuantities: { [BLOOD_RUNE_ID]: 20, [DEATH_RUNE_ID]: 20, [COSMIC_RUNE_ID]: 1 } } // Amulet of Torture
]

