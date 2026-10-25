import { StyleSheet, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../theme/ThemeProvider'
import { space, type } from '../theme/tokens'

interface Props {
  title: string
  meta?: string
  search?: { value: string; onChange: (v: string) => void; placeholder: string }
  children?: React.ReactNode
}

// Large title, a small status on the right, optional search, then tabs.
export function ScreenHeader ({ title, meta, search, children }: Props) {
  const { palette } = useTheme()
  const insets = useSafeAreaInsets()
  return (
    <View style={{ paddingTop: insets.top + space.sm, backgroundColor: palette.bg }}>
      <View style={styles.titleRow}>
        <Text style={[type.title, { color: palette.ink }]} accessibilityRole="header">{title}</Text>
        {meta ? <Text style={[styles.meta, { color: palette.muted }]}>{meta}</Text> : null}
      </View>
      {search && (
        <TextInput
          value={search.value}
          onChangeText={search.onChange}
          placeholder={search.placeholder}
          placeholderTextColor={palette.muted}
          clearButtonMode="while-editing"
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          style={[styles.search, { backgroundColor: palette.well, color: palette.ink }]}
        />
      )}
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingBottom: space.sm },
  meta: { fontSize: 13 },
  search: { marginHorizontal: space.lg, marginBottom: space.md, paddingHorizontal: space.md, paddingVertical: 9, borderRadius: 10, fontSize: 15 }
})
