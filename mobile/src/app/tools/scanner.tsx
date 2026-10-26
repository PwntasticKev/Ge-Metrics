import type { Market, MarketItem } from '@ge/engine'
import { useLocalSearchParams } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import { useScannerData, useThrottledSeries } from '../../api/useScanner'
import { FlipListScreen } from '../../components/FlipListScreen'
import { ScreenHeader } from '../../components/ScreenHeader'
import { BreadthCard } from '../../components/scanner/BreadthCard'
import { DipScanRow, slowSpreadDetail, SpreadScanRow, TrendScanRow, type DipEntry, type SpreadEntry, type TrendEntry } from '../../components/scanner/ScanRows'
import { CHECK_SPREADS, useSpreadRows } from '../../components/scanner/useSpreadRows'
import { SlowHeader, SlowRow } from '../../components/SlowToFill'
import { Tabs } from '../../components/Tabs'
import { gpShort } from '../../lib/format'
import type { Move } from '../../lib/marketMoves'
import { SPREAD_HIDE_Z } from '../../lib/spreadFill'
import { SPREAD_MULTIPLE, SPREAD_Z } from '../../lib/spreadScan'
import { dipCandidates, reversionCheck, trendCandidates, trendFit } from '../../lib/trendScan'
import { useSettings } from '../../state/settings'
import { useTheme } from '../../theme/ThemeProvider'

type Mode = 'spread' | 'trend' | 'dip'
const MODES = [
  { value: 'spread', label: 'Margins opened' },
  { value: 'trend', label: 'Trending' },
  { value: 'dip', label: 'Below mean' }
] as const
// Per-item history is one request each; check the top of each list only.
const CHECK_CANDIDATES = 20

type Row =
  | { key: 'breadth' }
  | { key: string; spread: SpreadEntry }
  | { key: 'slow' }
  | { key: string; slowSpread: SpreadEntry }
  | { key: string; trend: TrendEntry }
  | { key: string; dip: DipEntry }

function liquidFor (moves: Move[] | null, market: Market | null, members: boolean): Move[] {
  if (!moves || !market) return []
  return members ? moves : moves.filter(m => market.get(m.id)?.members === false)
}

function withItems (moves: Move[], market: Market | null): { move: Move; item: MarketItem }[] {
  return moves.flatMap(move => {
    const item = market?.get(move.id)
    return item ? [{ move, item }] : []
  })
}

function useTrendRows (moves: Move[] | null, market: Market | null, members: boolean, active: boolean): { rows: TrendEntry[]; checked: number; total: number } {
  const candidates = useMemo(() => withItems(trendCandidates(liquidFor(moves, market, members), CHECK_CANDIDATES), market), [moves, market, members])
  const series = useThrottledSeries(candidates.map(c => c.item.id), '6h', active)
  return useMemo(() => {
    const rows = candidates
      .map((c, i) => ({ ...c, trend: series[i] ? trendFit(series[i]) : null }))
      .filter((r): r is TrendEntry => r.trend !== null && r.trend.steady)
      .sort((a, b) => Math.abs(b.trend.daily) - Math.abs(a.trend.daily))
    return { rows, checked: series.filter(Boolean).length, total: candidates.length }
  }, [candidates, series])
}

function useDipRows (data: ReturnType<typeof useScannerData>, members: boolean, active: boolean): { rows: DipEntry[]; checked: number; total: number } {
  const { moves, prices, flags } = data
  const market = prices.market
  // Thin-volume dumps aren't "healthy volume"; the Pumps & dumps list covers them.
  const candidates = useMemo(
    () => withItems(dipCandidates(liquidFor(moves, market, members).filter(m => !flags?.has(m.id)), CHECK_CANDIDATES), market),
    [moves, market, flags, members]
  )
  const series = useThrottledSeries(candidates.map(c => c.item.id), '6h', active)
  return useMemo(() => {
    const rows = candidates
      .map((c, i) => ({ ...c, reversion: series[i] ? reversionCheck(series[i], c.move.now, c.move.dayTrades) : null }))
      .filter((r): r is DipEntry => r.reversion !== null && r.reversion.candidate)
      .sort((a, b) => a.reversion.z - b.reversion.z)
    return { rows, checked: series.filter(Boolean).length, total: candidates.length }
  }, [candidates, series])
}

