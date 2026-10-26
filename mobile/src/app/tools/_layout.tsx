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
      <Stack.Screen name="alerts" options={{ title: 'Alerts' }} />
      <Stack.Screen name="update-movers" options={{ title: 'Update movers' }} />
      <Stack.Screen name="mini-window" options={{ title: 'Mini window' }} />
      <Stack.Screen name="coming-up" options={{ title: 'Coming up' }} />
      <Stack.Screen name="pumps" options={{ title: 'Pumps & dumps' }} />
      <Stack.Screen name="scanner" options={{ title: 'Market scanner' }} />
      <Stack.Screen name="[method]" />
    </Stack>
  )
}
