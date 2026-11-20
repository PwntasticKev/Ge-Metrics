import { useCallback, useMemo, useState } from 'react'
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import type { ProcessFlip } from '@ge/engine'
import { useMarket } from '../../api/useMarket'
import { rankHighAlch } from '../../lib/highAlch'
import { useSettings } from '../../state/settings'
import { PriceLine } from '../../components/DetailLines'
import { FlipListScreen } from '../../components/FlipListScreen'
import { FlipRow } from '../../components/FlipRow'
import { ScreenHeader } from '../../components/ScreenHeader'
import { gpFull, signed } from '../../lib/format'
import { useTheme } from '../../theme/ThemeProvider'
import { space } from '../../theme/tokens'

const WEBSITE = 'https://ge-metrics.vercel.app'

export default function ToolsScreen () {
  const market = useMarket()
  const { palette } = useTheme()
  const { settings } = useSettings()
  const [openId, setOpenId] = useState<string | null>(null)
  const { rows, nature } = useMemo(
    () => (market.market
      ? rankHighAlch(market.market, { budget: settings.budget, hideFlukes: settings.hideFlukes, hideStale: settings.hideStale })
      : { rows: [], nature: null }),
    [market.market, settings.budget, settings.hideFlukes, settings.hideStale]
  )
  const toggle = useCallback((id: string) => setOpenId(prev => (prev === id ? null : id)), [])

  return (
    <FlipListScreen<ProcessFlip>
      market={market}
      header={<ScreenHeader inset={false} meta={nature ? `Nature rune ${gpFull(nature)}` : undefined} />}
      data={rows}
      keyOf={r => r.id}
      extraData={openId}
      renderRow={r => (
        <FlipRow
          icon={r.icon}
          name={r.name}
          badges={[...(r.stale ? ['Stale'] : []), ...(r.suspicious ? ['Fluke?'] : [])]}
          meta={`${signed(r.profit)} per cast${r.maxActions !== null ? `, ${signed(r.potential ?? 0)} per 4h (${r.maxActions} casts)` : ''}`}
          value={r.perHour !== null ? signed(r.perHour) : signed(r.profit)}
          valueCaption={r.perHour !== null ? 'per hour' : 'per cast'}
          expanded={openId === r.id}
          onToggle={() => toggle(r.id)}
        >
          <PriceLine tag="Buy" label="at" price={r.buy[0].price} />
          <PriceLine tag="Buy" icon="Nature rune.png" label="nature rune" price={r.buy[1]?.price ?? nature ?? 0} />
          <View style={[styles.alch, { borderTopColor: palette.rule }]}>
            <Text style={{ color: palette.muted, fontSize: 13 }}>Alch value {gpFull(r.coinRevenue)}</Text>
            <Text style={{ color: palette.profit, fontSize: 14, fontWeight: '700' }}>{signed(r.profit)}</Text>
          </View>
        </FlipRow>
      )}
      empty={{ title: 'Nothing profitable to alch', body: 'Pull down to refresh.' }}
      footer={
        <Pressable onPress={() => Linking.openURL(`${WEBSITE}/combination-items`)} style={styles.more} accessibilityRole="link">
          <Text style={{ color: palette.brand, fontSize: 14, fontWeight: '600' }}>More tools on the website</Text>
          <Text style={{ color: palette.muted, fontSize: 12.5, marginTop: 2 }}>Potions, herbs, planks, enchanting and more. Coming to the app next.</Text>
        </Pressable>
      }
    />
  )
}

const styles = StyleSheet.create({
  alch: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, marginTop: 4, paddingTop: 7 },
  more: { alignItems: 'center', padding: space.xl }
})
