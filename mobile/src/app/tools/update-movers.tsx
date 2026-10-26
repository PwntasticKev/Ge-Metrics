import { useQueries } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { computeItemFlip, type Market } from '@ge/engine'
import { useGameUpdates, useItemNameIndex } from '../../api/gameUpdates'
import { useMarket, type MarketState } from '../../api/useMarket'
import { fetchDayAveragesAt } from '../../api/wiki'
import { PriceLine } from '../../components/DetailLines'
import { DetailsLink } from '../../components/DetailsLink'
import { FlipListScreen } from '../../components/FlipListScreen'
import { FlipRow } from '../../components/FlipRow'
import { PostHeader } from '../../components/PostHeader'
import { ScreenHeader } from '../../components/ScreenHeader'
import { Sparkline } from '../../components/Sparkline'
import { changeText, gpPrice, signed, stripUncharged, utcDay } from '../../lib/format'
import { baselineDay, kindLabel, latestItemPosts, type GameUpdate } from '../../lib/gameUpdates'
import { buildMoverGroup, type MoverRow } from '../../lib/updateMovers'
import { useTheme } from '../../theme/ThemeProvider'

const POSTS = 6
const ROWS_PER_POST = 12

type Row =
  | { key: string; post: GameUpdate; hidden: number }
  | { key: string; mover: MoverRow }

function MoverPostHeader ({ post, hidden }: { post: GameUpdate; hidden: number }) {
  return <PostHeader title={post.title} url={post.url} meta={`${kindLabel(post.kind)}, ${utcDay(post.date)}${hidden ? `, ${hidden} more items` : ''}`} />
}

function MoverItemRow ({ mover, market, expanded, onToggle }: { mover: MoverRow; market: Market; expanded: boolean; onToggle: () => void }) {
  const item = market.get(mover.id)
  const flip = item ? computeItemFlip(item, { nowSec: market.nowSec }) : null
  const margin = flip ? `margin ${signed(flip.profit)}` : 'no margin'
  return (
    <FlipRow
      icon={mover.icon}
      name={stripUncharged(mover.name)}
      meta={`${gpPrice(mover.before)} → ${gpPrice(mover.now)}, ${margin}`}
      value={mover.change !== null ? changeText(mover.change) : '–'}
      valueTone={mover.change !== null && mover.change > 0 ? 'profit' : 'ink'}
      valueCaption="since post"
      expanded={expanded}
      onToggle={onToggle}
    >
      <Sparkline itemId={mover.id} />
      {flip ? <PriceLine tag="Buy" label="at" price={flip.buyAt} /> : null}
      {flip ? <PriceLine tag="Sell" label="at" price={flip.sellAt} /> : null}
      <DetailsLink itemId={mover.id} />
    </FlipRow>
  )
}

// Items named in the latest game updates and dev blogs, with their price
// change since the post. News moves prices; this shows how much so far.
export default function UpdateMoversScreen () {
  const prices = useMarket()
  const updates = useGameUpdates()
  const nameIndex = useItemNameIndex()
  const { palette } = useTheme()
  const [openKey, setOpenKey] = useState<string | null>(null)
  const toggle = useCallback((key: string) => setOpenKey(prev => (prev === key ? null : key)), [])

  const posts = useMemo(() => (updates.data && nameIndex ? latestItemPosts(updates.data, nameIndex, POSTS) : []), [updates.data, nameIndex])
  // Past days never change, so each is fetched once per session.
  const baselines = useQueries({
    queries: posts.map(p => ({
      queryKey: ['day-averages', baselineDay(p.update)],
      queryFn: () => fetchDayAveragesAt(baselineDay(p.update)),
      staleTime: Infinity,
      gcTime: 30 * 60_000
    })),
    combine: results => ({ data: results.map(r => r.data), isLoading: results.some(r => r.isLoading) })
  })

  const rows = useMemo<Row[]>(() => {
    const market = prices.market
    if (!market) return []
    return posts.flatMap((p, i): Row[] => {
      const group = buildMoverGroup(p.update, p.itemIds, id => market.get(id), baselines.data[i], ROWS_PER_POST)
      return [
        { key: `post:${p.update.title}`, post: p.update, hidden: group.hidden },
        ...group.rows.map(mover => ({ key: `${p.update.title}:${mover.id}`, mover }))
      ]
    })
  }, [prices.market, posts, baselines.data])

  const market: MarketState = {
    ...prices,
    market: updates.data ? prices.market : null,
    isLoading: prices.isLoading || updates.isLoading,
    error: prices.error ?? (updates.data ? null : (updates.error as Error | null)),
    isRefreshing: prices.isRefreshing || updates.isRefetching,
    refresh: () => {
      prices.refresh()
      updates.refetch()
    }
  }
  const loadingBaselines = baselines.isLoading

  return (
    <FlipListScreen<Row>
      market={market}
      header={<ScreenHeader inset={false} meta={posts.length ? `Last ${posts.length} posts${loadingBaselines ? ', loading prices' : ''}` : undefined} />}
      data={rows}
      keyOf={r => r.key}
      extraData={openKey}
      renderRow={r => {
        if ('post' in r) return <MoverPostHeader post={r.post} hidden={r.hidden} />
        if (!prices.market) return <View />
        return <MoverItemRow mover={r.mover} market={prices.market} expanded={openKey === r.key} onToggle={() => toggle(r.key)} />
      }}
      empty={{ title: 'No recent posts name tradeable items', body: 'Game updates and dev blogs come from the OSRS Wiki. Pull down to refresh.' }}
      footer={<Text style={[styles.note, { color: palette.muted }]}>Change is the mid price now against the average of the day before the post. Items are found by name in each post on the OSRS Wiki; up to {ROWS_PER_POST} biggest moves per post.</Text>}
    />
  )
}

const styles = StyleSheet.create({
  note: { fontSize: 12.5, textAlign: 'center', padding: 20, lineHeight: 18 }
})