const FOOTNOTES: Record<Mode, string> = {
  spread: `Margin after the 2% tax at prices that actually traded: each side's price comes from recent hours where that side traded at least a quarter of a normal hour (never one print), held to the worse of that and the live price. Compared with the item's own norm: first the margin between its 24h average prices, then the median hourly margin of the last 7 days once its history loads (top ${CHECK_SPREADS} that can fill). Shown at ${SPREAD_MULTIPLE}× the norm or more, both live prices under 20 minutes old, 240+ trades a day, 3+ trades each side in the last hour and 20K+ per buy limit; most profit per limit first. Fill times are for one buy limit from each side's recent trades; rows whose sell would take longer than your limit (Settings), or whose buy and sell together take over twice it, are under Slow to fill. z is in robust σ (scaled median deviation); ${SPREAD_Z}+ is unusual. Rows under ${SPREAD_HIDE_Z}, and margins that vanish at traded prices, are hidden. Thin-volume pumps are left out.`,
  trend: `Screened from the ${CHECK_CANDIDATES} liquid items (10M+ gp a day) that moved most over 7 days, comparing the last hour with the same hour a week ago. Each is then fitted with a line through its 6-hour prices for 7 days; shown when the line explains 70%+ of the moves and changes 0.5%+ a day.`,
  dip: `Screened from the ${CHECK_CANDIDATES} liquid items (10M+ gp a day) down most over 24h or 7d. Shown when the last hour is 8%+ and 2+ standard deviations under the mean of its 6-hour prices over the 30 days before the last 2, that month was range-bound (its trend line moved under 15%, so slow slides after a release don't count), and it trades at least half a normal day's volume. Thin-volume spikes are left out.`
}

function spreadList (listed: readonly SpreadEntry[], slow: readonly SpreadEntry[], open: boolean): Row[] {
  const rows: Row[] = listed.map(spread => ({ key: `s${spread.row.item.id}`, spread }))
  if (!slow.length) return rows
  const header: Row = { key: 'slow' }
  return [...rows, header, ...(open ? slow.map(e => ({ key: `w${e.row.item.id}`, slowSpread: e })) : [])]
}

const isMode = (v: unknown): v is Mode => MODES.some(m => m.value === v)

