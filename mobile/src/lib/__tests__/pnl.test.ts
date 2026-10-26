/// <reference types="node" />
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { profitChartGeometry } from '../pnl/chart.ts'
import { sampleJournal } from '../pnl/sample.ts'
import { csvToJournal, journalToCsv, parseCsvRows } from '../pnl/csv.ts'
import { holdVsLimit, losingItems, unrealized } from '../pnl/insights.ts'
import { flipProfit, MAX_GE_INT, mergeJournal, parseJournal, realize, saleTax, toFlip, type Flip, type ItemTaxOf, type Journal, type Lot } from '../pnl/journal.ts'
import { flipRoi, gpPerHour, holdHours, MIN_HOLD_HOURS } from '../pnl/metrics.ts'
import { bestAndWorst, dailyBars, itemLeaderboard, localDayStart, periodTotals, totals } from '../pnl/summary.ts'

// The real engine tax (2%, 5M cap, under-50 and exempt items), loaded by path
// because `@ge/engine` is a Metro alias that node can't resolve.
const enginePath = '../../../../src/domain/flipping/geTax.js'
const engine = await import(enginePath) as { geTax: ItemTaxOf, GE_TAX_CAP: number }
const taxOf: ItemTaxOf = (price, itemId) => engine.geTax(price, itemId)

const BOND = 13190 // Old school bond: tax-exempt
const WHIP = 4151
const HOUR = 3_600_000
const T0 = new Date(2026, 9, 20, 12, 0).getTime() // 20 Oct 2026, noon local

const lot = (over: Partial<Lot> = {}): Lot => ({
  id: 'lot-1', itemId: WHIP, name: 'Abyssal whip', icon: null, qty: 10, buyPrice: 1_500_000, boughtAt: T0, windowStart: T0, reminderId: null, ...over
})

const flip = (over: Partial<Flip> = {}): Flip => ({
  id: `f-${Math.random()}`, lotId: null, itemId: WHIP, name: 'Abyssal whip', icon: null, qty: 1, buyPrice: 100, sellPrice: 110, tax: 2, profit: 8, boughtAt: T0, soldAt: T0 + HOUR, ...over
})

describe('GE tax on a sale', () => {
  it('charges 2% per item, rounded down per item', () => {
    assert.equal(saleTax(1_550_000, 10, WHIP, taxOf), 31_000 * 10)
    assert.equal(saleTax(149, 3, WHIP, taxOf), 2 * 3) // 2.98 -> 2 each
  })
  it('exempts items sold under 50 gp, and charges from 50 gp', () => {
    assert.equal(saleTax(49, 1000, WHIP, taxOf), 0)
    assert.equal(saleTax(50, 1000, WHIP, taxOf), 1000)
  })
  it('exempts items on the wiki list', () => {
    assert.equal(saleTax(12_000_000, 2, BOND, taxOf), 0)
  })
  it('caps the tax at 5M per item', () => {
    assert.equal(saleTax(400_000_000, 1, 20997, taxOf), engine.GE_TAX_CAP)
    assert.equal(saleTax(400_000_000, 3, 20997, taxOf), 3 * engine.GE_TAX_CAP)
    assert.equal(saleTax(250_000_000, 1, 20997, taxOf), 5_000_000) // exactly at the cap
  })
})

describe('realizing a lot', () => {
  it('sells the whole lot with profit after tax', () => {
    const r = realize(lot(), 1_550_000, 10, T0 + 2 * HOUR, taxOf, 'f1')
    assert.ok(r)
    assert.equal(r.remaining, null)
    assert.equal(r.flip.tax, 310_000)
    assert.equal(r.flip.profit, (1_550_000 - 1_500_000) * 10 - 310_000)
    assert.equal(r.flip.lotId, 'lot-1')
    assert.equal(r.flip.boughtAt, T0)
  })
  it('sells part of a lot and keeps the rest open', () => {
    const r = realize(lot(), 1_600_000, 4, T0 + HOUR, taxOf, 'f1')
    assert.ok(r)
    assert.equal(r.flip.qty, 4)
    assert.deepEqual(r.remaining, { ...lot(), qty: 6 })
  })
  it('never sells more than is held', () => {
    assert.equal(realize(lot(), 1_600_000, 99, T0, taxOf, 'f1')?.flip.qty, 10)
  })
  it('rejects bad prices and amounts', () => {
    assert.equal(realize(lot(), 0, 1, T0, taxOf, 'f1'), null)
    assert.equal(realize(lot(), 1.5, 1, T0, taxOf, 'f1'), null)
    assert.equal(realize(lot(), MAX_GE_INT + 1, 1, T0, taxOf, 'f1'), null)
    assert.equal(realize(lot(), 100, 0, T0, taxOf, 'f1'), null)
  })
  it('a break-even sale before tax is a loss after it', () => {
    assert.ok((realize(lot(), 1_500_000, 10, T0, taxOf, 'f1')?.flip.profit ?? 0) < 0)
  })
  it('a tax-exempt item keeps the whole margin', () => {
    const r = realize(lot({ itemId: BOND, buyPrice: 11_000_000, qty: 2 }), 11_500_000, 2, T0, taxOf, 'f1')
    assert.equal(r?.flip.profit, 1_000_000)
  })
})

