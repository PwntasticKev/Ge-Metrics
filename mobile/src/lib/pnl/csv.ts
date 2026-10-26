// The journal as CSV, for spreadsheets and for restoring on another phone.
// One row per completed flip ("flip") and per open lot ("open").

import { flipProfit, isGeInt, saleTax, type Flip, type ItemTaxOf, type Journal, type Lot } from './journal.ts'

export const CSV_COLUMNS = ['record', 'id', 'lot_id', 'item_id', 'name', 'qty', 'buy_price', 'sell_price', 'tax', 'profit', 'bought_at', 'sold_at', 'icon'] as const
type Column = typeof CSV_COLUMNS[number]
const REQUIRED: readonly Column[] = ['record', 'item_id', 'name', 'qty']

export const MAX_CSV_CHARS = 10_000_000
export const MAX_CSV_ROWS = 50_000
/** Old School's GE opened in 2013; anything earlier is a typo. */
const EARLIEST_MS = Date.UTC(2013, 0, 1)
const FUTURE_SLACK_MS = 24 * 3_600_000

// Cells a spreadsheet would run as a formula get a leading apostrophe.
const FORMULA_START = /^[=+\-@\t\r]/

function cell (value: string | number | null): string {
  if (value === null) return ''
  const text = typeof value === 'number' ? String(value) : (FORMULA_START.test(value) ? `'${value}` : value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

const iso = (ms: number | null) => (ms === null ? null : new Date(ms).toISOString())

function flipRow (f: Flip): string {
  return [
    'flip', f.id, f.lotId, f.itemId, f.name, f.qty, f.buyPrice, f.sellPrice, f.tax, f.profit, iso(f.boughtAt), iso(f.soldAt), f.icon
  ].map(cell).join(',')
}

function lotRow (l: Lot): string {
  return ['open', l.id, l.id, l.itemId, l.name, l.qty, l.buyPrice, null, null, null, iso(l.boughtAt), null, l.icon].map(cell).join(',')
}

/** Open lots first, then flips newest first. CRLF line ends, as RFC 4180 asks. */
export function journalToCsv (journal: Journal): string {
  return [CSV_COLUMNS.join(','), ...journal.lots.map(lotRow), ...journal.flips.map(flipRow)].join('\r\n') + '\r\n'
}

/** RFC 4180 rows: quoted cells, doubled quotes, commas and newlines inside quotes. */
export function parseCsvRows (text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++ } else if (ch === '"') quoted = false
      else field += ch
    } else if (ch === '"' && field === '') quoted = true
    else if (ch === ',') { row.push(field); field = '' } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += ch
  }
  if (field !== '' || row.length) rows.push([...row, field])
  return rows.filter(r => r.some(c => c.trim() !== ''))
}

export interface CsvImport {
  journal: Journal
  /** "Row 4: bad quantity" style messages (data rows, from 1), first few only. */
  errors: string[]
  badRows: number
}

const MAX_ERRORS = 5

type Cells = Partial<Record<Column, string>>

const unescape = (s: string) => (s.startsWith('\'') && FORMULA_START.test(s.slice(1)) ? s.slice(1) : s).trim()
// Thousands separators from spreadsheets ("1,234", "1 234") are dropped.
const optInt = (s: string | undefined) => (s ? Number(s.replace(/[_,\s]/g, '')) : null)

function readTime (s: string | undefined, now: number): number | null {
  if (!s) return null
  const ms = /^\d+$/.test(s) ? Number(s) : Date.parse(s)
  return Number.isFinite(ms) && ms >= EARLIEST_MS && ms <= now + FUTURE_SLACK_MS ? ms : null
}