// gemetrics:///tools/scanner?mode=trend opens a tab directly; &slow=1 opens Slow to fill.
export default function ScannerScreen () {
  const params = useLocalSearchParams<{ mode?: string; slow?: string }>()
  const data = useScannerData()
  const { settings } = useSettings()
  const { palette } = useTheme()
  const [mode, setMode] = useState<Mode>(isMode(params.mode) ? params.mode : 'spread')
  const [openId, setOpenId] = useState<number | null>(null)
  const [slowOpen, setSlowOpen] = useState(params.slow === '1')
  const toggle = useCallback((id: number) => setOpenId(prev => (prev === id ? null : id)), [])
  const maxHours = settings.maxSellHours

  const spreads = useSpreadRows(data, settings.membersItems, maxHours, mode === 'spread')
  const trends = useTrendRows(data.moves, data.prices.market, settings.membersItems, mode === 'trend')
  const dips = useDipRows(data, settings.membersItems, mode === 'dip')

  const rows = useMemo<Row[]>(() => {
    const list: Row[] = mode === 'spread'
      ? spreadList(spreads.listed, spreads.slow, slowOpen)
      : mode === 'trend'
        ? trends.rows.map(trend => ({ key: `t${trend.item.id}`, trend }))
        : dips.rows.map(dip => ({ key: `d${dip.item.id}`, dip }))
    return [{ key: 'breadth' }, ...list]
  }, [mode, spreads.listed, spreads.slow, slowOpen, trends.rows, dips.rows])

  const hidden = spreads.dropped.spike + spreads.dropped.ordinary + spreads.dropped.thin + spreads.dropped.small
  const meta = mode === 'spread'
    ? `${spreads.listed.length} opened${spreads.slow.length ? `, ${spreads.slow.length} slow` : ''}${hidden ? `, ${hidden} hidden` : ''}`
    : `Checked ${(mode === 'trend' ? trends : dips).checked} of ${(mode === 'trend' ? trends : dips).total}`

  const renderRow = (r: Row) => {
    if ('spread' in r) return <SpreadScanRow entry={r.spread} expanded={openId === r.spread.row.item.id} onToggle={toggle} />
    if ('slowSpread' in r) {
      const e = r.slowSpread
      const reason = e.fill.rate.slow
      if (!reason) return <SpreadScanRow entry={e} expanded={openId === e.row.item.id} onToggle={toggle} />
      const value = e.fill.profitPerLimit !== null ? `+${gpShort(e.fill.profitPerLimit)}` : `+${gpShort(e.fill.margin)}`
      return <SlowRow id={e.row.item.id} name={e.row.item.name} icon={e.row.item.icon} value={value} valueCaption={e.fill.profitPerLimit !== null ? 'per limit if filled' : 'each'} reason={reason} maxHours={maxHours} detail={slowSpreadDetail(e)} expanded={openId === e.row.item.id} onToggle={toggle} />
    }
    if (r.key === 'slow') return <SlowHeader count={spreads.slow.length} maxHours={maxHours} open={slowOpen} onToggle={() => setSlowOpen(o => !o)} />
    if ('trend' in r) return <TrendScanRow entry={r.trend} expanded={openId === r.trend.item.id} onToggle={toggle} />
    if ('dip' in r) return <DipScanRow entry={r.dip} expanded={openId === r.dip.item.id} onToggle={toggle} />
    return <BreadthCard breadth={data.breadth} market={data.prices.market} />
  }

  const loadingRows = mode !== 'spread' && (mode === 'trend' ? trends : dips).checked < (mode === 'trend' ? trends : dips).total
  return (
    <FlipListScreen<Row>
      market={data.state}
      header={
        <ScreenHeader inset={false} meta={data.state.market ? meta : undefined}>
          <Tabs options={MODES} value={mode} onChange={value => { setMode(value); setOpenId(null); setSlowOpen(false) }} />
        </ScreenHeader>
      }
      data={rows}
      keyOf={r => r.key}
      extraData={`${openId}-${data.breadth ? 1 : 0}-${slowOpen}`}
      renderRow={renderRow}
      empty={{ title: 'Nothing yet', body: 'Pull down to refresh.' }}
      footer={
        <>
          {(mode === 'spread' ? spreads.listed.length === 0 : rows.length === 1) ? (
            <Text style={[styles.empty, { color: palette.ink }]}>
              {loadingRows ? 'Checking price history…' : mode === 'spread' ? `No margins well above their norm that sell within ${maxHours}h right now.` : mode === 'trend' ? 'No steady 7-day trends right now.' : 'Nothing sharply below its 30-day mean right now.'}
            </Text>
          ) : null}
          <Text style={[styles.note, { color: palette.muted }]}>
            {FOOTNOTES[mode]} Market card: liquid items (240+ trades a day) whose last-hour mid moved more than 1% from the same hour yesterday; the index weights the top 100 by gp traded. Risk-on/off needs the index to move 0.5%+ with breadth agreeing.
          </Text>
        </>
      }
    />
  )
}

const styles = StyleSheet.create({
  empty: { fontSize: 15, fontWeight: '600', textAlign: 'center', paddingTop: 28 },
  note: { fontSize: 12.5, textAlign: 'center', padding: 20, lineHeight: 18 }
})
