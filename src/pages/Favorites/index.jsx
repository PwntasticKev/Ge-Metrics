import React, { useState, useEffect, useMemo } from 'react'
import {
  Box,
  Center,
  Loader,
  Group,
  Text,
  Badge
} from '@mantine/core'
import { IconClock } from '@tabler/icons-react'
import AllItemsTable from '../../components/Table/all-items-table'
import ItemData from '../../utils/item-data'
import { trpc } from '../../utils/trpc'
import { getRelativeTime } from '../../utils/utils'

export default function Favorites () {
  const { items, mapStatus, priceStatus } = ItemData()
  const [lastFetchTime, setLastFetchTime] = useState(new Date())
  const [currentTime, setCurrentTime] = useState(new Date())

  // Fetch favorite item IDs from the backend
  const { data: favoriteItemIds, isLoading: isLoadingFavorites } = trpc.favorites.getAll.useQuery()

  // Memoize the filtered list of favorite items
  const favoriteItems = useMemo(() => {
    if (!favoriteItemIds || items.length === 0) {
      return []
    }
    const favoriteIdSet = new Set(favoriteItemIds)
    return items.filter(item => favoriteIdSet.has(item.id))
  }, [items, favoriteItemIds])

  useEffect(() => {
    if (priceStatus === 'success') {
      setLastFetchTime(new Date())
    }
  }, [priceStatus])

  // Update current time every second for live ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const isLoading = mapStatus === 'loading' || priceStatus === 'loading' || isLoadingFavorites

  return (
    <React.Fragment>
      {isLoading && (
        <Center maw={400} h={300} mx="auto">
          <Loader />
        </Center>
      )}

      {!isLoading && (
        <Box sx={{ py: 4 }}>
          <Group position="apart" mb="md">
        <div>
              <Text size="xl" weight={700} color="white">Your Favorite Items</Text>
              <Text size="sm" color="rgba(255, 255, 255, 0.7)">
                A personalized list of items you are tracking.
          </Text>
        </div>
            <Group spacing="md">
              <Badge
                color="blue"
            size="lg"
                variant="filled"
          >
                <Group spacing="xs">
                  <IconClock size={14} />
                  <span>{getRelativeTime(lastFetchTime, currentTime)}</span>
        </Group>
              </Badge>
              <Badge
                color={favoriteItems.length > 0 ? 'green' : 'orange'}
                size="lg"
                variant="filled"
              >
                {favoriteItems.length} Items Favorited
              </Badge>
            </Group>
            </Group>

          {favoriteItems.length > 0
            ? (
            <AllItemsTable data={favoriteItems} />
              )
            : (
            <Center style={{ height: 300 }}>
              <Text color="dimmed">You haven't favorited any items yet.</Text>
              </Center>
              )}
        </Box>
      )}
    </React.Fragment>
  )
}
