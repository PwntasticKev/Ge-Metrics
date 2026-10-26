// The MCP server's flip pickers, replayed at decision time with the same
// analysis code the tools call (src/tools/plan.ts, opportunities.ts,
// scanner.ts); only the data source differs (a MarketView instead of live
// endpoints). Short lists are re-priced from hourly series, as the tools do.

import { geTax } from '@ge/engine'
import { findDips } from '../../analysis/dips.js'
import { type Candidate, bulkCandidate, refineCandidate } from '../../analysis/fills/candidates.js'
import { type FillAwareRow, bulkRows, rankRows, refineRows } from '../../analysis/fills/flipRows.js'
import { ASSUMED_BUY_LIMIT, type FillMetrics } from '../../analysis/fills/metrics.js'
import { planFlips, planValue } from '../../analysis/fills/plan.js'
import { dipFill, quoteFill } from '../../analysis/fills/scanFills.js'
import { topFlips } from '../../analysis/flips.js'
import { keepMarginRow, marginRow } from '../../analysis/scanner/report.js'
import { screenSpreads } from '../../analysis/scanner/spreadScan.js'
import type { MappingEntry } from '../../wiki/types.js'
import type { MarketView } from '../view.js'
import { pumpIds } from './app.js'
import { type DecideInput, type Pick, type Strategy, allocateInOrder } from './types.js'

const tax = (price: number, id: number) => geTax(price, id)
const SERIES_HOURS = 24
const WEEK_HOURS = 168
// Same short-list sizes as the tools.
const PLAN_POOL = 24
const TOP_REFINE = 15
const DIPS_REFINE = 15
const MARGIN_CHECK = 20

const seriesMap = (view: MarketView, ids: readonly number[], hours = SERIES_HOURS) =>
  new Map(ids.map(id => [id, view.series(id, hours)] as const))

function fromMetrics (item: MappingEntry, m: FillMetrics): Pick {
  return {
    id: item.id,
    name: item.name,
    buyAt: m.buyAt,
    sellAt: m.sellAt,
    qty: m.units,
    limit: item.limit ?? ASSUMED_BUY_LIMIT,
    predicted: { profit: m.realisticProfitPerLimit, buyHours: m.expectedFillHours.buy, sellHours: m.expectedFillHours.sell }
  }
}

export interface PlanVariant {
  readonly maxFillHours: number
  readonly minVolume: number
  /** false replays the pre-fix pricing (series ask not capped at the recent high). */
  readonly capSellAtRecent?: boolean
}

const preFix = (cap: boolean | undefined) => (cap === false ? { key: '-uncapped', label: ' (pre-fix: uncapped ask)' } : { key: '', label: '' })

export function planFlipsStrategy ({ maxFillHours, minVolume, capSellAtRecent }: PlanVariant): Strategy {
  const tag = preFix(capSellAtRecent)
  return {
    key: `plan_flips-${maxFillHours}h-v${minVolume}${tag.key}`,
    label: `plan_flips max_fill_hours=${maxFillHours} min_volume=${minVolume}${tag.label}`,
    lookbackHours: SERIES_HOURS,
    decide ({ view, cash, slots, exclude }: DecideInput): Pick[] {
      const pumps = pumpIds(view)
      const live = topFlips(view.market(), { minVolume, budget: cash, sort: 'profit_per_limit', limit: Number.MAX_SAFE_INTEGER, includeMembers: true, includeStale: false })
      const bulk = { latest: view.latest, h1: view.h1, h24: view.h24 }
      const pool = live
        .filter(f => !pumps.has(f.id) && !exclude.has(f.id))
        .flatMap(f => {
          const entry = view.mappingById.get(f.id)
          const c = entry ? bulkCandidate(entry, bulk, tax) : null
          return c ? [{ c, value: planValue(c, cash, maxFillHours) }] : []
        })
        .filter(x => x.value > 0)
        .sort((x, y) => y.value - x.value)
        .slice(0, PLAN_POOL)
        .map(x => x.c)
      const refined: Candidate[] = pool.map(c => refineCandidate(c, view.series(c.entry.id, SERIES_HOURS), tax, { capSellAtRecent }))
      return planFlips(refined, { cash, slots, maxFillHours }).map(p => fromMetrics(p.candidate.entry, p.metrics))
    }
  }
}


