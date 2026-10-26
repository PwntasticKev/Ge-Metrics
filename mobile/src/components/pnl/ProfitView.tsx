import { geTax } from '@ge/engine'
import { useScrollToTop } from 'expo-router'
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native'
import { useMarket } from '../../api/useMarket'
import { holdVsLimit, losingItems, unrealized } from '../../lib/pnl/insights'
import { bestAndWorst, dailyBars, inPeriod, itemLeaderboard, localDayStart, totals, type Period } from '../../lib/pnl/summary'
import { useNow } from '../../lib/useNow'
import { useFlips } from '../../state/flips'
import { useTheme } from '../../theme/ThemeProvider'
import { space } from '../../theme/tokens'
import { EmptyState } from '../ListStates'
import { Pills } from '../Tabs'
import { DataActions } from './DataActions'
import { InsightsCard } from './InsightsCard'
import { ItemBoard } from './ItemBoard'
import { JournalRow } from './JournalRow'
import { ProfitChart } from './ProfitChart'
import { SummaryCard } from './SummaryCard'
import { pnlStyles } from './styles'

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: 'all', label: 'All' }
] as const
const PERIOD_LABEL: Record<Period, string> = { today: 'today', '7d': 'last 7 days', '30d': 'last 30 days', all: 'all time' }
const DAY_MS = 86_400_000
const MAX_CHART_DAYS = 90
const PAGE = 20

/** Bars to draw: a week for short periods, a month, or back to the first flip (up to 90 days). */
function chartDays (period: Period, oldest: number | null, now: number): number {
  if (period === 'today' || period === '7d') return 7
  if (period === '30d' || oldest === null) return 30
  const span = Math.ceil((localDayStart(now) - localDayStart(oldest)) / DAY_MS) + 1
  return Math.min(MAX_CHART_DAYS, Math.max(30, span))
}

// The Profit view of the Watchlist tab: did flipping actually make money?
export function ProfitView ({ header }: { header: ReactNode }) {
  const { palette } = useTheme()
  const { flips, holdings, removeFlip } = useFlips()
  const { market } = useMarket()
  const now = useNow()
  const [period, setPeriod] = useState<Period>('30d')
  const [openId, setOpenId] = useState<string | null>(null)
  const [shown, setShown] = useState(PAGE)
  const scrollRef = useRef<ScrollViewInstance>(null)
  useScrollToTop(scrollRef)

  const view = useMemo(() => {
    const selected = inPeriod(flips, period, now)
    const oldest = flips.length ? flips[flips.length - 1].soldAt : null
    return {
      selected,
      totals: totals(selected),
      days: dailyBars(flips, chartDays(period, oldest, now), now),
      extremes: bestAndWorst(selected),
      board: itemLeaderboard(selected),
      losers: losingItems(selected),
      hold: holdVsLimit(selected)
    }
  }, [flips, period, now])
  const open = useMemo(() => unrealized(holdings, id => market?.get(id)?.low ?? null, geTax), [holdings, market])
  const toggle = useCallback((id: string) => setOpenId(prev => (prev === id ? null : id)), [])
  const journal = useMemo(() => ({ lots: holdings, flips }), [holdings, flips])

  const { best, worst } = view.extremes
  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      {header}
      <ScrollView ref={scrollRef} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.list}>
        {!flips.length ? (
          <EmptyState title="No flips yet" body={'Mark something sold on the Bought tab and its profit after tax, ROI and hold time land here. Or restore a CSV below.'} />
        ) : (
          <>
            <Pills options={PERIOD_OPTIONS} value={period} onChange={value => { setPeriod(value); setShown(PAGE); setOpenId(null) }} />
            <View style={styles.pad}>
              <SummaryCard totals={view.totals} periodLabel={PERIOD_LABEL[period]} open={open} />
              <View style={[pnlStyles.card, { backgroundColor: palette.card, borderColor: palette.rule }]}>
                <ProfitChart days={view.days} />
              </View>
              {best ? (
                <>
                  <Text style={[pnlStyles.section, { color: palette.muted }]}>Best and worst</Text>
                  <View style={[pnlStyles.group, { backgroundColor: palette.card, borderColor: palette.rule }]}>
                    <JournalRow flip={best} tag="Best" expanded={openId === `best:${best.id}`} onToggle={() => toggle(`best:${best.id}`)} />
                    {worst ? <View style={{ height: 0.5, backgroundColor: palette.rule }} /> : null}
                    {worst ? <JournalRow flip={worst} tag="Worst" expanded={openId === `worst:${worst.id}`} onToggle={() => toggle(`worst:${worst.id}`)} /> : null}
                  </View>
                </>
              ) : null}
              <Text style={[pnlStyles.section, { color: palette.muted }]}>Insights</Text>
              <InsightsCard losers={view.losers} hold={view.hold} taxPaid={view.totals.taxPaid} profit={view.totals.profit} />
              {view.board.length ? <Text style={[pnlStyles.section, { color: palette.muted }]}>By item</Text> : null}
              {view.board.length ? <ItemBoard records={view.board} /> : null}
              {view.selected.length ? <Text style={[pnlStyles.section, { color: palette.muted }]}>Flips ({view.selected.length})</Text> : null}
              {view.selected.length ? (
                <View style={[pnlStyles.group, { backgroundColor: palette.bg, borderColor: palette.rule }]}>
                  {view.selected.slice(0, shown).map((f, i) => (
                    <View key={f.id} style={i > 0 ? { borderTopWidth: 0.5, borderTopColor: palette.rule } : undefined}>
                      <JournalRow flip={f} expanded={openId === f.id} onToggle={toggle} onDelete={removeFlip} />
                    </View>
                  ))}
                  {view.selected.length > shown ? (
                    <Pressable onPress={() => setShown(n => n + PAGE * 2)} style={[pnlStyles.row, { borderTopWidth: 0.5, borderTopColor: palette.rule, justifyContent: 'center' }]} accessibilityRole="button">
                      <Text style={[pnlStyles.link, { color: palette.brand }]}>Show more ({view.selected.length - shown} left)</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : (
                <Text style={[pnlStyles.note, { color: palette.muted, textAlign: 'center' }]}>No flips sold {PERIOD_LABEL[period]}.</Text>
              )}
            </View>
          </>
        )}
        <View style={styles.pad}>
          <DataActions journal={journal} />
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  list: { paddingBottom: 120 },
  pad: { paddingHorizontal: space.lg, gap: space.md, paddingTop: space.sm }
})
