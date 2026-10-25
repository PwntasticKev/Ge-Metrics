import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query'
import { NativeTabs } from 'expo-router/native-tabs'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { AppState, Platform } from 'react-native'
import { SettingsProvider } from '../state/settings'
import { WatchlistProvider } from '../state/watchlist'
import { ThemeProvider, useTheme } from '../theme/ThemeProvider'

// Refetch prices when the app comes back to the foreground.
function useAppFocus () {
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (Platform.OS !== 'web') focusManager.setFocused(state === 'active')
    })
    return () => sub.remove()
  }, [])
}

function Tabs () {
  const { palette, isDark } = useTheme()
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <NativeTabs tintColor={palette.brand} backgroundColor={palette.bar}>
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Label>Sets</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'square.grid.2x2', selected: 'square.grid.2x2.fill' }} md="grid_view" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="items">
          <NativeTabs.Trigger.Label>Items</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'circle.circle', selected: 'circle.circle.fill' }} md="toll" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="watchlist">
          <NativeTabs.Trigger.Label>Watchlist</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'star', selected: 'star.fill' }} md="star" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="tools">
          <NativeTabs.Trigger.Label>Tools</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'wand.and.stars', selected: 'wand.and.stars' }} md="auto_fix_high" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="me">
          <NativeTabs.Trigger.Label>Me</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'person', selected: 'person.fill' }} md="person" />
        </NativeTabs.Trigger>
      </NativeTabs>
    </>
  )
}

export default function RootLayout () {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { retry: 2, refetchOnWindowFocus: true } }
  }))
  useAppFocus()
  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <ThemeProvider>
          <WatchlistProvider>
            <Tabs />
          </WatchlistProvider>
        </ThemeProvider>
      </SettingsProvider>
    </QueryClientProvider>
  )
}
