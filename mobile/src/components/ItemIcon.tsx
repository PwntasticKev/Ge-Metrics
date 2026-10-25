import { Image } from 'expo-image'
import { StyleSheet, View } from 'react-native'
import { wikiIconUrl } from '../lib/format'
import { useTheme } from '../theme/ThemeProvider'
import { radius } from '../theme/tokens'

export function ItemIcon ({ icon, size = 32, framed = true }: { icon: string | null; size?: number; framed?: boolean }) {
  const { palette } = useTheme()
  const uri = wikiIconUrl(icon)
  const inner = size - (framed ? 8 : 0)
  const image = uri
    ? <Image source={{ uri }} style={{ width: inner, height: inner }} contentFit="contain" cachePolicy="disk" accessibilityIgnoresInvertColors />
    : null
  if (!framed) return image
  return (
    <View style={[styles.frame, { width: size, height: size, backgroundColor: palette.well }]}>
      {image}
    </View>
  )
}

const styles = StyleSheet.create({
  frame: { borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' }
})
