import { memo, useMemo, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { geTax, type MarketItem, type WikiAverage } from '@ge/engine'
import { flowFromAverages } from '../lib/analytics/fillTime'
import { sellAdvice, type SellAdvice } from '../lib/analytics/sellAdvice'
import { duration, gpFull, gpShort, qty, signed, stripUncharged } from '../lib/format'
import { BUY_LIMIT_WINDOW_MS } from '../lib/reminders'
import { useFlips, type Holding } from '../state/flips'
import { useTheme } from '../theme/ThemeProvider'
import { space } from '../theme/tokens'
import { PriceLine } from './DetailLines'
import { DetailsLink } from './DetailsLink'
import { FlipRow } from './FlipRow'
import { SellForm } from './SellForm'
import { PlaceOffer } from './slots/PlaceOffer'
import { Sparkline } from './Sparkline'

const clock = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

function limitText (windowStart: number, now: number): string {
  const resetAt = windowStart + BUY_LIMIT_WINDOW_MS
  return resetAt > now ? `limit resets ${clock(resetAt)}` : 'limit has reset'
}

// "Sell now 1.24M or list 1.27M, ~2h (+30K)"
function adviceLine (advice: SellAdvice): string {
  const now = `Sell now ${gpShort(advice.nowPrice)}`
  if (advice.extraGp <= 0) return `${now}, as good as listing`
  const list = `list ${gpShort(advice.listPrice)}, ${duration(advice.waitHours)} (${signed(advice.extraGp)})`
  return advice.verdict === 'list' ? `${now} or ${list}` : `${now}; or ${list}`
}

interface Props {
  holding: Holding
  item: MarketItem | null
  h1: WikiAverage | undefined
  h24: WikiAverage | undefined
  now: number
  expanded: boolean
  onToggle: (id: string) => void
}

// Something you bought and still hold: what it's worth if you sell now, and
// whether listing at the day's typical high is worth the wait.
export const HoldingRow = memo(function HoldingRow ({ holding, item, h1, h24, now, expanded, onToggle }: Props) {
  const { palette } = useTheme()
  const { removeHolding } = useFlips()
  const [selling, setSelling] = useState(false)
  const advice = useMemo(() => sellAdvice({
    qty: holding.qty,
    instantSell: item?.low ?? null,
    instantBuy: item?.high ?? null,
    dayHigh: h24?.avgHighPrice ?? null,
    flow: flowFromAverages(h1, h24),
    taxOf: price => geTax(price, holding.itemId)
  }), [holding.qty, holding.itemId, item?.low, item?.high, h1, h24])
  // Selling now means instant-selling into buy offers, at the live low.
  const sellAt = item?.low ?? item?.high ?? null
  const tax = sellAt === null ? 0 : geTax(sellAt, holding.itemId)
  const profitNow = sellAt === null ? null : (sellAt - tax - holding.buyPrice) * holding.qty
  // "Place sell" uses the sell helper's pick: the listing price when listing pays, else the instant-sell price.
  const listAt = advice ? (advice.verdict === 'list' ? advice.listPrice : advice.nowPrice) : (item?.high ?? null)
  const listProfit = advice ? (advice.listPrice - geTax(advice.listPrice, holding.itemId) - holding.buyPrice) * holding.qty : null

  const confirmRemove = () => {
    Alert.alert('Remove without selling?', 'It won\'t count toward what you\'ve made.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeHolding(holding.id) }
    ])
  }

  return (
    <FlipRow
      icon={holding.icon}
      name={stripUncharged(holding.name)}
      meta={`${qty(holding.qty)} at ${gpFull(holding.buyPrice)}, ${limitText(holding.windowStart, now)}`}
      note={advice ? adviceLine(advice) : undefined}
      value={signed(profitNow)}
      valueCaption="if sold now"
      valueTone={profitNow !== null && profitNow > 0 ? 'profit' : 'ink'}
      expanded={expanded}
      onToggle={() => onToggle(holding.id)}
    >
      <Sparkline itemId={holding.itemId} />
      <PriceLine tag="Buy" label={`${qty(holding.qty)} paid`} price={holding.buyPrice} />
      {sellAt !== null ? <PriceLine tag="Sell" label={`now, ${signed(profitNow)} profit`} price={sellAt} /> : null}
      {advice && advice.extraGp > 0 ? <PriceLine tag="Sell" label={`list, ${duration(advice.waitHours)}, ${signed(listProfit)} profit`} price={advice.listPrice} /> : null}
      <DetailsLink itemId={holding.itemId} />
      {listAt !== null ? (
        <PlaceOffer offers={[{ itemId: holding.itemId, name: holding.name, icon: holding.icon, side: 'sell', price: listAt, qty: holding.qty, lotId: holding.id, costBasis: holding.buyPrice }]} />
      ) : null}
      {selling ? <SellForm holding={holding} suggestedPrice={item?.high ?? null} onDone={() => setSelling(false)} /> : (
        <View style={styles.actions}>
          <Pressable onPress={confirmRemove} hitSlop={8} accessibilityRole="button">
            <Text style={[styles.action, { color: palette.muted }]}>Remove</Text>
          </Pressable>
          <Pressable onPress={() => setSelling(true)} hitSlop={8} accessibilityRole="button">
            <Text style={[styles.action, { color: palette.brand }]}>Mark sold</Text>
          </Pressable>
        </View>
      )}
    </FlipRow>
  )
})

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: space.xl, paddingTop: 8 },
  action: { fontSize: 13, fontWeight: '600' }
})
