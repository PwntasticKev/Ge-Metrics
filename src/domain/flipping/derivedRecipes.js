// Recipes generated from item names in the wiki mapping, so new potions and
// herbs are picked up automatically when Jagex adds them.

const VIAL_OF_WATER = 'Vial of water'
const DOSE_PATTERN = /^(.+)\((\d)\)$/
// Charged jewellery and waterskins also end in "(n)" but can't be decanted, and
// Bob Barter doesn't decant barbarian mixes.
const NOT_DECANTABLE = /(necklace|ring|bracelet|amulet|pendant|waterskin|glory|dueling|burning|skills|games|mix)/i

const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b))

function byLowerName (items) {
  return new Map(items.map(item => [item.name.toLowerCase(), item]))
}

// Decanting at Bob Barter (Grand Exchange) is free: any doses of a potion can
// be repoured into any other dose size. One recipe per (from, to) dose pair,
// sized so the dose counts match exactly, e.g. 4 x (3) -> 3 x (4).
export function decantingRecipes (items) {
  const families = new Map()
  for (const item of items) {
    const match = item.name.match(DOSE_PATTERN)
    if (!match || NOT_DECANTABLE.test(item.name)) continue
    const [, base, dose] = match
    const doses = Number(dose)
    if (doses < 1 || doses > 4) continue
    families.set(base, { ...(families.get(base) ?? {}), [doses]: item })
  }

  const recipes = []
  for (const [base, byDose] of families) {
    const doseSizes = Object.keys(byDose).map(Number)
    if (doseSizes.length < 2) continue
    for (const from of doseSizes) {
      for (const to of doseSizes) {
        if (from === to) continue
        const g = gcd(from, to)
        recipes.push({
          id: `decant:${byDose[from].id}:${byDose[to].id}`,
          method: 'decanting',
          name: `${base} (${from} → ${to})`,
          inputs: [{ id: byDose[from].id, qty: to / g }],
          outputs: [{ id: byDose[to].id, qty: from / g }],
          coinCost: 0
        })
      }
    }
  }
  return recipes
}

// "Grimy ranarr weed" -> "Ranarr weed". Cleaning needs only Herblore.
export function herbCleaningRecipes (items) {
  const byName = byLowerName(items)
  return items.flatMap(item => {
    if (!item.name.startsWith('Grimy ')) return []
    const clean = byName.get(item.name.slice('Grimy '.length).toLowerCase())
    return clean
      ? [{ id: `clean:${item.id}`, method: 'herb-cleaning', name: clean.name, inputs: [{ id: item.id, qty: 1 }], outputs: [{ id: clean.id, qty: 1 }], coinCost: 0 }]
      : []
  })
}

// Clean herb + vial of water -> "<Herb> potion (unf)". The herb is the clean
// herb (it has a grimy version) whose name starts with the potion's prefix,
// e.g. "Ranarr potion (unf)" <- "Ranarr weed".
export function unfinishedPotionRecipes (items) {
  const byName = byLowerName(items)
  const vial = byName.get(VIAL_OF_WATER.toLowerCase())
  if (!vial) return []
  const herbs = items.filter(item => byName.has(`grimy ${item.name.toLowerCase()}`))

  return items.flatMap(item => {
    const match = item.name.match(/^(.+) potion \(unf\)$/i)
    if (!match) return []
    const prefix = match[1].toLowerCase()
    const herb = herbs.find(h => h.name.toLowerCase() === prefix || h.name.toLowerCase().startsWith(`${prefix} `))
    return herb
      ? [{ id: `unf:${item.id}`, method: 'unfinished-potions', name: item.name, inputs: [{ id: herb.id, qty: 1 }, { id: vial.id, qty: 1 }], outputs: [{ id: item.id, qty: 1 }], coinCost: 0 }]
      : []
  })
}
