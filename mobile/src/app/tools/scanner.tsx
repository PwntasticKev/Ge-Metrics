import { geTax, type Market, type MarketItem } from '@ge/engine'
import { useLocalSearchParams } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import { useScannerData, useThrottledSeries } from '../../api/useScanner'
import { FlipListScreen } from '../../components/FlipListScreen'
import { ScreenHeader } from '../../components/ScreenHeader'
import { BreadthCard } from '../../components/scanner/BreadthCard'
import { DipScanRow, SpreadScanRow, TrendScanRow, type DipEntry, type SpreadEntry, type TrendEntry } from '../../components/scanner/ScanRows'
import { Tabs } from '../../components/Tabs'
import type { Move } from '../../lib/marketMoves'
import type { SideAverages } from '../../lib/scanMath'
import { screenSpreads, spreadHistory, SPREAD_MULTIPLE, SPREAD_Z, type SpreadRow } from '../../lib/spreadScan'
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
const CHECK_SPREADS = 25
const CHECK_CANDIDATES = 20
const MAX_SPREAD_ROWS = 60
// Hide spread rows whose 7-day check says the margin is ordinary for them.
const HIDE_BELOW_Z = 2

type Row =
  | { key: 'breadth' }
  | { key: string; spread: SpreadEntry }
  | { key: string; trend: TrendEntry }
  | { key: string; dip: DipEntry }

const tax = (price: number, id: number) => geTax(price, id)

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

function useSpreadRows (data: ReturnType<typeof useScannerData>, members: boolean, active: boolean): { rows: SpreadEntry[]; hidden: number } {
  const { prices, h1, h24, flags } = data
  const market = prices.market
  const screened = useMemo<SpreadRow[]>(() => {
    if (!market || !h1 || !h24 || !flags) return []
    return screenSpreads({
      items: market.all().filter(i => members || !i.members),
      h1,
      h24,
      nowSec: market.nowSec,
      tax,
      isPump: id => flags.get(id)?.kind === 'pump'
    }).slice(0, MAX_SPREAD_ROWS)
  }, [market, h1, h24, flags, members])
  const series = useThrottledSeries(screened.slice(0, CHECK_SPREADS).map(r => r.item.id), '1h', active)
  return useMemo(() => {
    const all = screened.map((row, i): SpreadEntry => ({
      row,
      history: i < CHECK_SPREADS ? (series[i] ? spreadHistory(series[i] as SideAverages[], row.live, row.item.id, tax) : undefined) : null,
      dump: flags?.get(row.item.id)?.kind === 'dump'
    }))
    const rows = all.filter(e => !e.history || e.history.z >= HIDE_BELOW_Z)
    return { rows, hidden: all.length - rows.length }
  }, [screened, series, flags])
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
  spread: `Careful margin (the worse of the live and last-hour price on each side, after the 2% tax) against the item's own norm: first the margin between its 24h average prices, then the median hourly margin of the last 7 days once its history loads (top ${CHECK_SPREADS}). Shown at ${SPREAD_MULTIPLE}× the norm or more, both live prices under 20 minutes old, 240+ trades a day, 3+ trades each side in the last hour and 20K+ per buy limit; most profit per limit first. z is in robust σ (scaled median deviation); ${SPREAD_Z}+ is unusual. Rows under ${HIDE_BELOW_Z} are hidden. Thin-volume pumps are left out.`,
  trend: `Screened from the ${CHECK_CANDIDATES} liquid items (10M+ gp a day) that moved most over 7 days, comparing the last hour with the same hour a week ago. Each is then fitted with a line through its 6-hour prices for 7 days; shown when the line explains 70%+ of the moves and changes 0.5%+ a day.`,
  dip: `Screened from the ${CHECK_CANDIDATES} liquid items (10M+ gp a day) down most over 24h or 7d. Shown when the last hour is 8%+ and 2+ standard deviations under the mean of its 6-hour prices over the 30 days before the last 2, that month was range-bound (its trend line moved under 15%, so slow slides after a release don't count), and it trades at least half a normal day's volume. Thin-volume spikes are left out.`
}

const isMode = (v: unknown): v is Mode => MODES.some(m => m.value === v)

// gemetrics:///tools/scanner?mode=trend opens a tab directly.
export default function ScannerScreen () {
  const params = useLocalSearchParams<{ mode?: string }>()
  const data = useScannerData()
  const { settings } = useSettings()
  const { palette } = useTheme()
  const [mode, setMode] = useState<Mode>(isMode(params.mode) ? params.mode : 'spread')
  const [openId, setOpenId] = useState<number | null>(null)
  const toggle = useCallback((id: number) => setOpenId(prev => (prev === id ? null : id)), [])

  const spreads = useSpreadRows(data, settings.membersItems, mode === 'spread')
  const trends = useTrendRows(data.moves, data.prices.market, settings.membersItems, mode === 'trend')
  const dips = useDipRows(data, settings.membersItems, mode === 'dip')

  const rows = useMemo<Row[]>(() => {
    const list: Row[] = mode === 'spread'
      ? spreads.rows.map(spread => ({ key: `s${spread.row.item.id}`, spread }))
      : mode === 'trend'
        ? trends.rows.map(trend => ({ key: `t${trend.item.id}`, trend }))
        : dips.rows.map(dip => ({ key: `d${dip.item.id}`, dip }))
    return [{ key: 'breadth' }, ...list]
  }, [mode, spreads.rows, trends.rows, dips.rows])

  const meta = mode === 'spread'
    ? `${spreads.rows.length} opened${spreads.hidden ? `, ${spreads.hidden} ordinary hidden` : ''}`
    : `Checked ${(mode === 'trend' ? trends : dips).checked} of ${(mode === 'trend' ? trends : dips).total}`

  const renderRow = (r: Row) => {
    if ('spread' in r) return <SpreadScanRow entry={r.spread} expanded={openId === r.spread.row.item.id} onToggle={toggle} />
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
          <Tabs options={MODES} value={mode} onChange={value => { setMode(value); setOpenId(null) }} />
        </ScreenHeader>
      }
      data={rows}
      keyOf={r => r.key}
      extraData={`${openId}-${data.breadth ? 1 : 0}`}
      renderRow={renderRow}
      empty={{ title: 'Nothing yet', body: 'Pull down to refresh.' }}
      footer={
        <>
          {rows.length === 1 ? (
            <Text style={[styles.empty, { color: palette.ink }]}>
              {loadingRows ? 'Checking price history…' : mode === 'spread' ? 'No margins well above their norm right now.' : mode === 'trend' ? 'No steady 7-day trends right now.' : 'Nothing sharply below its 30-day mean right now.'}
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
