import WatchlistTable from '../../components/Table/watchlist-table.jsx'
import { Box, Center, Loader, Button, Group, Text } from '@mantine/core'
import { IconPlus } from '@tabler/icons-react'
import { useState, useEffect } from 'react'
import ItemData from '../../utils/item-data.jsx'
import AddToWatchlistModal from '../../components/modals/AddToWatchlistModal.jsx'
import watchlistService from '../../services/watchlistService.js'
import { showNotification } from '@mantine/notifications'

export default function Watchlist () {
  const { items, mapStatus, priceStatus } = ItemData()
  const [addModalOpened, setAddModalOpened] = useState(false)
  const [watchlistItems, setWatchlistItems] = useState([])
  const [loading, setLoading] = useState(false)

  // Load watchlist data
  const loadWatchlist = () => {
    setLoading(true)
    try {
      const userWatchlist = watchlistService.getUserWatchlist(1) // Current user ID
      setWatchlistItems(userWatchlist)
    } catch (error) {
      showNotification({
        title: 'Error',
        message: 'Failed to load watchlist',
        color: 'red'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWatchlist()
  }, [])

  // Combine watchlist data with item details
  const watchlistWithDetails = watchlistItems.map(watchItem => {
    const itemDetails = items.find(item => item.id === watchItem.item_id)
    return {
      ...watchItem,
      ...itemDetails,
      watchlist_id: watchItem.id,
      name: watchItem.item_name || itemDetails?.name // Use stored name or fallback to item details
    }
  }).filter(item => item.name) // Only include items that were found

  const handleAddToWatchlist = (itemData) => {
    try {
      // Find the selected item details to get the name
      const selectedItem = items.find(item => item.id === itemData.item_id)

      const result = watchlistService.addToWatchlist(1, {
        ...itemData,
        item_name: selectedItem?.name || `Item ${itemData.item_id}`
      })

      if (result.success) {
        showNotification({
          title: 'Success',
          message: 'Item added to watchlist successfully',
          color: 'green'
        })
        setAddModalOpened(false)
        loadWatchlist() // Refresh watchlist
      } else {
        showNotification({
          title: 'Error',
          message: result.error,
          color: 'red'
        })
      }
    } catch (error) {
      showNotification({
        title: 'Error',
        message: 'Failed to add item to watchlist',
        color: 'red'
      })
    }
  }

  const handleRemoveFromWatchlist = (watchlistId) => {
    try {
      const result = watchlistService.removeFromWatchlist(watchlistId)

      if (result.success) {
        showNotification({
          title: 'Success',
          message: 'Item removed from watchlist',
          color: 'green'
        })
        loadWatchlist() // Refresh watchlist
      } else {
        showNotification({
          title: 'Error',
          message: result.error,
          color: 'red'
        })
      }
    } catch (error) {
      showNotification({
        title: 'Error',
        message: 'Failed to remove item from watchlist',
        color: 'red'
      })
    }
  }

  const handleUpdateThresholds = (watchlistId, thresholds) => {
    try {
      const result = watchlistService.updateThresholds(watchlistId, thresholds)

      if (result.success) {
        showNotification({
          title: 'Success',
          message: 'Thresholds updated successfully',
          color: 'green'
        })
        loadWatchlist() // Refresh watchlist
      } else {
        showNotification({
          title: 'Error',
          message: result.error,
          color: 'red'
        })
      }
    } catch (error) {
      showNotification({
        title: 'Error',
        message: 'Failed to update thresholds',
        color: 'red'
      })
    }
  }

  return (
        <>
            <AddToWatchlistModal
                opened={addModalOpened}
                setOpened={setAddModalOpened}
                items={items}
                onAdd={handleAddToWatchlist}
            />

            <Box sx={{ py: 4 }}>
                <Group position="apart" mb="md">
                    <div>
                        <Text size="xl" weight={700} color="white">Volume Dump Watchlist</Text>
                        <Text size="sm" color="rgba(255, 255, 255, 0.7)">
                            Monitor items for abnormal trading activity with AI detection or custom thresholds.
                            Get instant email alerts for volume dumps, price spikes, and unusual market behavior.
                        </Text>
                    </div>
                    <Button
                        leftIcon={<IconPlus size={16} />}
                        onClick={() => setAddModalOpened(true)}
                        color="blue"
                    >
                        Add Item to Watch
                    </Button>
                </Group>

                {(mapStatus === 'error' || priceStatus === 'error') && <p>Error fetching data</p>}
                {
                    (mapStatus === 'loading' || priceStatus === 'loading' || loading) &&
                    <Center maw={400} h={300} mx="auto">
                        <Loader/>
                    </Center>
                }
                {priceStatus === 'success' && !loading && (
                    <WatchlistTable
                        data={watchlistWithDetails}
                        onRemove={handleRemoveFromWatchlist}
                        onUpdateThresholds={handleUpdateThresholds}
                    />
                )}
            </Box>
        </>
  )
}
