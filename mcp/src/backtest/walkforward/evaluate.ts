// Walk-forward scoring for one strategy family: per fold, the variant with the
// best training-window profit trades the test window. Out-of-sample (OOS)
// numbers come only from test windows. Also: how the shipped default and a
// "consensus" variant (each knob at the value the folds chose most often) do
// on the same test windows, and how stable the choices are.

import type { Mood } from '../../analysis/scanner/breadth.js'
import { maxDrawdown } from '../metrics.js'
import type { Trade } from '../position.js'
import type { SimResult } from '../simulate.js'
import { type Fold, type Window, chooseForFold, scoreWindow, stitch, tradesPlacedIn, windowProfit } from './folds.js'
import type { Family } from './grid.js'

export interface FoldOutcome {
  readonly fold: Fold
  readonly chosenKey: string
  readonly trainProfit: number
  readonly testProfit: number
  readonly defaultTestProfit: number
  /** Default's rank among all variants on the training window (1 = best). */
  readonly defaultTrainRank: number
  /** Best variant on the test window in hindsight (not tradable). */
  readonly hindsightTestProfit: number
}

export interface OosStats {
  readonly profit: number
  readonly folds: number
  readonly foldsPositive: number
  readonly picks: number
  /** Of OOS picks that bought anything, share that lost money. */
  readonly lossPct: number | null
  readonly maxDrawdownPct: number
  /** OOS profit per day of test window. */
  readonly perDay: number
}

export interface ParamChoice {
  readonly param: string
  readonly defaultValue: number | boolean
  /** How many folds chose each value. */
  readonly counts: ReadonlyMap<string, number>
  readonly modal: string
  readonly modalShare: number
}

export interface RegimeRow {
  readonly mood: Mood
  readonly decisions: number
  readonly wf: OosStats
  readonly baseline: OosStats
}

/** One knob moved, the others held at an anchor (the default or the consensus). */
export interface Marginal {
  readonly anchor: 'default' | 'consensus'
  readonly param: string
  readonly value: string
  readonly key: string
  readonly profit: number
  /** Test windows where this beat the shipped default. */
  readonly winsVsDefault: number
  readonly lossPct: number | null
}

export interface FamilyReport {
  readonly family: Family
  readonly folds: readonly FoldOutcome[]
  readonly wf: OosStats
  readonly baseline: OosStats
  readonly choices: readonly ParamChoice[]
  readonly consensusKey: string
  readonly consensus: OosStats
  /** Folds where the consensus variant beat the default on the test window. */
  readonly consensusWins: number
  readonly regimes: readonly RegimeRow[]
  readonly marginals: readonly Marginal[]
}

const DAY_SEC = 86_400

function oosStats (pieces: readonly { result: SimResult; window: Window }[], cash: number, tradeFilter: (t: Trade) => boolean = () => true): OosStats {
  const profit = pieces.reduce((s, p) => s + windowProfit(p.result.equity, p.window), 0)
  const trades = pieces.flatMap(p => tradesPlacedIn(p.result.trades, p.window)).filter(tradeFilter)
  const traded = trades.filter(t => t.bought > 0)
  const days = pieces.reduce((s, p) => s + (p.window.end - p.window.start) / DAY_SEC, 0)
  return {
    profit: Math.round(profit),
    folds: pieces.length,
    foldsPositive: pieces.filter(p => windowProfit(p.result.equity, p.window) > 0).length,
    picks: trades.length,
    lossPct: traded.length ? traded.filter(t => t.profit < 0).length / traded.length : null,
    maxDrawdownPct: maxDrawdown(stitch(pieces, cash)).pct,
    perDay: days > 0 ? Math.round(profit / days) : 0
  }
}

/** Trade-level OOS stats restricted to picks placed under one mood (profit = realized on those picks). */
function regimeStats (pieces: readonly { result: SimResult; window: Window }[], keep: (t: Trade) => boolean): OosStats {
  const trades = pieces.flatMap(p => tradesPlacedIn(p.result.trades, p.window)).filter(keep)
  const traded = trades.filter(t => t.bought > 0)
  return {
    profit: Math.round(trades.reduce((s, t) => s + t.profit, 0)),
    folds: pieces.length,
    foldsPositive: 0,
    picks: trades.length,
    lossPct: traded.length ? traded.filter(t => t.profit < 0).length / traded.length : null,
    maxDrawdownPct: 0,
    perDay: 0
  }
}

const valueKey = (v: number | boolean) => String(v)

