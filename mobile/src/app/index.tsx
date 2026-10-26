import { useCallback, useMemo, useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import type { BuyPick } from '@ge/engine'
import { useAverages } from '../api/useAverages'
import { useMarket, type MarketState } from '../api/useMarket'
import { FlipListScreen } from '../components/FlipListScreen'
import { PickRow } from '../components/PickRow'
import { ScreenHeader } from '../components/ScreenHeader'
import { Pills, Tabs } from '../components/Tabs'
import { gpShort, minutesAgo, signed } from '../lib/format'
import { planTotals, usePicks, type PickMode } from '../lib/picks'
import { pickRates, sortByRate, type PickSort } from '../lib/pickTiming'
import { useSettings } from '../state/settings'
import { useTheme } from '../theme/ThemeProvider'

const MODES = [
  { value: 'quick', label: 'Next 4 hours' },
  { value: 'overnight', label: 'Overnight' },
  { value: 'dips', label: 'Dips' },
  { value: 'plan', label: 'Plan' }
] as const

const SORTS = [
  { value: 'profit', label: 'Most profit' },
  { value: 'rate', label: 'GP/h per slot' }
] as const
// Speed matters when you're at the GE flipping; overnight offers and the
// cash plan are about the total, so they keep their own order.
const SORTABLE: ReadonlySet<PickMode> = new Set(['quick', 'dips'])

const RATE_FOOTER = ' GP/h per slot: profit on the amount, divided by the expected time to fill the buy and then the sell, from each side\'s trades over the last hour and day.'

const FOOTERS: Record<PickMode, string> = {
  quick: 'Prices are the more careful of live and last-hour prices, so one odd trade can\'t fake a margin. Amounts are sized so each side of the market trades at least 6 times your amount a day.',
  dips: 'Liquid items whose price fell at least 5% under the day\'s typical low over the last hour, while buyers still pay the usual price. Buy the dip, sell back at the day\'s middle.',
  plan: 'Your whole cash stack split across your GE slots for the most total profit in the next 4 hours, using the same picks as Next 4 hours.',
  overnight: 'Offers at the typical low and high of the last 24 hours, sized to fill over 8 hours. Items that moved away from those prices in the last hour, or trade less than once an hour, are left out.'
}

function headerMeta (mode: PickMode, picks: readonly BuyPick[], budget: number | null, updatedAt: number | null): string {
  if (mode === 'plan' && budget && picks.length) {
    const { cost, profit } = planTotals(picks)
    return `Uses ${gpShort(cost)} of ${gpShort(budget)}, ${signed(profit)}`
  }
  return `${budget ? `With ${gpShort(budget)}, ` : ''}${minutesAgo(updatedAt)}`
}

// Home tab: open the app, see exactly what to buy and what to sell it for.
export default function BuyNowScreen () {
  const prices = useMarket()
  const averages = useAverages()
  const { palette } = useTheme()
  const { settings } = useSettings()
  const [mode, setMode] = useState<PickMode>('quick')
  const [sortBy, setSortBy] = useState<PickSort>('profit')
  const [openId, setOpenId] = useState<number | null>(null)
  const picks = usePicks(prices.market, averages.h1, averages.h24, mode)
  const rates = useMemo(() => (picks ? pickRates(picks, averages.h1, averages.h24) : new Map()), [picks, averages.h1, averages.h24])
  const sortable = SORTABLE.has(mode)
  const bySpeed = sortable && sortBy === 'rate'
  const shown = useMemo(() => (picks && bySpeed ? sortByRate(picks, rates) : picks ?? []), [picks, rates, bySpeed])
  const onToggle = useCallback((id: number) => setOpenId(prev => (prev === id ? null : id)), [])

  // The list needs both live prices and averages before it can rank anything.
  const market: MarketState = {
    ...prices,
    market: picks ? prices.market : null,
    isLoading: prices.isLoading || (!picks && averages.isLoading),
    error: prices.error ?? averages.error,
    isRefreshing: prices.isRefreshing || averages.isRefreshing,
    refresh: () => {
      prices.refresh()
      averages.refresh()
    }
  }

  return (
    <FlipListScreen<BuyPick>
      market={market}
      header={
        <ScreenHeader title="Buy now" meta={picks ? headerMeta(mode, picks, settings.budget, prices.updatedAt) : undefined}>
          <Tabs options={MODES} value={mode} onChange={value => { setMode(value); setOpenId(null) }} />
          {sortable ? <Pills options={SORTS} value={sortBy} onChange={value => { setSortBy(value); setOpenId(null) }} /> : null}
        </ScreenHeader>
      }
      data={shown}
      keyOf={p => String(p.id)}
      extraData={`${openId}:${mode}:${bySpeed}`}
      renderRow={p => <PickRow pick={p} mode={mode} rate={rates.get(p.id) ?? null} bySpeed={bySpeed} expanded={openId === p.id} onToggle={onToggle} />}
      empty={mode === 'plan' && !settings.budget
        ? { title: 'Set your cash stack first', body: 'Tools, Settings, Cash stack. The plan splits it across your GE slots.' }
        : { title: 'Nothing worth buying right now', body: 'Prices move all day. Pull down to refresh.' }}
      footer={<Text style={[styles.note, { color: palette.muted }]}>{FOOTERS[mode]}{sortable ? RATE_FOOTER : ''}</Text>}
    />
  )
}

const styles = StyleSheet.create({
  note: { fontSize: 12.5, textAlign: 'center', padding: 20, lineHeight: 18 }
})
