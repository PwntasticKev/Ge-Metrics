import * as WebBrowser from 'expo-web-browser'
import { Pressable, StyleSheet, Text } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'
import { space } from '../theme/tokens'

export function openPost (url: string) {
  WebBrowser.openBrowserAsync(url).catch(error => console.warn('Could not open the news post', error))
}

// A news post as a list section header; taps open the post.
export function PostHeader ({ title, meta, url }: { title: string; meta: string; url: string | null }) {
  const { palette } = useTheme()
  return (
    <Pressable
      disabled={!url}
      onPress={() => url && openPost(url)}
      style={({ pressed }) => [styles.post, { backgroundColor: palette.well }, pressed && { opacity: 0.7 }]}
      accessibilityRole={url ? 'link' : 'header'}
    >
      <Text style={[styles.title, { color: palette.ink }]} numberOfLines={2}>{title}</Text>
      <Text style={[styles.meta, { color: palette.muted }]}>{meta}{url ? '  ·  Read ›' : ''}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  post: { paddingHorizontal: space.lg, paddingVertical: space.sm, marginTop: space.sm },
  title: { fontSize: 15, fontWeight: '700' },
  meta: { fontSize: 12.5, marginTop: 2 }
})
