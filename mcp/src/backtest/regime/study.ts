// Regime-gate study for one 60-day period. Every family's shipped default runs
// ungated (the baseline, and the "shadow" whose closed trades feed the
// equity-curve rules), then behind every gate candidate. Per fold and per
// gate group, the candidate with the most training-window profit (off
// included, and first, so ties mean "don't gate") trades the test window.
// Combined gates OR together each group's per-fold choice.

import type { RegimeSignals, ScheduledUpdate } from '../../analysis/regime/gates.js'
import type { MappingEntry } from '../../wiki/types.js'
import type { History } from '../history.js'
import { maxDrawdown } from '../metrics.js'
import type { Timeline } from '../run.js'
import type { SimResult } from '../simulate.js'
import type { Strategy } from '../strategies/types.js'
import { type Fold, chooseForFold, stitch, tradesPlacedIn, windowProfit } from '../walkforward/folds.js'
import { type WalkForwardConfig, runVariants } from '../walkforward/run.js'
import { GATE_CANDIDATES, GATE_GROUPS, type GateConfig, type GateGroup, OFF, PROPOSED, combine } from './configs.js'
import { gateSizes, gatedStrategy } from './gated.js'
import { closedTrades, marketSignalsAt } from './signals.js'

export interface GateFamily {
  readonly name: string
  readonly base: Strategy
}

export interface GateStats {
  readonly profit: number
  /** Test-window profit per fold. */
  readonly tests: readonly number[]
  readonly foldsPositive: number
  readonly worst: number
  readonly maxDrawdownPct: number
  /** Mean gate size over test-window decisions (1 = always trading at full size). */
  readonly tradingShare: number
  readonly lossPct: number | null
  /** Realized profit of trades placed in test windows (after tax). */
  readonly realized: number
}

export interface GateRow {
  readonly family: string
  /** 'none', a group, 'market' (breadth+update+volatility), 'all' (OR of every group's choice) or 'any' (the single best candidate of any group). */
  readonly gate: string
  readonly mode: 'baseline' | 'walk-forward' | 'fixed'
  readonly stats: GateStats
  /** Walk-forward rows: the config each fold traded. */
  readonly chosen?: readonly string[]
}

export interface StudyInput {
  readonly families: readonly GateFamily[]
  readonly history: History
  readonly mapping: readonly MappingEntry[]
  readonly timeline: Timeline
  readonly config: WalkForwardConfig
  readonly folds: readonly Fold[]
  readonly schedule: readonly ScheduledUpdate[]
  readonly log?: (msg: string) => void
}

export interface SignalRow {
  readonly t: number
  readonly mood: string | null
  readonly index24h: number | null
  readonly index7d: number | null
  readonly volRatio: number | null
}

export interface GateStudy {
  readonly rows: readonly GateRow[]
  readonly signals: readonly SignalRow[]
}

const COMBOS: Readonly<Record<'market' | 'all', readonly GateGroup[]>> = { market: ['breadth', 'update', 'volatility'], all: GATE_GROUPS }

interface FamilyRuns {
  readonly family: GateFamily
  readonly base: SimResult
  readonly results: Map<string, SimResult>
  readonly sizes: Map<string, Map<number, number>>
}

function stats (pieces: readonly { result: SimResult; window: Fold['test']; sizes: ReadonlyMap<number, number> }[], cash: number, decisions: readonly number[]): GateStats {
  const tests = pieces.map(p => Math.round(windowProfit(p.result.equity, p.window)))
  const trades = pieces.flatMap(p => tradesPlacedIn(p.result.trades, p.window))
  const traded = trades.filter(t => t.bought > 0)
  const sizes = pieces.flatMap(p => decisions.filter(t => t >= p.window.start && t < p.window.end).map(t => p.sizes.get(t) ?? 1))
  return {
    profit: tests.reduce((s, x) => s + x, 0),
    tests,
    foldsPositive: tests.filter(x => x > 0).length,
    worst: Math.min(...tests),
    maxDrawdownPct: maxDrawdown(stitch(pieces, cash)).pct,
    tradingShare: sizes.length ? sizes.reduce((s, x) => s + x, 0) / sizes.length : 1,
    lossPct: traded.length ? traded.filter(t => t.profit < 0).length / traded.length : null,
    realized: Math.round(trades.reduce((s, t) => s + t.profit, 0))
  }
}

