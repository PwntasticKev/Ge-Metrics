// The iOS app's Buy now picks (src/domain/flipping/picks.js, used by
// mobile/src/lib/picks.ts): quick, overnight and dips lists, thin-volume pumps
// removed, then split across slots with planCashStack, as the app's Plan tab
// does. The app predicts profit per pick but no fill time; quick flips are
// meant to finish inside one 4h buy-limit window and overnight offers within
// 8h, so those are recorded as the predicted cycle (all on the buy side).

import { type BuyPick, planCashStack, rankDips, rankOvernightFlips, rankQuickFlips } from '@ge/engine'
import { flagSpikes } from '../../analysis/scanner/report.js'
import type { MarketView } from '../view.js'
import type { DecideInput, Pick, Strategy } from './types.js'

export type AppMode = 'quick' | 'overnight' | 'dips'

const RANKERS = { quick: rankQuickFlips, overnight: rankOvernightFlips, dips: rankDips } as const
const QUICK_HOURS = 4
// Mirrors OVERNIGHT_HOURS in picks.js (not exported by the engine index).
const OVERNIGHT_HOURS = 8
const CYCLE_HOURS: Readonly<Record<AppMode, number | null>> = { quick: QUICK_HOURS, overnight: OVERNIGHT_HOURS, dips: null }

const toRecord = <T>(map: ReadonlyMap<number, T>): Record<string, T> => Object.fromEntries([...map].map(([id, v]) => [String(id), v]))

export function pumpIds (view: MarketView): ReadonlySet<number> {
  return new Set(flagSpikes({ mapping: view.mapping, h1: view.h1, h24: view.h24, m5: view.m5 }).filter(f => f.flag.kind === 'pump').map(f => f.entry.id))
}

function toPick (p: BuyPick, view: MarketView, mode: AppMode): Pick {
  return {
    id: p.id,
    name: p.name,
    buyAt: p.buyAt,
    sellAt: p.sellAt,
    qty: p.maxQty,
    limit: view.mappingById.get(p.id)?.limit ?? p.maxQty,
    predicted: { profit: p.potential, buyHours: CYCLE_HOURS[mode], sellHours: null }
  }
}

export function appStrategy (mode: AppMode): Strategy {
  return {
    key: `app-${mode}`,
    label: `App Buy now: ${mode} (planCashStack)`,
    lookbackHours: 24,
    decide ({ view, cash, slots, exclude }: DecideInput): Pick[] {
      const pumps = pumpIds(view)
      const picks = RANKERS[mode](view.market(), { h1: toRecord(view.h1), h24: toRecord(view.h24), budget: cash })
        .filter(p => !pumps.has(p.id) && !exclude.has(p.id))
      return planCashStack(picks, { cash, slots }).map(p => toPick(p, view, mode))
    }
  }
}
