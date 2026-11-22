#!/usr/bin/env node
// Regenerates src/domain/flipping/data/wikiCombinations.js: every OSRS Wiki
// recipe that turns GE-tradeable items (plus an optional coin fee, e.g. an NPC
// like Madam Sikaro making a Voidwaker for 500k) into one GE-tradeable item.
//
// Kept: one output item, and either worth >= MIN_VALUE or made for a coin fee
// (NPC conversions). Bulk skilling recipes live on the Recipes page instead.
//
//   node scripts/generate-wiki-combinations.js

import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import processingMethods from '../src/domain/flipping/data/processingMethods.js'

const USER_AGENT = 'GE-Metrics combination generator (https://ge-metrics.com)'
const API = 'https://oldschool.runescape.wiki/api.php'
const MAPPING_URL = 'https://prices.runescape.wiki/api/v1/osrs/mapping'
const PAGE_SIZE = 5000
const MIN_VALUE = 100_000
const MIN_EXPECTED = 50
const DATA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/domain/flipping/data')
const OUTPUT = path.join(DATA_DIR, 'wikiCombinations.js')
const POTIONS_OUTPUT = path.join(DATA_DIR, 'wikiPotions.js')
const MIN_EXPECTED_POTIONS = 30

async function getJson (url) {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!response.ok) throw new Error(`${url} returned ${response.status}`)
  return response.json()
}

async function allRecipes () {
  const rows = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const query = `bucket('recipe').select('page_name','production_json').limit(${PAGE_SIZE}).offset(${offset}).run()`
    const page = await getJson(`${API}?action=bucket&format=json&query=${encodeURIComponent(query)}`)
    rows.push(...page.bucket)
    if (page.bucket.length < PAGE_SIZE) return rows
  }
}

const isCoins = name => /^coins$/i.test(name.trim())

// One wiki production entry -> combination, or null if anything isn't on the GE.
export function toCombination ({ page_name: page, production_json: json }, byName) {
  let production
  try { production = JSON.parse(json) } catch { return null }
  const output = production.output?.name && byName.get(production.output.name.toLowerCase())
  if (!output || Number(production.output.quantity || 1) !== 1) return null

  let fee = 0
  const counts = new Map()
  for (const material of production.materials ?? []) {
    const qty = Number(material.quantity)
    if (!Number.isFinite(qty) || qty <= 0) return null
    if (isCoins(material.name)) { fee += qty; continue }
    const item = byName.get(material.name.toLowerCase())
    if (!item || item.id === output.id) return null
    counts.set(item.id, (counts.get(item.id) ?? 0) + qty)
  }
  if (!counts.size) return null

  const value = Number(production.output.cost) || 0
  if (value < MIN_VALUE && fee === 0) return null

  const skills = (production.skills ?? []).filter(s => s.name && s.level).map(s => `${s.name} ${s.level}`).join(', ')
  const facility = String(production.facilities ?? '').split('|')[0].trim()
  return {
    name: output.name,
    setId: output.id,
    parts: [...counts].map(([id, qty]) => ({ id, qty })).sort((a, b) => a.id - b.id),
    conversionCost: fee,
    via: facility || null,
    skills: skills || null,
    source: `https://oldschool.runescape.wiki/w/${encodeURIComponent(page.replace(/ /g, '_'))}`
  }
}

const partsKey = c => `${c.setId}:${c.parts.map(p => `${p.id}x${p.qty}`).join(',')}:${c.via}`

// Same item, parts and NPC at several fees (diary discounts): keep the full
// price everyone pays. A free skilling route and an NPC route both stay.
export function dedupe (combinations) {
  const best = new Map()
  for (const c of combinations) {
    const key = partsKey(c)
    if (!best.has(key) || c.conversionCost > best.get(key).conversionCost) best.set(key, c)
  }
  return [...best.values()].sort((a, b) => a.name.localeCompare(b.name) || a.conversionCost - b.conversionCost)
}

// Finished Herblore potions (unf potion + secondary, or other mixes): every
// part and the potion are on the GE and no coins change hands. Unfinished
// potions are derived elsewhere from herb names.
export function toPotion ({ page_name: page, production_json: json }, byName) {
  let production
  try { production = JSON.parse(json) } catch { return null }
  const herblore = (production.skills ?? []).find(s => s.name === 'Herblore')
  if (!herblore) return null
  const output = production.output?.name && byName.get(production.output.name.toLowerCase())
  if (!output || !/\(\d\)$/.test(output.name) || /\(unf\)/i.test(output.name)) return null
  const outputQty = Number(production.output.quantity || 1)
  const inputs = []
  for (const material of production.materials ?? []) {
    const qty = Number(material.quantity)
    const item = byName.get(String(material.name).toLowerCase())
    if (!item || isCoins(material.name) || !Number.isFinite(qty) || qty <= 0 || item.id === output.id) return null
    inputs.push({ id: item.id, qty })
  }
  if (!inputs.length || !Number.isFinite(outputQty) || outputQty <= 0) return null
  return {
    name: output.name,
    inputs: inputs.sort((a, b) => a.id - b.id),
    outputs: [{ id: output.id, qty: outputQty }],
    skills: `Herblore ${herblore.level}`,
    source: `https://oldschool.runescape.wiki/w/${encodeURIComponent(page.replace(/ /g, '_'))}`
  }
}

const potionKey = p => `${p.outputs[0].id}x${p.outputs[0].qty}:${p.inputs.map(i => `${i.id}x${i.qty}`).join(',')}`

export function uniquePotions (potions) {
  const unique = new Map(potions.map(p => [potionKey(p), p]))
  return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name))
}

async function main () {
  const [rows, mapping] = await Promise.all([allRecipes(), getJson(MAPPING_URL)])
  const byName = new Map(mapping.map(item => [item.name.toLowerCase(), item]))
  // Processing outputs (sawmill planks, tablets, ...) are ranked per hour on the Recipes page.
  const processed = new Set(processingMethods.flatMap(m => m.recipes.flatMap(r => r.outputs.map(o => o.id))))
  const combinations = dedupe(rows.map(row => toCombination(row, byName)).filter(c => c && !processed.has(c.setId)))
  if (combinations.length < MIN_EXPECTED) throw new Error(`Only ${combinations.length} combinations found; not overwriting.`)

  const header = '// Generated by scripts/generate-wiki-combinations.js from OSRS Wiki recipes. Do not edit.\n' +
    '// One GE-tradeable item made from GE-tradeable parts, plus any coin fee (NPC conversions).\n'
  await writeFile(OUTPUT, `${header}export default ${JSON.stringify(combinations, null, 2)}\n`)
  console.log(`Wrote ${combinations.length} combinations to ${path.relative(process.cwd(), OUTPUT)}`)

  const potions = uniquePotions(rows.map(row => toPotion(row, byName)).filter(Boolean))
  if (potions.length < MIN_EXPECTED_POTIONS) throw new Error(`Only ${potions.length} potions found; not overwriting.`)
  await writeFile(POTIONS_OUTPUT, '// Generated by scripts/generate-wiki-combinations.js from OSRS Wiki Herblore recipes. Do not edit.\n' +
    `export default ${JSON.stringify(potions, null, 2)}\n`)
  console.log(`Wrote ${potions.length} potions to ${path.relative(process.cwd(), POTIONS_OUTPUT)}`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error)
    process.exit(1)
  })
}
