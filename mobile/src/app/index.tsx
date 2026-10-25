import { useCallback, useState } from 'react'
import type { SetFlip, SortMetric } from '@ge/engine'
import { useMarket } from '../api/useMarket'
import { FlipListScreen } from '../components/FlipListScreen'
import { Notice } from '../components/ListStates'
import { ScreenHeader } from '../components/ScreenHeader'
import { SetFlipRow } from '../components/SetFlipRow'
import { Pills, Tabs } from '../components/Tabs'
import { useRankedSets, type SetKind } from '../lib/ranking'
import { gpShort, minutesAgo } from '../lib/format'
import { useSettings } from '../state/settings'

const SORTS = [
  { value: 'potential', label: '4h profit' },
  { value: 'profit', label: 'Each' },
  { value: 'roi', label: 'ROI' }
] as const

const KINDS = [
  { value: 'all', label: 'All' },
  { value: 'ge-set', label: 'GE sets' },
  { value: 'combine', label: 'Crafted' }
] as const

export default function SetsScreen () {
  const market = useMarket()
  const { settings, update } = useSettings()
  const [sortBy, setSortBy] = useState<SortMetric>('potential')
  const [kind, setKind] = useState<SetKind>('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const flips = useRankedSets(market.market, sortBy, kind, query)
  const onToggle = useCallback((id: string) => {
    setOpenId(prev => (prev === id ? null : id))
    if (!settings.seenSetsTip) update({ seenSetsTip: true })
  }, [settings.seenSetsTip, update])

  return (
    <FlipListScreen<SetFlip>
      market={market}
      header={
        <ScreenHeader title="Sets" meta={market.market ? `${flips.length} profitable${settings.budget ? ` with ${gpShort(settings.budget)}` : ''}, ${minutesAgo(market.updatedAt)}` : undefined} search={{ value: query, onChange: setQuery, placeholder: 'Search sets' }}>
          <Tabs options={SORTS} value={sortBy} onChange={setSortBy} />
          <Pills options={KINDS} value={kind} onChange={setKind} />
          {!settings.seenSetsTip ? <Notice text="Tap a set to see what to pay for each part and what to sell the set for." /> : null}
        </ScreenHeader>
      }
      data={flips}
      keyOf={f => f.id}
      extraData={openId}
      renderRow={f => <SetFlipRow flip={f} expanded={openId === f.id} onToggle={onToggle} />}
      empty={{ title: 'No profitable sets right now', body: 'Prices move all day. Pull down to refresh.' }}
    />
  )
}