describe('per-flip metrics', () => {
  it('ROI, hold time and GP/h', () => {
    const f = flip({ qty: 10, buyPrice: 1000, sellPrice: 1100, tax: 220, profit: flipProfit(1000, 1100, 10, 220), soldAt: T0 + 2 * HOUR })
    assert.equal(f.profit, 780)
    assert.equal(flipRoi(f), 0.078)
    assert.equal(holdHours(f), 2)
    assert.equal(gpPerHour(f), 390)
  })
  it('clamps very short holds so GP/h stays sane', () => {
    assert.equal(gpPerHour(flip({ soldAt: T0 + 1000, profit: 100 })), 100 / MIN_HOLD_HOURS)
  })
  it('returns null where old records lack the data', () => {
    const old = flip({ buyPrice: null, sellPrice: null, tax: null, boughtAt: null })
    assert.equal(flipRoi(old), null)
    assert.equal(holdHours(old), null)
    assert.equal(gpPerHour(old), null)
  })
})

describe('stored data migration', () => {
  it('reads version 1 holdings and sales into the journal', () => {
    const v1 = {
      holdings: [{ id: 'h1', itemId: WHIP, name: 'Abyssal whip', icon: 'Abyssal whip.png', qty: 2, buyPrice: 1_500_000, boughtAt: T0 }],
      sales: [
        { itemId: WHIP, name: 'Abyssal whip', qty: 1, profit: 20_000, soldAt: T0 + HOUR },
        { itemId: WHIP, name: 'Abyssal whip', qty: 1, profit: -5_000, soldAt: T0 + 2 * HOUR },
        { itemId: -1, name: 'bad', qty: 1, profit: 1, soldAt: T0 }
      ]
    }
    const j = parseJournal(v1)
    assert.equal(j.lots.length, 1)
    assert.equal(j.lots[0].windowStart, T0)
    assert.equal(j.flips.length, 2)
    assert.equal(j.flips[0].soldAt, T0 + 2 * HOUR) // newest first
    assert.equal(j.flips[0].buyPrice, null)
    assert.equal(j.flips[0].profit, -5_000)
    assert.notEqual(j.flips[0].id, j.flips[1].id)
    // Stable ids, so loading twice doesn't make different records.
    assert.deepEqual(parseJournal(v1).flips.map(f => f.id), j.flips.map(f => f.id))
  })
  it('round-trips the version 2 shape', () => {
    const j: Journal = { lots: [lot()], flips: [flip({ id: 'a' })] }
    assert.deepEqual(parseJournal(JSON.parse(JSON.stringify(j))), j)
  })
  it('recomputes profit of complete records from their prices', () => {
    const f = toFlip({ ...flip(), profit: 999_999 }, 'x')
    assert.equal(f?.profit, 8)
  })
  it('survives garbage', () => {
    assert.deepEqual(parseJournal(null), { lots: [], flips: [] })
    assert.deepEqual(parseJournal({ flips: 'nope', lots: [1, null] }), { lots: [], flips: [] })
  })
  it('does not reopen a lot that was sold here, and dedupes inside the restore', () => {
    const base: Journal = { lots: [], flips: [flip({ id: 'a', lotId: 'lot-1' })] }
    const r = mergeJournal(base, { lots: [lot()], flips: [flip({ id: 'b' }), flip({ id: 'b' })] })
    assert.equal(r.addedLots, 0)
    assert.equal(r.addedFlips, 1)
    assert.equal(r.journal.flips.length, 2)
  })
  it('keeps an open, partly sold lot when restoring onto an empty phone', () => {
    const r = mergeJournal({ lots: [], flips: [] }, { lots: [lot({ qty: 4 })], flips: [flip({ id: 'p', lotId: 'lot-1' })] })
    assert.equal(r.addedLots, 1)
  })
  it('merges without duplicating ids', () => {
    const base: Journal = { lots: [lot()], flips: [flip({ id: 'a' })] }
    const r = mergeJournal(base, { lots: [lot(), lot({ id: 'lot-2' })], flips: [flip({ id: 'a' }), flip({ id: 'b' })] })
    assert.equal(r.addedLots, 1)
    assert.equal(r.addedFlips, 1)
    assert.equal(r.skipped, 2)
    assert.equal(r.journal.flips.length, 2)
  })
})

