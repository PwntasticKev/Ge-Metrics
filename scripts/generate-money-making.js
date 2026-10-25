#!/usr/bin/env node
// Regenerates src/domain/flipping/data/moneyMakingRecipes.js from the OSRS
// Wiki's money making guides.
//
// Every "Money making guide/..." page uses the {{Mmgtable}} template with
// structured inputs, outputs and actions per hour. We keep the guides where
// everything you spend and everything you get is tradeable on the Grand
// Exchange (plus coins paid to NPCs), so the app can price them live.
//
//   node scripts/generate-money-making.js

import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const USER_AGENT = 'GE-Metrics money making generator (https://ge-metrics.com)'
const API = 'https://oldschool.runescape.wiki/api.php'
const MAPPING_URL = 'https://prices.runescape.wiki/api/v1/osrs/mapping'
const PREFIX = 'Money making guide/'
const TITLES_PER_REQUEST = 50
const MIN_EXPECTED_METHODS = 40
const OUTPUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/domain/flipping/data/moneyMakingRecipes.js')

// Guides in these categories are about turning bought items into sellable ones.
const KEPT_CATEGORIES = new Set(['processing', 'skilling', 'collecting', 'recurring'])

async function getJson (url) {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!response.ok) throw new Error(`${url} returned ${response.status}`)
  return response.json()
}

async function listGuideTitles () {
  const titles = []
  let cont = {}
  do {
    const params = new URLSearchParams({ action: 'query', list: 'allpages', apprefix: PREFIX, aplimit: 'max', format: 'json', ...cont })
    const body = await getJson(`${API}?${params}`)
    titles.push(...body.query.allpages.map(p => p.title))
    cont = body.continue ?? null
  } while (cont)
  return titles.filter(t => t.length > PREFIX.length)
}

async function fetchWikitext (titles) {
  const pages = []
  for (let i = 0; i < titles.length; i += TITLES_PER_REQUEST) {
    const params = new URLSearchParams({
      action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main', format: 'json', formatversion: '2',
      titles: titles.slice(i, i + TITLES_PER_REQUEST).join('|')
    })
    const body = await getJson(`${API}?${params}`)
    pages.push(...body.query.pages.filter(p => p.revisions).map(p => ({ title: p.title, text: p.revisions[0].slots.main.content })))
  }
  return pages
}

