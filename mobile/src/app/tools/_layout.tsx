import { Stack } from 'expo-router'
import { useTheme } from '../../theme/ThemeProvider'

export default function ToolsLayout () {
  const { palette } = useTheme()
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: palette.bg },
        headerTintColor: palette.brand,
        headerTitleStyle: { color: palette.ink },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: palette.bg }
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false, title: 'Tools' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      <Stack.Screen name="high-alchemy" options={{ title: 'High Alchemy' }} />
      <Stack.Screen name="[method]" />
    </Stack>
  )
}
