import AllItemsTable from '../../components/Table/all-items-table.jsx'
import { Badge, Box, Card, Center, Group, Loader, Text } from '@mantine/core'
import { IconClock } from '@tabler/icons-react'
import { useState, useEffect, useMemo } from 'react'
import ItemData from '../../utils/item-data.jsx'
import { getRelativeTime } from '../../utils/utils.jsx'
import { toAllItemsRow } from '../../utils/flipRows.js'
import { trpc } from '../../utils/trpc.jsx'
import { useFavorites } from '../../hooks/useFavorites.js'

export default function AllItems () {
  const { items, mapStatus, priceStatus, pricesUpdatedAt } = ItemData()
  const [lastFetchTime, setLastFetchTime] = useState(new Date())
  const [currentTime, setCurrentTime] = useState(new Date())
  const { favoriteItems, toggleFavorite, isLoadingFavorites } = useFavorites('item')

  // Volume map (24h + 1h) for items
  const { data: volumeMap = {}, isLoading: volumesLoading } = trpc.items.getAllVolumes.useQuery(undefined, {
    staleTime: 60_000,
    refetchOnWindowFocus: false
  })

  const favoriteItemIds = new Set(
    (favoriteItems || [])
      .filter(fav => fav.itemType === 'item')
      .map(fav => fav.itemId)
  )

  useEffect(() => {
    if (priceStatus === 'success') {
      // Prices painted from the saved copy show their real age.
      setLastFetchTime(pricesUpdatedAt ? new Date(pricesUpdatedAt) : new Date())
    }
  }, [priceStatus, items, pricesUpdatedAt])

  // Update current time every 30 seconds to refresh relative time
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleToggleFavorite = (itemId) => {
    toggleFavorite(itemId, 'item')
  }

  // Profit and tax come from the shared flipping engine (same as the app).
  // Don't limit here - let pagination handle display
  // Keep ALL items available for filtering/searching
  const processedItems = useMemo(
    () => items.map(toAllItemsRow).sort((a, b) => b.profit - a.profit),
    [items]
  )

  // Don't let favorites loading block the entire page
  const isLoading = mapStatus === 'loading' || priceStatus === 'loading'


  return (
        <>
            {(mapStatus === 'error' || priceStatus === 'error') && <p>Error fetching data</p>}
            {
                isLoading &&
                <Center maw={400} h={300} mx="auto">
                    <Loader/>
                </Center>
            }
            {/* Keep the table mounted even during background refetch so modals don't close */ }
            {items.length > 0 && (
                <Box sx={{ py: 4 }}>
                    {/* Status Card */}
                    <Card withBorder radius="md" mb="md" sx={(theme) => ({
                      backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.colors.gray[1]
                    })}>
                      <Group position="apart">
                        <Group>
                          <IconClock size={16} />
                          <Text size="sm">
                            All Items - {getRelativeTime(lastFetchTime)}
                          </Text>
                          <Text size="sm" color="dimmed">
                            ({items.length} items loaded)
                          </Text>
                        </Group>
                        <Badge color="green" variant="light">Live Data</Badge>
                      </Group>
                    </Card>

                    <AllItemsTable
                      data={processedItems}
                      items={items}
                      favoriteItems={favoriteItemIds}
                      onToggleFavorite={handleToggleFavorite}
                      showFavoriteColumn={true}
                      showTrashColumn={true}
                      volumeMap={volumeMap}
                      defaultVolumeWindow="1h"
                      // Pass tax info to table if it supports it, or modify table component
                    />
                </Box>
            )}

        </>
  )
}
