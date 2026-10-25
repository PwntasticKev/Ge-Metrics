import { useCallback, useMemo, useState } from 'react'
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import type { Market } from '@ge/engine'
import { useMarket } from '../api/useMarket'
import { PriceLine } from '../components/DetailLines'
import { FlipListScreen } from '../components/FlipListScreen'
import { FlipRow } from '../components/FlipRow'
import { ScreenHeader } from '../components/ScreenHeader'
import { gpFull, signed } from '../lib/format'
import { useTheme } from '../theme/ThemeProvider'
import { space } from '../theme/tokens'

const NATURE_RUNE_ID = 561
const MIN_DAILY_VOLUME = 2000
const MAX_ROWS = 60
const WEBSITE = 'https://ge-metrics.vercel.app'

interface AlchRow {
  id: number
  name: string
  icon: string | null
  buyAt: number
  alch: number
  nature: number
  profit: number
  limit: number | null
}

// High alchemy: buy at the insta-buy price, cast, and the coins are yours.
// No GE tax because nothing is sold on the exchange.
function rankHighAlch (market: Market): { rows: AlchRow[]; nature: number | null } {
  const nature = market.get(NATURE_RUNE_ID)?.high ?? null
  if (!nature) return { rows: [], nature }
  const rows = market.all()
    .flatMap(i => (i.highalch && i.high && (i.dailyVolume ?? 0) >= MIN_DAILY_VOLUME
      ? [{ id: i.id, name: i.name, icon: i.icon, buyAt: i.high, alch: i.highalch, nature, profit: i.highalch - i.high - nature, limit: i.limit }]
      : []))
    .filter(r => r.profit > 0)
    .sort((a, b) => b.profit - a.profit)
    .slice(0, MAX_ROWS)
  return { rows, nature }
}

export default function ToolsScreen () {
  const market = useMarket()
  const { palette } = useTheme()
  const [openId, setOpenId] = useState<number | null>(null)
  const { rows, nature } = useMemo(() => (market.market ? rankHighAlch(market.market) : { rows: [], nature: null }), [market.market])
  const toggle = useCallback((id: number) => setOpenId(prev => (prev === id ? null : id)), [])

  return (
    <FlipListScreen<AlchRow>
      market={market}
      header={<ScreenHeader title="High Alchemy" meta={nature ? `Nature rune ${gpFull(nature)}` : undefined} />}
      data={rows}
      keyOf={r => String(r.id)}
      extraData={openId}
      renderRow={r => (
        <FlipRow
          icon={r.icon}
          name={r.name}
          meta={r.limit ? `Limit ${r.limit}, ${signed(r.profit * r.limit)} per 4h` : 'Limit unknown'}
          value={signed(r.profit)}
          valueCaption="per cast"
          expanded={openId === r.id}
          onToggle={() => toggle(r.id)}
        >
          <PriceLine tag="Buy" label="at" price={r.buyAt} />
          <PriceLine tag="Buy" icon="Nature rune.png" label="nature rune" price={r.nature} />
          <View style={[styles.alch, { borderTopColor: palette.rule }]}>
            <Text style={{ color: palette.muted, fontSize: 13 }}>Alch value {gpFull(r.alch)}</Text>
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