describe('totals and periods', () => {
  const now = new Date(2026, 9, 26, 15, 0).getTime()
  const day = (n: number, hour = 10) => new Date(2026, 9, 26 - n, hour).getTime()
  const flips = [
    flip({ soldAt: day(0), profit: 100, tax: 5 }),
    flip({ soldAt: day(1), profit: -40, tax: 3 }),
    flip({ soldAt: day(6), profit: 200, tax: 4 }),
    flip({ soldAt: day(7), profit: 50 }),
    flip({ soldAt: day(40), profit: 1000, buyPrice: null, tax: null })
  ]
  it('counts today, 7 days, 30 days and all time by local calendar day', () => {
    const p = periodTotals(flips, now)
    assert.equal(p.today.profit, 100)
    assert.equal(p['7d'].profit, 260)
    assert.equal(p['30d'].profit, 310)
    assert.equal(p.all.profit, 1310)
    assert.equal(p['7d'].wins, 2)
    assert.equal(p['7d'].taxPaid, 12)
  })
  it('ROI only uses flips with a known cost', () => {
    const t = totals(flips)
    assert.equal(t.roi, 310 / 400)
  })
  it('daily bars run oldest to today with a running total', () => {
    const bars = dailyBars(flips, 7, now)
    assert.equal(bars.length, 7)
    assert.equal(bars[6].dayStart, localDayStart(now))
    assert.deepEqual(bars.map(b => b.profit), [200, 0, 0, 0, 0, -40, 100])
    assert.deepEqual(bars.map(b => b.cumulative), [200, 200, 200, 200, 200, 160, 260])
  })
  it('best and worst flips', () => {
    const { best, worst } = bestAndWorst(flips)
    assert.equal(best?.profit, 1000)
    assert.equal(worst?.profit, -40)
    assert.deepEqual(bestAndWorst([]), { best: null, worst: null })
    assert.equal(bestAndWorst([flips[0]]).worst, null)
  })
})

describe('item leaderboard and insights', () => {
  const flips = [
    flip({ itemId: 1, name: 'A', profit: 500, soldAt: T0 + 1 * HOUR }),
    flip({ itemId: 1, name: 'A', profit: -100, soldAt: T0 + 6 * HOUR }),
    flip({ itemId: 2, name: 'B', profit: -50, soldAt: T0 + 2 * HOUR }),
    flip({ itemId: 2, name: 'B', profit: -70, soldAt: T0 + 3 * HOUR }),
    flip({ itemId: 2, name: 'B', profit: 20, soldAt: T0 + 1 * HOUR }),
    flip({ itemId: 3, name: 'C', profit: -900, soldAt: T0 + HOUR })
  ]
  it('ranks items by profit with count, win rate and average hold', () => {
    const board = itemLeaderboard(flips)
    assert.deepEqual(board.map(r => r.name), ['A', 'B', 'C'])
    assert.equal(board[0].flips, 2)
    assert.equal(board[0].winRate, 0.5)
    assert.equal(board[0].avgHoldHours, 3.5)
    assert.equal(board[1].avgProfit, -100 / 3)
  })
  it('flags items with negative expectancy once there are enough flips', () => {
    assert.deepEqual(losingItems(flips).map(r => r.name), ['B'])
    assert.deepEqual(losingItems(flips, 1).map(r => r.name), ['C', 'B'])
  })
  it('compares hold time with the 4h buy-limit window', () => {
    const h = holdVsLimit(flips)
    assert.equal(h.counted, 6)
    assert.equal(h.overWindowShare, 1 / 6)
    assert.equal(h.avgProfitOver, -100)
    assert.equal(h.medianHours, 1.5)
    assert.equal(holdVsLimit([flip({ boughtAt: null })]).avgHours, null)
  })
  it('marks open lots at the instant-sell price after tax', () => {
    const lots = [lot({ qty: 2, buyPrice: 1000 }), lot({ id: 'l2', itemId: BOND, qty: 1, buyPrice: 10_000_000 }), lot({ id: 'l3', itemId: 99 })]
    const prices: Record<number, number> = { [WHIP]: 1100, [BOND]: 10_500_000 }
    const u = unrealized(lots, id => prices[id] ?? null, taxOf)
    assert.equal(u.profit, (1100 - 22 - 1000) * 2 + 500_000)
    assert.equal(u.priced, 2)
    assert.equal(u.unpriced, 1)
  })
})