function readLot (c: Cells, line: number, now: number): Lot | string {
  const itemId = optInt(c.item_id)
  const qty = optInt(c.qty)
  const buyPrice = optInt(c.buy_price)
  const boughtAt = readTime(c.bought_at, now)
  if (!isGeInt(itemId) || !isGeInt(qty) || !isGeInt(buyPrice)) return `Row ${line}: open lot needs item_id, qty and buy_price`
  if (boughtAt === null) return `Row ${line}: open lot needs a valid bought_at`
  const id = c.id || `import-lot-${itemId}-${boughtAt}-${line}`
  return { id, itemId, name: c.name || `Item ${itemId}`, icon: c.icon || null, qty, buyPrice, boughtAt, windowStart: boughtAt, reminderId: null }
}

function readFlip (c: Cells, line: number, now: number, taxOf: ItemTaxOf): Flip | string {
  const itemId = optInt(c.item_id)
  const qty = optInt(c.qty)
  const soldAt = readTime(c.sold_at, now)
  if (!isGeInt(itemId) || !isGeInt(qty)) return `Row ${line}: flip needs item_id and qty`
  if (soldAt === null) return `Row ${line}: flip needs a valid sold_at`
  const buyRaw = optInt(c.buy_price)
  const sellRaw = optInt(c.sell_price)
  const buyPrice = isGeInt(buyRaw) ? buyRaw : null
  const sellPrice = isGeInt(sellRaw) ? sellRaw : null
  const taxCell = optInt(c.tax)
  let tax = taxCell !== null && Number.isFinite(taxCell) && taxCell >= 0 ? taxCell : null
  let profit = optInt(c.profit)
  if (buyPrice !== null && sellPrice !== null) {
    // Prices win over a stale profit cell, so edits in a spreadsheet stick.
    tax = tax ?? saleTax(sellPrice, qty, itemId, taxOf)
    profit = flipProfit(buyPrice, sellPrice, qty, tax)
  }
  if (profit === null || !Number.isFinite(profit)) return `Row ${line}: flip needs buy_price and sell_price, or profit`
  const boughtAt = readTime(c.bought_at, now)
  return {
    id: c.id || `import-${itemId}-${soldAt}-${line}`,
    lotId: c.lot_id || null,
    itemId,
    name: c.name || `Item ${itemId}`,
    icon: c.icon || null,
    qty,
    buyPrice,
    sellPrice,
    tax,
    profit,
    boughtAt: boughtAt !== null && boughtAt <= soldAt ? boughtAt : null,
    soldAt
  }
}

/**
 * Reads an exported (or hand-made) CSV. Columns are found by header name, so
 * order doesn't matter. Bad rows are skipped and reported; good ones kept.
 */
export function csvToJournal (text: string, taxOf: ItemTaxOf, now: number): CsvImport | { error: string } {
  if (text.length > MAX_CSV_CHARS) return { error: 'That file is too big to be a GE Metrics export.' }
  const rows = parseCsvRows(text.replace(/^﻿/, ''))
  if (!rows.length) return { error: 'The file is empty.' }
  const header = rows[0].map(h => h.trim().toLowerCase())
  const missing = REQUIRED.filter(col => !header.includes(col))
  if (missing.length) return { error: `Not a GE Metrics export: missing ${missing.join(', ')} column${missing.length > 1 ? 's' : ''}.` }
  if (rows.length - 1 > MAX_CSV_ROWS) return { error: `Too many rows (over ${MAX_CSV_ROWS.toLocaleString('en-US')}).` }

  const lots: Lot[] = []
  const flips: Flip[] = []
  const errors: string[] = []
  let badRows = 0
  rows.slice(1).forEach((row, i) => {
    const line = i + 1
    const cells: Cells = Object.fromEntries(header.map((h, j) => [h, unescape(row[j] ?? '')]))
    const kind = (cells.record ?? '').toLowerCase()
    const result = kind === 'open' ? readLot(cells, line, now) : kind === 'flip' ? readFlip(cells, line, now, taxOf) : `Row ${line}: record must be "flip" or "open"`
    if (typeof result === 'string') {
      badRows++
      if (errors.length < MAX_ERRORS) errors.push(result)
    } else if ('soldAt' in result) flips.push(result)
    else lots.push(result)
  })
  return { journal: { lots, flips }, errors, badRows }
}