export function topFlipsStrategy ({ maxFillHours, minVolume, capSellAtRecent }: PlanVariant): Strategy {
  const tag = preFix(capSellAtRecent)
  return {
    key: `top_flips-gph-${maxFillHours}h-v${minVolume}${tag.key}`,
    label: `top_flips sort=gp_per_hour max_fill_hours=${maxFillHours} min_volume=${minVolume}${tag.label}`,
    lookbackHours: SERIES_HOURS,
    decide ({ view, cash, slots, exclude }: DecideInput): Pick[] {
      const live = topFlips(view.market(), { minVolume, budget: cash, sort: 'profit_per_limit', limit: Number.MAX_SAFE_INTEGER, includeMembers: true, includeStale: false })
        .filter(f => !exclude.has(f.id))
      const ctx = { mappingById: view.mappingById, bulk: { latest: view.latest, h1: view.h1, h24: view.h24 }, tax, pumps: pumpIds(view), budget: cash, maxFillHours, refine: { capSellAtRecent } }
      const first = rankRows(bulkRows(live, ctx), 'gp_per_hour')
      const series = seriesMap(view, first.slice(0, TOP_REFINE).map(r => r.live.id))
      const ranked = rankRows(refineRows(first, series, ctx), 'gp_per_hour').filter((r: FillAwareRow) => !r.demotedReason && r.metrics && r.candidate)
      const picks = ranked.map(r => fromMetrics(r.candidate!.entry, r.metrics!))
      return allocateInOrder(picks, cash, slots, exclude)
    }
  }
}

export function findDipsStrategy (maxFillHours: number): Strategy {
  return {
    key: `find_dips-${maxFillHours}h`,
    label: `find_dips (defaults) max_fill_hours=${maxFillHours}`,
    lookbackHours: SERIES_HOURS,
    decide ({ view, cash, slots, exclude }: DecideInput): Pick[] {
      const dips = findDips({ mapping: view.mapping, hour: view.h1, day: view.h24, latest: view.latest }, { limit: 60 })
      const series = seriesMap(view, dips.slice(0, DIPS_REFINE).map(d => d.id))
      const picks = dips.flatMap(d => {
        const item = view.mappingById.get(d.id)
        if (!item) return []
        const market = { item, h1: view.h1.get(d.id), h24: view.h24.get(d.id), latest: view.latest.get(d.id), series: series.get(d.id) }
        const fill = dipFill(market, { buyAt: d.hourAvgLow, sellAt: d.dayAvgHigh }, tax, maxFillHours)
        return !fill.demotedReason && fill.quoted ? [fromMetrics(item, fill.quoted)] : []
      })
      return allocateInOrder(picks, cash, slots, exclude)
    }
  }
}

export function marginScanStrategy (maxFillHours: number): Strategy {
  return {
    key: `margin_scan-${maxFillHours}h`,
    label: `margin_scan max_fill_hours=${maxFillHours}`,
    lookbackHours: WEEK_HOURS,
    decide ({ view, cash, slots, exclude }: DecideInput): Pick[] {
      const pumps = pumpIds(view)
      const screened = screenSpreads(view.mapping, { latest: view.latest, h1: view.h1, h24: view.h24, nowSec: view.t, tax, isPump: id => pumps.has(id) })
      const checked = screened.slice(0, MARGIN_CHECK)
      const rows = checked.flatMap(r => {
        const series = view.series(r.item.id, WEEK_HOURS)
        if (!keepMarginRow(marginRow(r, series, tax))) return []
        const market = { item: r.item, h1: view.h1.get(r.item.id), h24: view.h24.get(r.item.id), latest: view.latest.get(r.item.id), series: series.slice(-SERIES_HOURS) }
        const fill = quoteFill(market, { buyAt: r.carefulBuy, sellAt: r.carefulSell }, tax, maxFillHours)
        return !fill.demotedReason && fill.quoted ? [{ pick: fromMetrics(r.item, fill.quoted), gph: fill.quoted.gpPerHourPerSlot }] : []
      })
      // The tool ranks fillable rows by GP/hour per slot.
      const ranked = [...rows].sort((a, b) => b.gph - a.gph).map(r => r.pick)
      return allocateInOrder(ranked, cash, slots, exclude)
    }
  }
}
