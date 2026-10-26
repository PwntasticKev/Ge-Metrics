// Representative items in the shape ItemData() hands to the pages
// (wiki /mapping merged with /latest; missing prices become 0).
// Prices are taken from a real /latest snapshot (2026-10-26) and rounded.

const item = (id, name, high, low, extra = {}) => Object.freeze({
  id,
  name,
  icon: `${name}.png`,
  members: true,
  limit: 70,
  high,
  low,
  highTime: 1793030000,
  lowTime: 1793030000,
  volume: 1000,
  ...extra
})

export const ITEMS = Object.freeze([
  // Plain taxed flip
  item(4151, 'Abyssal whip', 1_500_000, 1_450_000),
  // Tax rounds down: 2% of 149 = 2.98 -> 2
  item(1511, 'Logs', 149, 120),
  // Under 50 gp: 2% rounds to 0 either way
  item(1925, 'Bucket', 49, 40),
  // Tax capped at 5M per item
  item(22325, 'Scythe of vitur', 1_500_000_000, 1_480_000_000, { limit: 8 }),
  // On the wiki's tax-exempt list
  item(13190, 'Old school bond', 10_500_000, 10_100_999, { limit: 100 }),
  item(1755, 'Chisel', 300, 296),
  item(8013, 'Teleport to house (tablet)', 473, 467),
  // No buy price in /latest
  item(4587, 'Dragon scimitar', 60_000, 0),
  // Never traded at all
  item(2, 'Cannonball', 0, 0),

  // Combination parts and sets
  item(11802, 'Armadyl godsword', 6_185_056, 6_000_000),
  item(11810, 'Armadyl hilt', 5_600_000, 5_488_891),
  item(11798, 'Godsword blade', 460_000, 451_222),
  item(27614, 'Venator shard', 12_800_000, 12_651_001),
  item(27610, 'Venator bow (uncharged)', 66_000_000, 65_000_000),
  item(12399, 'Partyhat & specs', 635_259, 555_411),
  item(1042, 'Blue partyhat', 20_292, 18_111),
  item(12337, 'Sagacious spectacles', 548_425, 451_021),
  item(12924, 'Toxic blowpipe (empty)', 9_194_767, 9_000_000),
  item(12922, 'Tanzanite fang', 9_100_000, 8_851_009),
  item(50001, 'Unpriced set', 0, 0),
  item(50002, 'Set with an unpriced part', 1_000_000, 900_000)
])

// Recipes in the legacy shape the web uses (src/domain/flipping/data/craftedRecipes.js).
export const RECIPES = Object.freeze([
  { name: 'armadylGodsword', itemSet: 11802, itemsToCreateSet: [11810, 11798] },
  { name: 'blowpipe', itemSet: 12924, itemsToCreateSet: [12922] },
  // `qty` sets how many of one part are needed
  { name: 'venatorBow', itemSet: 27610, itemsToCreateSet: [27614], conversionCost: 0, qty: { id: 27614, qty: 5 } },
  // A repeated id also means "needs more than one"
  { name: 'twoBlades', itemSet: 11802, itemsToCreateSet: [11810, 11798, 11798] },
  // Conversion cost is part of the buy side
  { name: 'withFee', itemSet: 11802, itemsToCreateSet: [11810, 11798], conversionCost: 50_000 },
  // The set has no price
  { name: 'unpricedSet', itemSet: 50001, itemsToCreateSet: [1042] },
  // One part has no buy price
  { name: 'unpricedPart', itemSet: 50002, itemsToCreateSet: [1042, 4587] }
])

// The shipped Partyhat & specs recipe before it was fixed: the set listed as its own part.
export const SELF_PART_RECIPE = Object.freeze({
  name: 'Partyhat and Specs', itemSet: 12399, itemsToCreateSet: [1042, 12399], conversionCost: 500
})
