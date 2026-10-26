import * as Haptics from 'expo-haptics'
import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native'
import { PipTickerView } from '../../../modules/pip-ticker'
import { Tabs } from '../../components/Tabs'
import { MAX_MINI_ROWS, type MiniSource } from '../../lib/miniWindow'
import { useMiniWindow } from '../../state/miniWindow'
import { useSettings } from '../../state/settings'
import { useTheme } from '../../theme/ThemeProvider'
import { space } from '../../theme/tokens'

const SOURCES = [
  { value: 'watchlist', label: 'Watchlist' },
  { value: 'picks', label: 'Buy now' },
  { value: 'holdings', label: 'Bought' },
  { value: 'slots', label: 'GE slots' }
] as const

const EMPTY: Record<MiniSource, string> = {
  watchlist: 'Star some items first. Sets and tools on your watchlist aren\'t shown here, only single items.',
  picks: 'No Buy now picks yet. Give prices a moment to load.',
  holdings: 'Nothing bought yet. Log a buy from Buy now or Items.',
  slots: 'No offers in My GE slots yet. Place one from a pick or the Bought list.'
}

// Must match TickerLayout in modules/pip-ticker/ios/TickerRenderer.swift.
const FRAME = { width: 480, header: 46, row: 66, bottomPad: 8, empty: 150 }
const aspectFor = (rows: number) => FRAME.width / (FRAME.header + (rows ? rows * FRAME.row + FRAME.bottomPad : FRAME.empty))

export default function MiniWindowScreen () {
  const { palette } = useTheme()
  const { settings, update } = useSettings()
  const mini = useMiniWindow()
  const [busy, setBusy] = useState(false)

  if (!mini.available) {
    return (
      <View style={[styles.center, { backgroundColor: palette.bg }]}>
        <Text style={[styles.title, { color: palette.ink }]}>Not available here</Text>
        <Text style={[styles.body, { color: palette.muted }]}>The mini window uses Picture in Picture, which needs an iPhone on iOS 15 or later.</Text>
      </View>
    )
  }

  const onPress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (mini.active) return mini.stop()
    setBusy(true)
    await mini.start()
    setBusy(false)
  }

  const canStart = mini.rows.length > 0
  return (
    <ScrollView style={{ backgroundColor: palette.bg }} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.list}>
      <Text style={[styles.body, { color: palette.muted }]}>
        Keep up to {MAX_MINI_ROWS} prices floating over the game. Drag it anywhere, pinch to resize, or swipe it to the edge to tuck it away.
      </Text>

      <Tabs options={SOURCES} value={mini.source} onChange={mini.setSource} />

      <PipTickerView style={[styles.preview, { aspectRatio: aspectFor(mini.rows.length), borderColor: palette.rule }]} />
      {!canStart ? <Text style={[styles.body, { color: palette.muted }]}>{EMPTY[mini.source]}</Text> : null}

      {!mini.supported ? <Text style={[styles.body, { color: palette.ink }]}>{'Picture in Picture isn\'t available on this device, so the window can\'t open here.'}</Text> : null}
      <Pressable
        onPress={onPress}
        disabled={busy || !mini.supported || (!mini.active && !canStart)}
        style={({ pressed }) => [styles.button, { backgroundColor: palette.brand }, (pressed || busy || !mini.supported || (!mini.active && !canStart)) && { opacity: 0.5 }]}
        accessibilityRole="button"
      >
        {busy
          ? <ActivityIndicator color={palette.onBrand} />
          : <Text style={[styles.buttonText, { color: palette.onBrand }]}>{mini.active ? 'Close mini window' : 'Open mini window'}</Text>}
      </Pressable>
      {mini.lastError ? <Text style={[styles.body, { color: palette.ink }]}>{mini.lastError}</Text> : null}

      <View style={[styles.group, { backgroundColor: palette.card, borderColor: palette.rule }]}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: palette.ink }]}>Open when I leave the app</Text>
            <Text style={[styles.detail, { color: palette.muted }]}>Switch to the game and the mini window pops up by itself.</Text>
          </View>
          <Switch
            value={settings.miniAutoStart}
            onValueChange={value => update({ miniAutoStart: value })}
            trackColor={{ true: palette.brand, false: palette.well }}
          />
        </View>
      </View>

      <Text style={[styles.note, { color: palette.muted }]}>
        Prices refresh every minute while the window is open, even while you play. Tap pause in the window to stop refreshing. Buy and sell are the live GE prices; the percentage is the move against the last 24 hours.
      </Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  list: { padding: space.lg, gap: space.md, paddingBottom: 120 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.sm },
  title: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 14, lineHeight: 20 },
  preview: { width: '100%', borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  button: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  buttonText: { fontSize: 16, fontWeight: '600' },
  group: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: 12 },
  label: { fontSize: 15 },
  detail: { fontSize: 12.5, marginTop: 2 },
  note: { fontSize: 12.5, lineHeight: 18, textAlign: 'center', paddingHorizontal: space.sm }
})