function simulateGated (runs: readonly FamilyRuns[], configs: (r: FamilyRuns) => readonly GateConfig[], signals: ReadonlyMap<number, RegimeSignals>, i: StudyInput): void {
  const jobs = runs.flatMap(r => configs(r).filter(c => !r.results.has(c.key)).map(c => {
    const sizes = gateSizes(c, signals, closedTrades(r.base.trades))
    r.sizes.set(c.key, sizes)
    return { r, c, strategy: gatedStrategy(r.family.base, c.key, sizes) }
  }))
  if (!jobs.length) return
  const started = Date.now()
  const results = runVariants(jobs.map(j => j.strategy), i)
  jobs.forEach((j, k) => j.r.results.set(j.c.key, results[k] as SimResult))
  i.log?.(`simulated ${jobs.length} gated variants in ${Math.round((Date.now() - started) / 1000)}s`)
}

export function runGateStudy (i: StudyInput): GateStudy {
  const decisions = i.timeline.decisions
  const signals = new Map(decisions.map(t => [t, marketSignalsAt(i.history, t, i.mapping, i.schedule)]))
  i.log?.(`signals at ${signals.size} decisions`)
  const bases = runVariants(i.families.map(f => f.base), i)
  const allOnes = new Map(decisions.map(t => [t, 1]))
  const runs: FamilyRuns[] = i.families.map((family, k) => {
    const base = bases[k] as SimResult
    return { family, base, results: new Map([[OFF.key, base]]), sizes: new Map([[OFF.key, allOnes]]) }
  })
  const singles = GATE_GROUPS.flatMap(g => GATE_CANDIDATES[g])
  simulateGated(runs, () => singles, signals, i)

  const choose = (r: FamilyRuns, group: GateGroup | 'any'): GateConfig[] => i.folds.map(f => {
    const cands = [OFF, ...(group === 'any' ? singles : GATE_CANDIDATES[group])]
    const pick = chooseForFold(cands.map(c => r.results.get(c.key) as SimResult), f)
    return cands.find(c => (r.results.get(c.key) as SimResult).key === pick.key) ?? OFF
  })
  const chosenByGroup = new Map(runs.map(r => [r.family.name, new Map(GATE_GROUPS.map(g => [g, choose(r, g)]))]))
  const comboChoice = (r: FamilyRuns, combo: keyof typeof COMBOS): GateConfig[] =>
    i.folds.map((_, k) => combine(COMBOS[combo].map(g => chosenByGroup.get(r.family.name)?.get(g)?.[k] ?? OFF)))
  simulateGated(runs, r => [...comboChoice(r, 'market'), ...comboChoice(r, 'all'), ...PROPOSED], signals, i)

  const rows = runs.flatMap(r => {
    const piecesOf = (configs: readonly GateConfig[]) => i.folds.map((f, k) => {
      const c = configs[k] ?? OFF
      return { result: r.results.get(c.key) as SimResult, window: f.test, sizes: r.sizes.get(c.key) ?? allOnes }
    })
    const fixed = (c: GateConfig) => piecesOf(i.folds.map(() => c))
    const wf = (gate: string, configs: readonly GateConfig[]): GateRow => ({ family: r.family.name, gate, mode: 'walk-forward', stats: stats(piecesOf(configs), i.config.cash, decisions), chosen: configs.map(c => c.key) })
    return [
      { family: r.family.name, gate: 'none', mode: 'baseline' as const, stats: stats(fixed(OFF), i.config.cash, decisions) },
      ...GATE_GROUPS.map(g => wf(g, chosenByGroup.get(r.family.name)?.get(g) ?? [])),
      wf('market', comboChoice(r, 'market')),
      wf('all', comboChoice(r, 'all')),
      wf('any', choose(r, 'any')),
      ...[...singles, ...PROPOSED].map(c => ({ family: r.family.name, gate: c.key, mode: 'fixed' as const, stats: stats(fixed(c), i.config.cash, decisions) }))
    ]
  })
  const signalRows = [...signals.values()].map(s => ({ t: s.t, mood: s.mood, index24h: s.index24h, index7d: s.index7d, volRatio: s.volRatio }))
  return { rows, signals: signalRows }
}
