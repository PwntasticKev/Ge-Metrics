import { useQueries, useQuery } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import { useComingUp } from '../../api/comingUp'
import { useGameUpdates, useItemNameIndex } from '../../api/gameUpdates'
import { useMarket, type MarketState } from '../../api/useMarket'
import { fetchDayAveragesAt } from '../../api/wiki'
import { ComingItemRow } from '../../components/ComingItemRow'
import { FlipListScreen } from '../../components/FlipListScreen'
import { PostHeader } from '../../components/PostHeader'
import { ScreenHeader } from '../../components/ScreenHeader'
import { Tabs } from '../../components/Tabs'
import { buildComingUp, LATE_MOVE, pendingOnly, type ComingRow } from '../../lib/comingUp'
import type { ComingPost } from '../../lib/comingUpParse'
import { utcDay } from '../../lib/format'
import { baselineDay, DAY_MS, kindLabel } from '../../lib/gameUpdates'
import { useNow } from '../../lib/useNow'
import { useTheme } from '../../theme/ThemeProvider'

type Mode = 'pending' | 'all'
const MODES = [
  { value: 'pending', label: 'Not out yet' },
  { value: 'all', label: 'All' }
] as const
const DAY_SEC = 86_400
const WEEK_DAYS = 7

type Row =
  | { key: string; post: ComingPost }
  | { key: string; row: ComingRow }

// Past days never change; fetch each once per session.
function dayQuery (daySec: number) {
  return { queryKey: ['day-averages', daySec], queryFn: () => fetchDayAveragesAt(daySec), staleTime: Infinity, gcTime: 30 * 60_000 }
}

function postMeta (post: ComingPost): string {
  const closes = post.kind === 'poll' && post.closes !== null ? `, voting until ${utcDay(post.closes)}` : ''
  return `${kindLabel(post.kind)}, ${utcDay(post.date)}${closes}`
}

// Items named in dev blogs, polls and "next week" lines, before they ship:
// buy ahead of a content-driven spike, and see when it's already too late.
export default function ComingUpScreen () {
  const prices = useMarket()
  const coming = useComingUp()
  const updates = useGameUpdates()
  const names = useItemNameIndex()
  const { palette } = useTheme()
  const [mode, setMode] = useState<Mode>('pending')
  const [openKey, setOpenKey] = useState<string | null>(null)
  const toggle = useCallback((key: string) => setOpenKey(prev => (prev === key ? null : key)), [])
  const now = useNow(15 * 60_000)

  const posts = useMemo(() => coming.data ?? [], [coming.data])
  const baselines = useQueries({
    queries: posts.map(p => dayQuery(baselineDay(p))),
    combine: results => results.map(r => r.data)
  })
  const weekAgoDay = Math.floor((now - WEEK_DAYS * DAY_MS) / 1000 / DAY_SEC) * DAY_SEC
  const weekAgo = useQuery(dayQuery(weekAgoDay))

  const groups = useMemo(() => {
    const market = prices.market
    if (!market || !names) return []
    const all = buildComingUp(posts, {
      names,
      getItem: id => market.get(id),
      gameUpdates: updates.data ?? [],
      baselineFor: post => baselines[posts.indexOf(post)],
      weekAgo: weekAgo.data,
      now
    })
    return mode === 'pending' ? pendingOnly(all) : all
  }, [prices.market, names, posts, updates.data, baselines, weekAgo.data, mode, now])

  const rows = useMemo<Row[]>(() => groups.flatMap(g => [
    { key: `post:${g.post.kind}:${g.post.title}`, post: g.post },
    ...g.rows.map(row => ({ key: `${g.post.title}:${row.id}`, row }))
  ]), [groups])

  const market: MarketState = {
    ...prices,
    market: coming.data ? prices.market : null,
    isLoading: prices.isLoading || coming.isLoading,
    error: prices.error ?? (coming.data ? null : (coming.error as Error | null)),
    isRefreshing: prices.isRefreshing || coming.isRefetching,
    refresh: () => {
      prices.refresh()
      coming.refetch()
    }
  }
  const items = groups.reduce((n, g) => n + g.rows.length, 0)

  return (
    <FlipListScreen<Row>
      market={market}
      header={
        <ScreenHeader inset={false} meta={coming.data ? `${items} items in ${groups.length} posts` : undefined}>
          <Tabs options={MODES} value={mode} onChange={value => { setMode(value); setOpenKey(null) }} />
        </ScreenHeader>
      }
      data={rows}
      keyOf={r => r.key}
      extraData={openKey}
      renderRow={r => ('post' in r
        ? <PostHeader title={r.post.title} url={r.post.url} meta={postMeta(r.post)} />
        : <ComingItemRow row={r.row} expanded={openKey === r.key} onToggle={() => toggle(r.key)} />)}
      empty={{ title: 'Nothing announced right now', body: 'Dev blogs, polls and game updates from the last 3 months that name tradeable items show up here. Pull down to refresh.' }}
      footer={
        <Text style={[styles.note, { color: palette.muted }]}>
          Items are found by name in each post on the OSRS Wiki. The ▲ / ▼ guess comes from keywords in the quoted sentence (new use, more supply, buff, nerf); read the sentence before you buy. Late means the price already moved {Math.round(LATE_MOVE * 100)}% or more since the post. Released means a later game update names the item. Failed poll questions are left out.
        </Text>
      }
    />
  )
}

const styles = StyleSheet.create({
  note: { fontSize: 12.5, textAlign: 'center', padding: 20, lineHeight: 18 }
})