// "[[Grimy toadflax]]" / "[[Toadflax|toadflax]]" / "{{plink|X}}" -> plain text
export function cleanWikiText (value) {
  return value
    .replace(/<!--[\s\S]*?-->/g, '')
    // {{SCP|Herblore|50}} -> "Herblore 50"
    .replace(/\{\{SCP\|([^}|]+)\|?([^}|]*)[^}]*\}\}/gi, (_, skill, level) => `${skill} ${level}`.trim() + ', ')
    .replace(/\{\{(?:plink|plinkp|plinkt)\|([^}|]+)[^}]*\}\}/gi, '$1')
    .replace(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/'''?/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Parses the top-level |key = value fields of the first {{Mmgtable}}.
export function parseMmgtable (text) {
  const start = text.search(/\{\{\s*Mmgtable/i)
  if (start < 0) return null
  let depth = 0
  let end = start
  for (let i = start; i < text.length - 1; i++) {
    if (text[i] === '{' && text[i + 1] === '{') { depth++; i++ } else if (text[i] === '}' && text[i + 1] === '}') {
      depth--; i++
      if (depth === 0) { end = i; break }
    }
  }
  const body = text.slice(start, end + 1)
  const fields = {}
  let nest = 0
  let current = ''
  const flush = () => {
    const eq = current.indexOf('=')
    if (eq > 0) fields[current.slice(0, eq).trim().toLowerCase()] = current.slice(eq + 1).trim()
    current = ''
  }
  for (let i = 0; i < body.length; i++) {
    const two = body.slice(i, i + 2)
    if (two === '{{' || two === '[[') { nest++; current += two; i++; continue }
    if (two === '}}' || two === ']]') {
      nest--
      if (nest === 0) break // the template's own closing braces
      current += two
      i++
      continue
    }
    if (body[i] === '|' && nest === 1) { flush(); continue }
    current += body[i]
  }
  flush()
  return fields
}

// "{{SCP|Herblore|50}} * {{SCP|Magic|70}} (recommended)" -> "Herblore 50, Magic 70"
export function skillRequirements (value) {
  const skills = [...String(value ?? '').matchAll(/\{\{SCP\|([^}|]+)\|?(\d*)[^}]*\}\}/gi)].map(([, skill, level]) => `${skill.trim()} ${level}`.trim())
  return skills.length ? [...new Set(skills)].join(', ') : null
}

// Evaluates the plain arithmetic wiki editors use for quantities, e.g.
// "27*3", "1/4", "2.5*(1/1620)". Anything else (templates, "~50") is NaN.
export function evalQuantity (text) {
  const src = String(text ?? '').replace(/,/g, '').replace(/\s+/g, '')
  if (!/^[\d.+\-*/()]+$/.test(src)) return NaN
  let pos = 0
  const peek = () => src[pos]
  const number = () => {
    const match = src.slice(pos).match(/^\d*\.?\d+/)
    if (!match) throw new Error('number expected')
    pos += match[0].length
    return Number(match[0])
  }
  const factor = () => {
    if (peek() === '-') { pos++; return -factor() }
    if (peek() === '(') {
      pos++
      const v = expr()
      if (peek() !== ')') throw new Error(') expected')
      pos++
      return v
    }
    return number()
  }
  const term = () => {
    let v = factor()
    while (peek() === '*' || peek() === '/') v = src[pos++] === '*' ? v * factor() : v / factor()
    return v
  }
  const expr = () => {
    let v = term()
    while (peek() === '+' || peek() === '-') v = src[pos++] === '+' ? v + term() : v - term()
    return v
  }
  try {
    const v = expr()
    return pos === src.length ? v : NaN
  } catch {
    return NaN
  }
}

function numberOr (value, fallback) {
  const n = evalQuantity(value)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

const blank = value => value === undefined || cleanWikiText(String(value)) === ''

function collect (fields, kind) {
  const entries = []
  for (let i = 1; i <= 12; i++) {
    const name = fields[`${kind}${i}`]
    if (!name) continue
    const raw = fields[`${kind}${i}num`]
    const parsed = numberOr(raw, null)
    // A quantity like "~50" or "1-2" can't be priced; mark it so the guide is skipped.
    entries.push({ name: cleanWikiText(name), qty: parsed ?? 1, explicit: parsed !== null, unparseable: !blank(raw) && parsed === null })
  }
  return entries
}

export function toMethod (title, fields, idByName) {
  if (!fields || !KEPT_CATEGORIES.has(cleanWikiText(fields.category ?? '').toLowerCase())) return null
  const inputs = collect(fields, 'input')
  const outputs = collect(fields, 'output')
  if (!inputs.length || !outputs.length) return null

  if ([...inputs, ...outputs].some(e => e.unparseable)) return null
  const isCoins = e => /^coins?$/i.test(e.name)
  const coinTotal = list => list.filter(isCoins).reduce((t, e) => t + e.qty, 0)
  const resolve = list => list.filter(e => !isCoins(e)).map(e => {
    const id = idByName.get(e.name.toLowerCase())
    return id ? { id, qty: e.qty } : null
  })
  const resolvedInputs = resolve(inputs)
  const resolvedOutputs = resolve(outputs)
  const coinCost = coinTotal(inputs)
  const coinRevenue = coinTotal(outputs)
  // Every item must be tradeable; you need something to buy, and either an
  // item to sell or coins back (e.g. alching).
  if (resolvedInputs.includes(null) || resolvedOutputs.includes(null)) return null
  if (!resolvedInputs.length || (!resolvedOutputs.length && !coinRevenue)) return null

  const perAction = String(fields.isperkill ?? '').trim().toLowerCase() === 'y'
  // Per-hour guides list hourly quantities; without them we can't price it.
  if (!perAction && [...inputs, ...outputs].some(e => !e.explicit)) return null
  const name = title.slice(PREFIX.length)
  return {
    id: `mmg:${name}`,
    method: 'money-making',
    name,
    inputs: resolvedInputs,
    outputs: resolvedOutputs,
    coinCost,
    coinRevenue,
    // Per-hour guides are priced as one "action" per hour.
    actionsPerHour: perAction ? numberOr(fields.kph, null) : 1,
    skill: skillRequirements(fields.skill),
    members: /^y/i.test(cleanWikiText(fields.members ?? '')),
    location: cleanWikiText(fields.location ?? '') || null,
    source: `https://oldschool.runescape.wiki/w/${encodeURIComponent(title.replace(/ /g, '_'))}`
  }
}

async function main () {
  const [titles, mapping] = await Promise.all([listGuideTitles(), getJson(MAPPING_URL)])
  const counts = mapping.reduce((m, i) => m.set(i.name.toLowerCase(), (m.get(i.name.toLowerCase()) ?? 0) + 1), new Map())
  const idByName = new Map(mapping.filter(i => counts.get(i.name.toLowerCase()) === 1).map(i => [i.name.toLowerCase(), i.id]))
  const pages = await fetchWikitext(titles)
  const methods = pages
    .map(p => toMethod(p.title, parseMmgtable(p.text), idByName))
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name))

  if (methods.length < MIN_EXPECTED_METHODS) {
    throw new Error(`Only ${methods.length} usable guides (expected ${MIN_EXPECTED_METHODS}+); the wiki template may have changed. Not overwriting.`)
  }
  const header = `// Generated by scripts/generate-money-making.js from ${titles.length} OSRS Wiki money making guides. Do not edit.\n`
  await writeFile(OUTPUT, `${header}export default ${JSON.stringify(methods, null, 2)}\n`)
  console.log(`Wrote ${methods.length} GE-priced methods (of ${pages.length} guides) to ${path.relative(process.cwd(), OUTPUT)}`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error)
    process.exit(1)
  })
}
