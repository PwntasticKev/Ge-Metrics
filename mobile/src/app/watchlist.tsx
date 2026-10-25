import { useCallback, useMemo, useState } from 'react'
import { computeItemFlip, computeSetFlip, type ItemFlip, type SetFlip } from '@ge/engine'
import { useMarket } from '../api/useMarket'
import { FlipListScreen } from '../components/FlipListScreen'
import { ItemFlipRow } from '../components/ItemFlipRow'
import { ScreenHeader } from '../components/ScreenHeader'
import { SetFlipRow } from '../components/SetFlipRow'
import { RECIPES } from '../lib/ranking'
import { useWatchlist } from '../state/watchlist'

type Row = { key: string; set: SetFlip } | { key: string; item: ItemFlip }

const recipeById = new Map(RECIPES.map(r => [r.id, r]))

// Starred sets and items, priced live. Unlike the ranked lists these stay
// visible even when the margin is gone, so you can see it come back.
export default function WatchlistScreen () {
  const market = useMarket()
  const { entries } = useWatchlist()
  const [openKey, setOpenKey] = useState<string | null>(null)

  const rows = useMemo<Row[]>(() => {
    const m = market.market
    if (!m) return []
    return entries.flatMap((entry): Row[] => {
      if (entry.kind === 'set') {
        const recipe = recipeById.get(entry.id)
        const set = recipe ? computeSetFlip(recipe, m) : null
        return set ? [{ key: `set:${entry.id}`, set }] : []
      }
      const marketItem = m.get(entry.id)
      const item = marketItem ? computeItemFlip(marketItem, { nowSec: m.nowSec }) : null
      return item ? [{ key: `item:${entry.id}`, item }] : []
    })
  }, [market.market, entries])

  const toggle = useCallback((key: string) => setOpenKey(prev => (prev === key ? null : key)), [])

  return (
    <FlipListScreen<Row>
      market={market}
      header={<ScreenHeader title="Watchlist" meta={entries.length ? `${entries.length} starred` : undefined} />}
      data={rows}
      keyOf={r => r.key}
      extraData={openKey}
      renderRow={r => ('set' in r
        ? <SetFlipRow flip={r.set} expanded={openKey === r.key} onToggle={() => toggle(r.key)} />
        : <ItemFlipRow flip={r.item} expanded={openKey === r.key} onToggle={() => toggle(r.key)} />)}
      empty={{ title: 'Nothing starred yet', body: 'Open any set or item and tap Watch to keep it here.' }}
    />
  )
}
