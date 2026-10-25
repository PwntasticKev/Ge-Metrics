import { useCallback, useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import type { ItemFlip, SortMetric } from '@ge/engine'
import { useMarket } from '../api/useMarket'
import { FlipListScreen } from '../components/FlipListScreen'
import { ItemFlipRow } from '../components/ItemFlipRow'
import { ScreenHeader } from '../components/ScreenHeader'
import { Tabs } from '../components/Tabs'
import { useRankedItems } from '../lib/ranking'
import { useTheme } from '../theme/ThemeProvider'

const SORTS = [
  { value: 'potential', label: '4h profit' },
  { value: 'profit', label: 'Each' },
  { value: 'roi', label: 'ROI' }
] as const

export default function ItemsScreen () {
  const market = useMarket()
  const { palette } = useTheme()
  const [sortBy, setSortBy] = useState<SortMetric>('potential')
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<number | null>(null)
  const { flips, total } = useRankedItems(market.market, sortBy, query)
  const onToggle = useCallback((id: number) => setOpenId(prev => (prev === id ? null : id)), [])

  return (
    <FlipListScreen<ItemFlip>
      market={market}
      header={
        <ScreenHeader
          title="Items"
          meta={market.market ? `${total.toLocaleString('en-US')} profitable` : undefined}
          search={{ value: query, onChange: setQuery, placeholder: 'Search items' }}
        >
          <Tabs options={SORTS} value={sortBy} onChange={setSortBy} />
        </ScreenHeader>
      }
      data={flips}
      keyOf={f => String(f.id)}
      extraData={openId}
      renderRow={f => <ItemFlipRow flip={f} expanded={openId === f.id} onToggle={onToggle} />}
      empty={{ title: query ? 'No matching items' : 'No profitable items right now', body: query ? 'Try a shorter search.' : 'Pull down to refresh.' }}
      footer={total > flips.length
        ? <Text style={[styles.more, { color: palette.muted }]}>Showing the top {flips.length} of {total.toLocaleString('en-US')}. Search to find the rest.</Text>
        : null}
    />
  )
}

const styles = StyleSheet.create({
  more: { textAlign: 'center', fontSize: 13, padding: 20 }
})