function paramChoices (family: Family, chosen: readonly string[]): ParamChoice[] {
  const byKey = new Map(family.variants.map(v => [v.strategy.key, v.params]))
  const defaults = byKey.get(family.defaultKey) ?? {}
  return Object.entries(defaults).map(([param, defaultValue]) => {
    const counts = new Map<string, number>()
    for (const k of chosen) {
      const v = valueKey(byKey.get(k)?.[param] ?? defaultValue)
      counts.set(v, (counts.get(v) ?? 0) + 1)
    }
    const [modal, n] = [...counts].sort((a, b) => b[1] - a[1])[0] ?? [valueKey(defaultValue), 0]
    return { param, defaultValue, counts, modal, modalShare: chosen.length ? n / chosen.length : 0 }
  })
}

/** The variant with every knob at its most chosen value. */
function consensusKey (family: Family, choices: readonly ParamChoice[]): string {
  const match = family.variants.find(v => choices.every(c => valueKey(v.params[c.param] ?? c.defaultValue) === c.modal))
  return match?.strategy.key ?? family.defaultKey
}

function marginals (family: Family, anchorKey: string, anchor: Marginal['anchor'], oos: (key: string) => { profit: number; wins: number; lossPct: number | null }): Marginal[] {
  const params = family.variants.find(v => v.strategy.key === anchorKey)?.params ?? {}
  return Object.keys(params).flatMap(param => {
    const values = [...new Set(family.variants.map(v => valueKey(v.params[param] ?? false)))]
    return values.flatMap(value => {
      const match = family.variants.find(v => Object.entries(params).every(([k, x]) => valueKey(v.params[k] ?? false) === (k === param ? value : valueKey(x))))
      if (!match) return []
      const o = oos(match.strategy.key)
      return [{ anchor, param, value, key: match.strategy.key, profit: o.profit, winsVsDefault: o.wins, lossPct: o.lossPct }]
    })
  })
}

export function evaluateFamily (family: Family, results: readonly SimResult[], folds: readonly Fold[], cash: number, moods: ReadonlyMap<number, Mood>): FamilyReport {
  const byKey = new Map(results.map(r => [r.key, r]))
  const get = (k: string): SimResult => {
    const r = byKey.get(k)
    if (!r) throw new Error(`no result for ${k}`)
    return r
  }
  const def = get(family.defaultKey)
  const outcomes: FoldOutcome[] = folds.map(fold => {
    const chosen = chooseForFold(results, fold)
    const train = scoreWindow(results, fold.train).sort((a, b) => b.profit - a.profit)
    const test = scoreWindow(results, fold.test)
    return {
      fold,
      chosenKey: chosen.key,
      trainProfit: chosen.profit,
      testProfit: windowProfit(get(chosen.key).equity, fold.test),
      defaultTestProfit: windowProfit(def.equity, fold.test),
      defaultTrainRank: train.findIndex(s => s.key === family.defaultKey) + 1,
      hindsightTestProfit: Math.max(...test.map(s => s.profit))
    }
  })
  const wfPieces = outcomes.map(o => ({ result: get(o.chosenKey), window: o.fold.test }))
  const basePieces = folds.map(f => ({ result: def, window: f.test }))
  const choices = paramChoices(family, outcomes.map(o => o.chosenKey))
  const cKey = consensusKey(family, choices)
  const cPieces = folds.map(f => ({ result: get(cKey), window: f.test }))
  const moodOf = (t: Trade): Mood => moods.get(t.placedAt) ?? 'mixed'
  const allMoods: Mood[] = ['risk-on', 'mixed', 'risk-off']
  const testDecisions = [...moods.keys()].filter(t => folds.some(f => t >= f.test.start && t < f.test.end))
  const fixedOos = (k: string) => {
    const stats = oosStats(folds.map(f => ({ result: get(k), window: f.test })), cash)
    return { profit: stats.profit, lossPct: stats.lossPct, wins: folds.filter(f => windowProfit(get(k).equity, f.test) > windowProfit(def.equity, f.test)).length }
  }
  return {
    family,
    folds: outcomes,
    marginals: [...marginals(family, family.defaultKey, 'default', fixedOos), ...marginals(family, cKey, 'consensus', fixedOos)],
    wf: oosStats(wfPieces, cash),
    baseline: oosStats(basePieces, cash),
    choices,
    consensusKey: cKey,
    consensus: oosStats(cPieces, cash),
    consensusWins: folds.filter(f => windowProfit(get(cKey).equity, f.test) > windowProfit(def.equity, f.test)).length,
    regimes: allMoods.map(mood => ({
      mood,
      decisions: testDecisions.filter(t => moods.get(t) === mood).length,
      wf: regimeStats(wfPieces, t => moodOf(t) === mood),
      baseline: regimeStats(basePieces, t => moodOf(t) === mood)
    }))
  }
}
