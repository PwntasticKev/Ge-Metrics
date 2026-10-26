import { useLocalSearchParams } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import { useAverages } from '../api/useAverages'
import { useMarket, type MarketState } from '../api/useMarket'
import { useMarketMood } from '../api/useMarketMood'
import { FlipListScreen } from '../components/FlipListScreen'
import { PickRow } from '../components/PickRow'
import { ScreenHeader } from '../components/ScreenHeader'
import { SlowHeader, SlowRow } from '../components/SlowToFill'
import { SlotsCard } from '../components/slots/SlotsCard'
import { Pills, Tabs } from '../components/Tabs'
import { riskOffNote } from '../lib/breadth'
import { pickSlowText } from '../lib/fillText'
import { gpShort, minutesAgo, signed } from '../lib/format'
import { PICK_HORIZON_HOURS, type OfferPick, type SlowPick } from '../lib/pickFill'
import { planTotals, REFINE_TOP, usePickLists, type PickMode } from '../lib/picks'
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

const FILL_FOOTER = ` Amounts are cut to what the fill-time model expects to buy and then sell in time (you get a share of each side's trades, more if you outbid); items that can't fill even one in time are under Slow to fill. Items trading under 10K a day are left out: in a 14-day backtest they lost money. The first ${REFINE_TOP} rows are then refined with each item's hourly history (prices from the last 6 hours that traded with volume), the same offer the item sheet shows; rows marked est. are still from the hour and day averages.`

const FOOTERS: Record<PickMode, string> = {
  quick: 'Prices are the more careful of live and recent traded prices (the last hour where it traded with volume, else the day), so one odd trade can\'t fake a margin. Amounts are sized so each side of the market trades at least 6 times your amount a day, and so the buy and the sell both fill within 2 hours: in a 60-day out-of-sample test, sizing for 2 hours instead of 4 made more and cut losing picks from 22% to 16%.',
  dips: 'Liquid items whose price fell at least 5% under the day\'s typical low over the last hour, while buyers still pay the usual price. Buy the dip, sell back at the day\'s middle, sized to fill within 4 hours.',
  plan: 'Your whole cash stack split across your GE slots for the most profit you can actually make in the next 4 hours: the same picks as Next 4 hours, each cut to what buys and sells within 2 hours.',
  overnight: 'Offers at the typical low and high of the last 24 hours, sized to buy and sell within 8 hours. Items that moved away from those prices in the last hour, or trade less than once an hour, are left out.'
}

type Row =
  | { key: string; pick: OfferPick }
  | { key: 'slow' }
  | { key: string; slow: SlowPick }

function listRows (picks: readonly OfferPick[], slow: readonly SlowPick[], slowOpen: boolean): Row[] {
  const fast: Row[] = picks.map(pick => ({ key: String(pick.id), pick }))
  if (!slow.length) return fast
  const header: Row = { key: 'slow' }
  return [...fast, header, ...(slowOpen ? slow.map(s => ({ key: `slow${s.pick.id}`, slow: s })) : [])]
}

function headerMeta (mode: PickMode, picks: readonly OfferPick[], budget: number | null, updatedAt: number | null): string {
  if (mode === 'plan' && budget && picks.length) {
    const { cost, profit } = planTotals(picks)
    return `Uses ${gpShort(cost)} of ${gpShort(budget)}, ${signed(profit)}`
  }
  return `${budget ? `With ${gpShort(budget)}, ` : ''}${minutesAgo(updatedAt)}`
}