describe('CSV export and restore', () => {
  const journal: Journal = {
    lots: [lot({ name: 'Black d\'hide body, "blessed"' })],
    flips: [
      flip({ id: 'a', lotId: 'lot-0', name: '=HYPERLINK("x")', qty: 3, buyPrice: 100, sellPrice: 120, tax: 6, profit: 54 }),
      flip({ id: 'b', buyPrice: null, sellPrice: null, tax: null, boughtAt: null, profit: -77 })
    ]
  }
  const now = T0 + 10 * HOUR

  it('round-trips the journal, including quotes, commas and old records', () => {
    const back = csvToJournal(journalToCsv(journal), taxOf, now)
    assert.ok(!('error' in back))
    assert.deepEqual(back.journal.lots, journal.lots)
    assert.deepEqual(back.journal.flips, journal.flips)
    assert.equal(back.badRows, 0)
  })
  it('stops spreadsheets running names as formulas', () => {
    assert.ok(journalToCsv(journal).includes('"\'=HYPERLINK(""x"")"'))
  })
  it('parses quoted newlines and CRLF', () => {
    assert.deepEqual(parseCsvRows('a,"b\r\nc",d\r\n1,2,3\n'), [['a', 'b\r\nc', 'd'], ['1', '2', '3']])
  })
  it('finds columns by name and recomputes profit from edited prices', () => {
    const csv = 'sold_at,qty,item_id,record,name,buy_price,sell_price\n2026-10-20T14:00:00Z,10,4151,flip,Whip,1000,1100\n'
    const r = csvToJournal(csv, taxOf, now)
    assert.ok(!('error' in r))
    assert.equal(r.journal.flips[0].tax, 220)
    assert.equal(r.journal.flips[0].profit, 780)
  })
  it('skips and reports bad rows but keeps good ones', () => {
    const csv = [
      'record,item_id,name,qty,buy_price,sell_price,profit,sold_at,bought_at',
      'flip,4151,Whip,1,100,110,,2026-10-20T14:00:00Z,',
      'flip,4151,Whip,0,100,110,,2026-10-20T14:00:00Z,',
      'flip,4151,Whip,1,,,,1999-01-01T00:00:00Z,',
      'open,4151,Whip,5,100,,,,',
      'sold,4151,Whip,1,1,1,1,2026-10-20T14:00:00Z,'
    ].join('\n')
    const r = csvToJournal(csv, taxOf, now)
    assert.ok(!('error' in r))
    assert.equal(r.journal.flips.length, 1)
    assert.equal(r.badRows, 4)
    assert.equal(r.errors.length, 4)
    assert.match(r.errors[0], /^Row 2/)
  })
  it('reads thousands separators', () => {
    const r = csvToJournal('record,item_id,name,qty,buy_price,sell_price,sold_at\nflip,4151,Whip,"1,000",100,110,2026-10-20T14:00:00Z\n', taxOf, now)
    assert.ok(!('error' in r))
    assert.equal(r.journal.flips[0].qty, 1000)
  })
  it('rejects files that are not exports', () => {
    assert.ok('error' in csvToJournal('', taxOf, now))
    assert.ok('error' in csvToJournal('date,amount\n1,2', taxOf, now))
  })
  it('re-importing an export adds nothing new', () => {
    const back = csvToJournal(journalToCsv(journal), taxOf, now)
    assert.ok(!('error' in back))
    assert.equal(mergeJournal(journal, back.journal).skipped, 3)
  })
})

describe('profit chart geometry', () => {
  const day = (profit: number, cumulative: number) => ({ dayStart: 0, profit, flips: 1, cumulative })
  it('puts winning days above the zero line and losing days below', () => {
    const g = profitChartGeometry([day(100, 100), day(-50, 50), day(0, 50)], 300, 100, 0)
    assert.ok(Math.abs(g.zeroY - 100 * (100 / 150)) < 1e-9)
    assert.equal(g.bars[0].y + g.bars[0].height, g.zeroY)
    assert.equal(g.bars[0].loss, false)
    assert.equal(g.bars[1].y, g.zeroY)
    assert.equal(g.bars[1].loss, true)
    assert.equal(g.bars[2].height, 0)
    assert.ok(g.linePath.startsWith('M50.0,'))
  })
  it('handles no data, all-zero days and no width', () => {
    assert.equal(profitChartGeometry([], 300, 100).bars.length, 0)
    assert.equal(profitChartGeometry([day(0, 0)], 0, 100).linePath, '')
    const flat = profitChartGeometry([day(0, 0), day(0, 0)], 100, 50)
    assert.ok(flat.bars.every(b => b.height === 0 && Number.isFinite(b.y)))
  })
})

describe('sample flips', () => {
  it('are valid journal records, stable between runs, and span the window', () => {
    const now = new Date(2026, 9, 26, 15).getTime()
    const a = sampleJournal(now, taxOf)
    assert.deepEqual(parseJournal(JSON.parse(JSON.stringify(a))), a)
    assert.deepEqual(sampleJournal(now, taxOf), a)
    assert.ok(a.flips.length > 30)
    assert.ok(a.flips.every(f => f.soldAt < now && (f.boughtAt ?? 0) <= f.soldAt))
    assert.ok(a.flips.some(f => f.profit < 0) && a.flips.some(f => f.profit > 0))
  })
})
