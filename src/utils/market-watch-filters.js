export const foodFilter = (item) => {
  const FOOD_INCLUDE_KEYWORDS = [
    // Fish
    'shrimp', 'herring', 'sardine', 'trout', 'pike', 'salmon', 'tuna', 'lobster', 'bass',
    'swordfish', 'monkfish', 'shark', 'sea turtle', 'manta ray', 'dark crab', 'karambwan', 'anglerfish',
    // Meats
    'cooked meat', 'cooked chicken', 'ugthanki kebab',
    // Baked Goods
    'bread', 'cake', 'chocolate', 'pie', 'pizza',
    // Potatoes
    'potato', 'chilli potato', 'cheese potato', 'egg potato', 'mushroom potato', 'tuna potato',
    // Fruits & Veggies
    'cabbage', 'onion', 'tomato', 'banana', 'orange', 'strawberry', 'apple', 'peach',
    // Misc
    'stew', 'curry', 'wine', 'brew', 'sweets', 'anchov', 'kebab', 'guthix rest'
  ]

  const FOOD_EXCLUDE_KEYWORDS = [
    'burnt', 'raw', 'ashes', 'seed', 'uncooked', 'potion', 'vial', 'log', 'plank',
    'ore', 'bar', 'gem', 'herb', 'grimy', 'feather', 'bait', 'compost', 'supercompost',
    'arrow', 'bolt', 'javelin', 'dart', '(unf)', ' unfinished', 'teleport', 'essence',
    'eye of newt', 'bucket of milk'
  ]

  if (!item.name) {
    return false
  }
  const name = item.name.toLowerCase()

  // Exclude items with specific keywords
  if (FOOD_EXCLUDE_KEYWORDS.some(keyword => name.includes(keyword))) {
    return false
  }

  // Include items with specific keywords
  if (FOOD_INCLUDE_KEYWORDS.some(keyword => name.includes(keyword))) {
    return true
  }

  return false
}

export const potionsFilter = (item) => {
  const POTION_INCLUDE_KEYWORDS = [
    'attack', 'strength', 'defence', 'ranging', 'magic', 'combat',
    'restore', 'prayer', 'energy', 'antipoison', 'superantipoison',
    'stamina', 'antifire', 'extended antifire', 'anti-venom', 'serum',
    'brew', 'guthix rest'
  ]

  const POTION_EXCLUDE_KEYWORDS = [
    '(unf)', 'unfinished', 'empty', 'vial', 'flask', 'recipe', 'herb', 'seed',
    'tar', 'barbarian', 'mix', 'secondary'
  ]

  if (!item.name) {
    return false
  }
  const name = item.name.toLowerCase()

  if (POTION_EXCLUDE_KEYWORDS.some(keyword => name.includes(keyword))) {
    return false
  }

  // Must include a number like (1), (2), (3), (4) AND a potion keyword
  const hasDose = /\(\d\)/.test(name)
  if (hasDose && POTION_INCLUDE_KEYWORDS.some(keyword => name.includes(keyword))) {
    return true
  }

  return false
}

export const herbsFilter = (item) => {
  const HERB_INCLUDE_KEYWORDS = [
    'guam leaf', 'marrentill', 'tarromin', 'harralander', 'ranarr weed', 'toadflax',
    'irit leaf', 'avantoe', 'kwuarm', 'snapdragon', 'cadantine', 'lantadyme',
    'dwarf weed', 'torstol'
  ]

  const HERB_EXCLUDE_KEYWORDS = [
    'grimy', 'seed', 'potion', '(unf)', 'vial', 'tar', 'sapling', 'leaf tea'
  ]

  if (!item.name) {
    return false
  }
  const name = item.name.toLowerCase()

  if (HERB_EXCLUDE_KEYWORDS.some(keyword => name.includes(keyword))) {
    return false
  }

  if (HERB_INCLUDE_KEYWORDS.some(keyword => name.includes(keyword))) {
    return true
  }

  return false
}

