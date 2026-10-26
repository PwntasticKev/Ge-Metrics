import { useCallback, useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import type { BuyPick } from '@ge/engine'
import { useAverages } from '../api/useAverages'
import { useMarket, type MarketState } from '../api/useMarket'
import { FlipListScreen } from '../components/FlipListScreen'
import { PickRow } from '../components/PickRow'
import { ScreenHeader } from '../components/ScreenHeader'
import { Tabs } from '../components/Tabs'
import { gpShort, minutesAgo } from '../lib/format'
import { usePicks, type PickMode } from '../lib/picks'
import { useSettings } from '../state/settings'
import { useTheme } from '../theme/ThemeProvider'

const MODES = [
  { value: 'quick', label: 'Next 4 hours' },
  { value: 'overnight', label: 'Overnight' }
] as const

const FOOTERS: Record<PickMode, string> = {
  quick: 'Prices are the more careful of live and last-hour prices, so one odd trade can\'t fake a margin. Amounts are sized so each side of the market trades at least 6 times your amount a day.',
  overnight: 'Offers at the typical low and high of the last 24 hours, sized to fill over 8 hours. Items that moved away from those prices in the last hour, or trade less than once an hour, are left out.'
}

// Home tab: open the app, see exactly what to buy and what to sell it for.
export default function BuyNowScreen () {
  const prices = useMarket()
  const averages = useAverages()
  const { palette } = useTheme()
  const { settings } = useSettings()
  const [mode, setMode] = useState<PickMode>('quick')
  const [openId, setOpenId] = useState<number | null>(null)
  const picks = usePicks(prices.market, averages.h1, averages.h24, mode)
  const onToggle = useCallback((id: number) => setOpenId(prev => (prev === id ? null : id)), [])

  // The list needs both live prices and averages before it can rank anything.
  const market: MarketState = {
    ...prices,
    market: picks ? prices.market : null,
    isLoading: prices.isLoading || (!picks && averages.isLoading),
    error: prices.error ?? averages.error,
    isRefreshing: prices.isRefreshing || averages.isRefreshing,
    refresh: () => {
      prices.refresh()
      averages.refresh()
    }
  }

  return (
    <FlipListScreen<BuyPick>
      market={market}
      header={
        <ScreenHeader title="Buy now" meta={picks ? `${settings.budget ? `With ${gpShort(settings.budget)}, ` : ''}${minutesAgo(prices.updatedAt)}` : undefined}>
          <Tabs options={MODES} value={mode} onChange={value => { setMode(value); setOpenId(null) }} />
        </ScreenHeader>
      }
      data={picks ?? []}
      keyOf={p => String(p.id)}
      extraData={`${openId}:${mode}`}
      renderRow={p => <PickRow pick={p} mode={mode} expanded={openId === p.id} onToggle={onToggle} />}
      empty={{ title: 'Nothing worth buying right now', body: 'Prices move all day. Pull down to refresh.' }}
      footer={<Text style={[styles.note, { color: palette.muted }]}>{FOOTERS[mode]}</Text>}
    />
  )
}

const styles = StyleSheet.create({
  note: { fontSize: 12.5, textAlign: 'center', padding: 20, lineHeight: 18 }
})
