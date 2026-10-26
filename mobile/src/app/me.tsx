import Constants from 'expo-constants'
import * as Haptics from 'expo-haptics'
import { Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native'
import { ScreenHeader } from '../components/ScreenHeader'
import { useSettings, type OrientationPreference, type Settings, type ThemePreference } from '../state/settings'
import { useWatchlist } from '../state/watchlist'
import { useTheme } from '../theme/ThemeProvider'
import { space } from '../theme/tokens'

const WEBSITE = 'https://ge-metrics.vercel.app'
const THEMES: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' }
]

const ORIENTATIONS: { value: OrientationPreference; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'portrait', label: 'Vertical' },
  { value: 'landscape', label: 'Horizontal' }
]

const BUDGETS: { value: number | null; label: string }[] = [
  { value: null, label: 'Any' },
  { value: 1e6, label: '1M' },
  { value: 1e7, label: '10M' },
  { value: 1e8, label: '100M' },
  { value: 1e9, label: '1B' }
]

function Section ({ title, children }: { title: string; children: React.ReactNode }) {
  const { palette } = useTheme()
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: palette.muted }]}>{title}</Text>
      <View style={[styles.group, { backgroundColor: palette.card, borderColor: palette.rule }]}>{children}</View>
    </View>
  )
}

function Row ({ label, detail, right, below, onPress, last = false }: { label: string; detail?: string; right?: React.ReactNode; below?: React.ReactNode; onPress?: () => void; last?: boolean }) {
  const { palette } = useTheme()
  const content = (
    <View style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.rule }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.label, { color: palette.ink }]}>{label}</Text>
        {detail ? <Text style={[styles.detail, { color: palette.muted }]}>{detail}</Text> : null}
        {below ? <View style={{ marginTop: 10, alignSelf: 'flex-start' }}>{below}</View> : null}
      </View>
      {right}
    </View>
  )
  return onPress ? <Pressable onPress={onPress} accessibilityRole="button">{content}</Pressable> : content
}

function Toggle ({ setting }: { setting: 'hideStale' | 'hideFlukes' | 'membersItems' }) {
  const { settings, update } = useSettings()
  const { palette } = useTheme()
  return (
    <Switch
      value={settings[setting]}
      onValueChange={value => update({ [setting]: value } as Partial<Settings>)}
      trackColor={{ true: palette.brand, false: palette.well }}
    />
  )
}

function Segmented<T> ({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const { palette } = useTheme()
  return (
    <View style={[styles.seg, { backgroundColor: palette.well }]} accessibilityRole="radiogroup">
      {options.map(t => {
        const on = value === t.value
        return (
          <Pressable
            key={t.label}
            onPress={() => { Haptics.selectionAsync(); onChange(t.value) }}
            style={[styles.segItem, on && { backgroundColor: palette.card }]}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
          >
            <Text style={{ fontSize: 13, color: on ? palette.ink : palette.muted, fontWeight: on ? '600' : '400' }}>{t.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

function ThemePicker () {
  const { settings, update } = useSettings()
  return <Segmented options={THEMES} value={settings.theme} onChange={theme => update({ theme })} />
}

function OrientationPicker () {
  const { settings, update } = useSettings()
  return <Segmented options={ORIENTATIONS} value={settings.orientation} onChange={orientation => update({ orientation })} />
}

function BudgetPicker () {
  const { settings, update } = useSettings()
  return <Segmented options={BUDGETS} value={settings.budget} onChange={budget => update({ budget })} />
}

export default function MeScreen () {
  const { palette } = useTheme()
  const { entries } = useWatchlist()
  const version = Constants.expoConfig?.version ?? ''

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <ScreenHeader title="Me" />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingBottom: space.xl }}>
        <Section title="Display">
          <Row label="Theme" right={<ThemePicker />} />
          <Row label="Orientation" detail="Auto follows how you hold the phone" below={<OrientationPicker />} last />
        </Section>
        <Section title="Your cash">
          <Row label="Cash stack" detail="Only show what you can afford, and cap 4h profit to it" below={<BudgetPicker />} last />
        </Section>
        <Section title="Prices">
          <Row label="Hide stale prices" detail="Older than 6 hours" right={<Toggle setting="hideStale" />} />
          <Row label="Hide fluke trades" detail="Margins over 25% are almost always one odd trade" right={<Toggle setting="hideFlukes" />} />
          <Row label="Members items" right={<Toggle setting="membersItems" />} last />
        </Section>
        <Section title="About">
          <Row label="Watchlist" detail="Saved on this phone, no account needed" right={<Text style={{ color: palette.muted }}>{entries.length}</Text>} />
          <Row label="Prices from" detail="OSRS Wiki real-time prices, refreshed every minute" />
          <Row label="Open the website" onPress={() => Linking.openURL(WEBSITE)} right={<Text style={{ color: palette.brand }}>›</Text>} />
          <Row label="Version" right={<Text style={{ color: palette.muted }}>{version}</Text>} last />
        </Section>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: space.lg, paddingTop: space.lg },
  sectionTitle: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  group: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: 12 },
  label: { fontSize: 15 },
  detail: { fontSize: 12.5, marginTop: 2 },
  seg: { flexDirection: 'row', borderRadius: 8, padding: 2 },
  segItem: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }
})