// Home tab: open the app, see exactly what to buy and what to sell it for.
// gemetrics:///?mode=overnight opens a list directly; &slow=1 opens Slow to fill.
export default function BuyNowScreen () {
  const params = useLocalSearchParams<{ mode?: string; slow?: string }>()
  const prices = useMarket()
  const averages = useAverages()
  const { palette } = useTheme()
  const { settings } = useSettings()
  const [mode, setMode] = useState<PickMode>(MODES.find(m => m.value === params.mode)?.value ?? 'quick')
  const [sortBy, setSortBy] = useState<PickSort>('profit')
  const [openId, setOpenId] = useState<number | null>(null)
  const [slowOpen, setSlowOpen] = useState(params.slow === '1')
  const lists = usePickLists(prices.market, averages.h1, averages.h24, mode)
  const picks = lists?.picks ?? null
  const rates = useMemo(() => (picks ? pickRates(picks) : new Map()), [picks])
  const sortable = SORTABLE.has(mode)
  const bySpeed = sortable && sortBy === 'rate'
  const shown = useMemo(() => (picks && bySpeed ? sortByRate(picks, rates) : picks ?? []), [picks, rates, bySpeed])
  const onToggle = useCallback((id: number) => setOpenId(prev => (prev === id ? null : id)), [])
  const rows = useMemo(() => listRows(shown, lists?.slow ?? [], slowOpen), [shown, lists, slowOpen])
  const horizon = Math.min(settings.maxSellHours, PICK_HORIZON_HOURS[mode])
  const riskOff = riskOffNote(useMarketMood(prices.market), mode)

  const renderRow = (r: Row) => {
    if ('pick' in r) return <PickRow pick={r.pick} mode={mode} rate={rates.get(r.pick.id) ?? null} bySpeed={bySpeed} expanded={openId === r.pick.id} onToggle={onToggle} />
    if ('slow' in r) {
      const { pick, reason, rate } = r.slow
      return <SlowRow id={pick.id} name={pick.name} icon={pick.icon} value={signed(pick.potential)} valueCaption={`if ${pick.maxQty.toLocaleString('en-US')} filled`} reason={reason} maxHours={horizon} text={pick.offer.slowText ?? pickSlowText(rate, PICK_HORIZON_HOURS[mode])} detail={`Buy ${pick.buyAt.toLocaleString('en-US')}, sell ${pick.sellAt.toLocaleString('en-US')}, ${signed(pick.profit)} each after tax.`} expanded={openId === pick.id} onToggle={onToggle} />
    }
    return <SlowHeader count={lists?.slow.length ?? 0} maxHours={horizon} subtitle={`Can't buy and sell even one within ${horizon}h at these prices`} open={slowOpen} onToggle={() => setSlowOpen(o => !o)} />
  }

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
    <FlipListScreen<Row>
      market={market}
      header={
        <ScreenHeader title="Buy now" meta={picks ? headerMeta(mode, picks, settings.budget, prices.updatedAt) : undefined}>
          <SlotsCard />
          <Tabs options={MODES} value={mode} onChange={value => { setMode(value); setOpenId(null); setSlowOpen(false) }} />
          {riskOff ? <Text style={[styles.warn, { color: palette.ink, backgroundColor: palette.well }]} accessibilityRole="alert">{riskOff}</Text> : null}
          {sortable ? <Pills options={SORTS} value={sortBy} onChange={value => { setSortBy(value); setOpenId(null) }} /> : null}
        </ScreenHeader>
      }
      data={rows}
      keyOf={r => r.key}
      extraData={`${openId}:${mode}:${bySpeed}:${slowOpen}`}
      renderRow={renderRow}
      empty={mode === 'plan' && !settings.budget
        ? { title: 'Set your cash stack first', body: 'Tools, Settings, Cash stack. The plan splits it across your GE slots.' }
        : { title: 'Nothing worth buying right now', body: 'Prices move all day. Pull down to refresh.' }}
      footer={<Text style={[styles.note, { color: palette.muted }]}>{FOOTERS[mode]}{mode === 'plan' ? '' : FILL_FOOTER}{sortable ? RATE_FOOTER : ''}</Text>}
    />
  )
}

const styles = StyleSheet.create({
  note: { fontSize: 12.5, textAlign: 'center', padding: 20, lineHeight: 18 },
  warn: { fontSize: 13, lineHeight: 18, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, overflow: 'hidden' }
})
