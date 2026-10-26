import { useQueries } from '@tanstack/react-query'
import { memo, useCallback, useMemo, useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import type { MarketItem } from '@ge/engine'
import { useAverages } from '../../api/useAverages'
import { useMarket, type MarketState } from '../../api/useMarket'
import { useSpikeFlags } from '../../api/useThinSpikes'
import { fetchTimeseries } from '../../api/wiki'
import { DetailsLink } from '../../components/DetailsLink'
import { FlipListScreen } from '../../components/FlipListScreen'
import { FlipRow } from '../../components/FlipRow'
import { ScreenHeader } from '../../components/ScreenHeader'
import { Sparkline } from '../../components/Sparkline'
import { Tabs } from '../../components/Tabs'
import { gpPrice, gpShort, stripUncharged } from '../../lib/format'
import { hourlyCheck, spikeText, Z_THRESHOLD, type HourlyCheck, type SpikeFlag } from '../../lib/thinSpikes'
import { useTheme } from '../../theme/ThemeProvider'

type Mode = 'pump' | 'dump'
const MODES = [
  { value: 'pump', label: 'Pumps' },
  { value: 'dump', label: 'Dumps' }
] as const
// Hourly history is one request per item; check the biggest moves only.
const MAX_ROWS = 25

interface Row {
  item: MarketItem
  flag: SpikeFlag
  check: HourlyCheck | null
}

function sigmaText (check: HourlyCheck | null): string {
  return check ? `${Math.abs(check.z).toFixed(1)}σ` : '–'
}

function checkLine (check: HourlyCheck | null): string {
  if (!check) return 'Not enough hourly history to compare with the last week.'
  const volume = check.volumeRatio !== null ? ` on ${Math.round(check.volumeRatio * 100)}% of a typical hour's volume` : ''
  const verdict = check.confirmed ? 'Far outside its usual swings.' : 'Within what this item has done this week.'
  return `Last full hour moved ${(check.change * 100).toFixed(1)}%, ${Math.abs(check.z).toFixed(1)} times its usual hourly move${volume}. ${verdict}`
}

const PumpRow = memo(function PumpRow ({ row, expanded, onToggle }: { row: Row; expanded: boolean; onToggle: (id: number) => void }) {
  const { palette } = useTheme()
  const { item, flag, check } = row
  return (
    <FlipRow
      icon={item.icon}
      name={stripUncharged(item.name)}
      meta={`${flag.change >= 0 ? '+' : ''}${(flag.change * 100).toFixed(1)}% ${flag.trigger === 'hour' ? 'in 1h' : 'in 5m'}, ${Math.round(flag.volumeRatio * 100)}% of usual volume`}
      value={sigmaText(check)}
      valueTone={check?.confirmed ? 'profit' : 'ink'}
      valueCaption="vs 7d"
      expanded={expanded}
      onToggle={() => onToggle(item.id)}
    >
      <Sparkline itemId={item.id} />
      <Text style={[styles.line, { color: palette.ink }]}>{spikeText(flag)}.</Text>
      <Text style={[styles.line, { color: palette.ink }]}>{checkLine(check)}</Text>
      <Text style={[styles.line, { color: palette.muted }]}>Live {gpPrice(item.low)} / {gpPrice(item.high)}, {gpShort(item.dailyVolume)} traded a day.</Text>
      <DetailsLink itemId={item.id} />
    </FlipRow>
  )
})

// Items whose price jumped (or fell) sharply on few trades. Such moves are
// often a few players pushing the price and tend to snap back.
export default function PumpsScreen () {
  const prices = useMarket()
  const averages = useAverages()
  const flags = useSpikeFlags(prices.market)
  const { palette } = useTheme()
  const [mode, setMode] = useState<Mode>('pump')
  const [openId, setOpenId] = useState<number | null>(null)
  const toggle = useCallback((id: number) => setOpenId(prev => (prev === id ? null : id)), [])

  const candidates = useMemo(() => {
    const market = prices.market
    if (!market || !flags) return []
    return [...flags]
      .filter(([, f]) => f.kind === mode)
      .map(([id, flag]) => ({ item: market.get(id), flag }))
      .filter((c): c is { item: MarketItem; flag: SpikeFlag } => c.item !== null)
      .sort((a, b) => Math.abs(b.flag.change) - Math.abs(a.flag.change))
      .slice(0, MAX_ROWS)
  }, [prices.market, flags, mode])

  // Same query as the row sparklines, so expanding a row costs nothing.
  const series = useQueries({
    queries: candidates.map(c => ({ queryKey: ['timeseries', c.item.id, '1h'], queryFn: () => fetchTimeseries(c.item.id, '1h'), staleTime: 10 * 60_000 })),
    combine: results => results.map(r => r.data)
  })

  const rows = useMemo<Row[]>(() => candidates
    .map((c, i) => ({ ...c, check: series[i] ? hourlyCheck(series[i]) : null }))
    // Confirmed first, then by how unusual the move is.
    .sort((a, b) => Number(Boolean(b.check?.confirmed)) - Number(Boolean(a.check?.confirmed)) || Math.abs(b.check?.z ?? 0) - Math.abs(a.check?.z ?? 0)),
  [candidates, series])

  const market: MarketState = {
    ...prices,
    market: flags ? prices.market : null,
    isLoading: prices.isLoading || (!flags && averages.isLoading),
    error: prices.error ?? averages.error,
    isRefreshing: prices.isRefreshing || averages.isRefreshing,
    refresh: () => {
      prices.refresh()
      averages.refresh()
    }
  }
  const total = flags ? [...flags.values()].filter(f => f.kind === mode).length : 0

  return (
    <FlipListScreen<Row>
      market={market}
      header={
        <ScreenHeader inset={false} meta={flags ? `${total} flagged now` : undefined}>
          <Tabs options={MODES} value={mode} onChange={value => { setMode(value); setOpenId(null) }} />
        </ScreenHeader>
      }
      data={rows}
      keyOf={r => String(r.item.id)}
      extraData={openId}
      renderRow={r => <PumpRow row={r} expanded={openId === r.item.id} onToggle={toggle} />}
      empty={{ title: mode === 'pump' ? 'No thin-volume pumps right now' : 'No thin-volume dumps right now', body: 'Pull down to refresh.' }}
      footer={
        <Text style={[styles.note, { color: palette.muted }]}>
          Flagged when both buy and sell prices in the last hour are 8%+ away from the day&apos;s average on under 60% of a typical hour&apos;s volume, or a few items traded in the last 5 minutes land 12%+ away from both the hour and the day (busy items only). σ compares the last full hour with every hour of the past week; {Z_THRESHOLD}σ or more is unusual for that item. Pumps are left out of Buy now.
        </Text>
      }
    />
  )
}

const styles = StyleSheet.create({
  line: { fontSize: 13, lineHeight: 18, paddingTop: 4 },
  note: { fontSize: 12.5, textAlign: 'center', padding: 20, lineHeight: 18 }
})
