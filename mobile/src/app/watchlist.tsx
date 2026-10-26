import { useLocalSearchParams } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import { computeItemFlip, computeProcessFlip, computeSetFlip, type ItemFlip, type ProcessFlip, type SetFlip } from '@ge/engine'
import { useAverages } from '../api/useAverages'
import { useMarket } from '../api/useMarket'
import { FlipListScreen } from '../components/FlipListScreen'
import { ItemAlerts, alertItemFromFlip } from '../components/alerts/ItemAlerts'
import { HoldingRow } from '../components/HoldingRow'
import { ItemFlipRow } from '../components/ItemFlipRow'
import { ProcessFlipRow } from '../components/ProcessFlipRow'
import { ProfitView } from '../components/pnl/ProfitView'
import { ScreenHeader } from '../components/ScreenHeader'
import { SetFlipRow } from '../components/SetFlipRow'
import { Tabs } from '../components/Tabs'
import { signed } from '../lib/format'
import { findProcessRecipe } from '../lib/methods'
import { startOfToday, useNow } from '../lib/useNow'
import { RECIPES } from '../lib/ranking'
import { useFlips, type Holding } from '../state/flips'
import { useWatchlist } from '../state/watchlist'

type Row =
  | { key: string; set: SetFlip }
  | { key: string; item: ItemFlip }
  | { key: string; process: ProcessFlip }
  | { key: string; holding: Holding }

type WatchView = 'watching' | 'bought' | 'profit'

const VIEWS = [
  { value: 'watching', label: 'Watching' },
  { value: 'bought', label: 'Bought' },
  { value: 'profit', label: 'Profit' }
] as const

// `gemetrics:///watchlist?view=profit` opens a view directly.
const initialView = (v: string | undefined): WatchView => (VIEWS.some(o => o.value === v) ? v as WatchView : 'watching')

const recipeById = new Map(RECIPES.map(r => [r.id, r]))

// Starred sets and items, priced live, plus what you've bought and still hold.
// Unlike the ranked lists, nothing here hides when the margin is gone.
export default function WatchlistScreen () {
  const market = useMarket()
  const { h1, h24 } = useAverages()
  const { entries } = useWatchlist()
  const { holdings, flips } = useFlips()
  const params = useLocalSearchParams<{ view?: string }>()
  const [view, setView] = useState<WatchView>(() => initialView(params.view))
  // A link can arrive while the tab is already mounted: follow a changed param.
  const [linkedView, setLinkedView] = useState(params.view)
  if (params.view !== linkedView) {
    setLinkedView(params.view)
    if (params.view) setView(initialView(params.view))
  }
  const [openKey, setOpenKey] = useState<string | null>(null)

  const watchRows = useMemo<Row[]>(() => {
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

  const holdingRows = useMemo<Row[]>(() => holdings.map(holding => ({ key: holding.id, holding })), [holdings])
  // Ticks every minute even offline, so "limit resets" and today's total stay right.
  const now = useNow()
  const madeToday = useMemo(() => {
    const since = startOfToday(now)
    return flips.filter(s => s.soldAt >= since).reduce((sum, s) => sum + s.profit, 0)
  }, [flips, now])

  const toggle = useCallback((key: string) => setOpenKey(prev => (prev === key ? null : key)), [])
  const meta = view === 'watching'
    ? (entries.length ? `${entries.length} starred` : undefined)
    : (flips.length ? `${signed(madeToday)} made today` : undefined)
  const header = (
    <ScreenHeader title="Watchlist" meta={meta}>
      <Tabs options={VIEWS} value={view} onChange={value => { setView(value); setOpenKey(null) }} />
    </ScreenHeader>
  )

  if (view === 'profit') return <ProfitView header={header} />
  return (
    <FlipListScreen<Row>
      market={market}
      header={header}
      data={view === 'watching' ? watchRows : holdingRows}
      keyOf={r => r.key}
      extraData={`${openKey}:${now}`}
      renderRow={r => {
        if ('holding' in r) return <HoldingRow holding={r.holding} item={market.market?.get(r.holding.itemId) ?? null} h1={h1?.[r.holding.itemId]} h24={h24?.[r.holding.itemId]} now={now} expanded={openKey === r.key} onToggle={toggle} />
        if ('set' in r) return <SetFlipRow flip={r.set} expanded={openKey === r.key} onToggle={() => toggle(r.key)} />
        if ('process' in r) return <ProcessFlipRow flip={r.process} sortBy={r.process.perHour !== null ? 'perHour' : 'profit'} expanded={openKey === r.key} onToggle={() => toggle(r.key)} />
        return <ItemFlipRow flip={r.item} expanded={openKey === r.key} onToggle={() => toggle(r.key)} footer={<ItemAlerts item={alertItemFromFlip(r.item)} />} />
      }}
      empty={view === 'watching'
        ? { title: 'Nothing starred yet', body: 'Open any set, item or tool and tap Watch to keep it here.' }
        : { title: 'Nothing bought yet', body: 'Open a pick on Buy now or Items and tap "I bought these". We\'ll track it here and remind you when the buy limit resets.' }}
    />
  )
}