export const runesFilter = (item) => {
  const RUNE_INCLUDE_KEYWORDS = [
    'air rune', 'water rune', 'earth rune', 'fire rune', 'mind rune', 'body rune',
    'cosmic rune', 'chaos rune', 'nature rune', 'law rune', 'death rune', 'astral rune',
    'blood rune', 'soul rune', 'wrath rune'
  ]

  const RUNE_EXCLUDE_KEYWORDS = [
    'talisman', 'tiara', 'staff', 'essence', 'temple', 'guardian'
  ]

  if (!item.name) {
    return false
  }
  const name = item.name.toLowerCase()

  if (RUNE_EXCLUDE_KEYWORDS.some(keyword => name.includes(keyword))) {
    return false
  }

  if (RUNE_INCLUDE_KEYWORDS.some(keyword => name.includes(keyword))) {
    return true
  }

  return false
}

export const logsFilter = (item) => {
  if (!item.name) {
    return false
  }
  const name = item.name.toLowerCase()

  // Must end with ' logs' but not things like 'log basket' or pyre logs
  if (name.endsWith(' logs') && !name.includes('basket') && !name.includes('pyre')) {
    return true
  }
  return false
}

export const oresAndBarsFilter = (item) => {
  if (!item.name) {
    return false
  }
  const name = item.name.toLowerCase()

  const include = [' ore', ' bar']
  const exclude = [
    'cannonball', 'key', 'certificate', 'armour', 'arrowtips', 'javelin heads',
    'dart tip', 'bolts (unf)', ' nails', 'crossbow limb', 'grapple' // Excludes nails, limbs, etc.
  ]

  if (exclude.some(keyword => name.includes(keyword))) {
    return false
  }

  if (include.some(keyword => name.includes(keyword))) {
    return true
  }

  return false
}

// Exact-name indexes. Names are checked against the wiki /mapping; matching is
// case-insensitive so a wiki capitalisation change doesn't silently empty them.
const exactNameFilter = names => {
  const wanted = new Set(names.map(n => n.toLowerCase()))
  return item => Boolean(item?.name) && wanted.has(item.name.toLowerCase())
}

// Major raid uniques: Chambers of Xeric, Theatre of Blood, Tombs of Amascut.
export const RAIDS_INDEX_ITEMS = Object.freeze([
  'Twisted bow', 'Kodai insignia', 'Elder maul', 'Dragon claws', 'Ancestral hat',
  'Ancestral robe top', 'Ancestral robe bottom', "Dinh's bulwark", 'Dragon hunter crossbow',
  'Twisted buckler', 'Dexterous prayer scroll', 'Arcane prayer scroll',
  'Scythe of Vitur (uncharged)', 'Ghrazi rapier', 'Sanguinesti staff (uncharged)',
  'Justiciar faceguard', 'Justiciar chestguard', 'Justiciar legguards', 'Avernic defender hilt',
  "Tumeken's shadow (uncharged)", "Osmumten's fang", 'Lightbearer', "Elidinis' ward",
  'Masori mask', 'Masori body', 'Masori chaps'
])

// Resources that are farmed heavily by bots.
export const BOT_FARM_INDEX_ITEMS = Object.freeze([
  "Zulrah's scales", 'Blue dragonhide', 'Green dragonhide', 'Black dragonhide', 'Dragon bones',
  'Wine of Zamorak', 'Yew logs', 'Magic logs', 'Raw shark', 'Raw anglerfish', 'Raw karambwan',
  'Raw lobster', 'Coal', 'Iron ore', 'Gold ore', 'Runite ore', 'Amethyst', 'Red chinchompa',
  'Black chinchompa', 'Snape grass', 'Limpwurt root', 'Cowhide', 'Flax', 'Bow string',
  'Pure essence', 'Grimy ranarr weed', 'Grimy snapdragon', 'Big bones', 'Feather'
])

export const raidsFilter = exactNameFilter(RAIDS_INDEX_ITEMS)
export const botFarmFilter = exactNameFilter(BOT_FARM_INDEX_ITEMS)
