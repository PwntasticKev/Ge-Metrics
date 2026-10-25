import { useCallback, useMemo, useState } from 'react'
import { computeItemFlip, computeProcessFlip, computeSetFlip, type ItemFlip, type ProcessFlip, type SetFlip } from '@ge/engine'
import { useMarket } from '../api/useMarket'
import { FlipListScreen } from '../components/FlipListScreen'
import { ItemFlipRow } from '../components/ItemFlipRow'
import { ProcessFlipRow } from '../components/ProcessFlipRow'
import { ScreenHeader } from '../components/ScreenHeader'
import { SetFlipRow } from '../components/SetFlipRow'
import { findProcessRecipe } from '../lib/methods'
import { RECIPES } from '../lib/ranking'
import { useWatchlist } from '../state/watchlist'

type Row = { key: string; set: SetFlip } | { key: string; item: ItemFlip } | { key: string; process: ProcessFlip }

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
      if (entry.kind === 'process') {
        const recipe = findProcessRecipe(entry.id, m)
        const process = recipe ? computeProcessFlip(recipe, m) : null
        return process ? [{ key: `process:${entry.id}`, process }] : []
      }
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
      renderRow={r => {
        if ('set' in r) return <SetFlipRow flip={r.set} expanded={openKey === r.key} onToggle={() => toggle(r.key)} />
        if ('process' in r) return <ProcessFlipRow flip={r.process} sortBy={r.process.perHour !== null ? 'perHour' : 'profit'} expanded={openKey === r.key} onToggle={() => toggle(r.key)} />
        return <ItemFlipRow flip={r.item} expanded={openKey === r.key} onToggle={() => toggle(r.key)} />
      }}
      empty={{ title: 'Nothing starred yet', body: 'Open any set, item or tool and tap Watch to keep it here.' }}
    />
  )
}
