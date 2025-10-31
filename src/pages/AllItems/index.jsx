import AllItemsTable from '../../components/Table/all-items-table.jsx'
import { Badge, Box, Card, Center, Group, Loader, Text } from '@mantine/core'
import { IconClock } from '@tabler/icons-react'
import { useState, useEffect } from 'react'
import ItemData from '../../utils/item-data.jsx'
import { getRelativeTime } from '../../utils/utils.jsx'
import { trpc } from '../../utils/trpc.jsx'
import { useFavorites } from '../../hooks/useFavorites.js'

export default function AllItems () {
  const { items, mapStatus, priceStatus } = ItemData()
  const [lastFetchTime, setLastFetchTime] = useState(new Date())
  const [currentTime, setCurrentTime] = useState(new Date())
  const { favoriteItems, toggleFavorite, isLoadingFavorites } = useFavorites('item')

  const favoriteItemIds = new Set(
    (favoriteItems || [])
      .filter(fav => fav.itemType === 'item')
      .map(fav => fav.itemId)
  )

  useEffect(() => {
    if (priceStatus === 'success') {
      setLastFetchTime(new Date())
    }
  }, [priceStatus, items])

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

  const processedItems = items
    .map(item => {
      const highPrice = item.high ? Number(item.high) : 0
      const lowPrice = item.low ? Number(item.low) : 0
      const profit = highPrice && lowPrice ? Math.floor(highPrice * 0.99 - lowPrice) : 0
      return {
        ...item,
        profit,
        img: `https://oldschool.runescape.wiki/images/${item.icon}`.replace(/ /g, '_')
      }
    })
    .sort((a, b) => b.profit - a.profit)
    // Don't limit here - let pagination handle display
    // Keep ALL items available for filtering/searching

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
            {priceStatus === 'success' && items.length > 0 && (
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
                    />
                </Box>
            )}

        </>
  )
}
