import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { NewSlot } from '../../lib/slots/slots'
import { useTheme } from '../../theme/ThemeProvider'
import { space } from '../../theme/tokens'
import { useSlotActions } from './useSlotActions'

export interface OfferDraft extends NewSlot {
  /** Link text, e.g. "Place buy". */
  label?: string
}

// One tap puts an offer into My GE slots, prefilled with the recommended
// price and amount; change either later with "Update offer".
export function PlaceOffer ({ offers }: { offers: readonly OfferDraft[] }) {
  const { palette } = useTheme()
  const { place } = useSlotActions()
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onPlace = async (draft: OfferDraft) => {
    if (busy) return
    setBusy(true)
    const result = await place(draft)
    setBusy(false)
    setStatus(result.ok ? `${draft.side === 'buy' ? 'Buy' : 'Sell'} offer added to My GE slots.` : result.error)
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {offers.map(draft => (
          <Pressable key={draft.side} onPress={() => onPlace(draft)} disabled={busy} hitSlop={8} accessibilityRole="button">
            <Text style={[styles.link, { color: palette.brand, opacity: busy ? 0.5 : 1 }]}>{draft.label ?? (draft.side === 'buy' ? 'Place buy' : 'Place sell')}</Text>
          </Pressable>
        ))}
      </View>
      {status ? (
        <Pressable onPress={() => router.push('/tools/slots')} hitSlop={6} accessibilityRole="link">
          <Text style={[styles.status, { color: palette.muted }]}>
            {status} <Text style={{ color: palette.brand, fontWeight: '600' }}>Open ›</Text>
          </Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 8, gap: 4 },
  row: { flexDirection: 'row', gap: space.xl },
  link: { fontSize: 13, fontWeight: '600' },
  status: { fontSize: 12.5 }
})
