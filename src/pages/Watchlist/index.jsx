import WatchlistTable from '../../components/Table/watchlist-table.jsx'
import { Box, Center, Loader, Button, Group, Text } from '@mantine/core'
import { IconPlus } from '@tabler/icons-react'
import { useState } from 'react'
import ItemData from '../../utils/item-data.jsx'
import AddToWatchlistModal from '../../components/modals/AddToWatchlistModal.jsx'

export default function Watchlist () {
  const { items, mapStatus, priceStatus } = ItemData()
  const [addModalOpened, setAddModalOpened] = useState(false)
  const [watchlistItems, setWatchlistItems] = useState([])

  // Mock watchlist data for now - this would come from your API
  const mockWatchlistItems = [
    {
      id: 1,
      user_id: 1,
      item_id: 4151,
      volume_threshold: 10000,
      price_drop_threshold: 15.0,
      price_spike_threshold: null,
      abnormal_activity: false,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 2,
      user_id: 1,
      item_id: 1515,
      volume_threshold: null,
      price_drop_threshold: null,
      price_spike_threshold: null,
      abnormal_activity: true,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 3,
      user_id: 1,
      item_id: 2,
      volume_threshold: 80000,
      price_drop_threshold: 20.0,
      price_spike_threshold: 30.0,
      abnormal_activity: false,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }
  ]

  // Combine watchlist data with item details
  const watchlistWithDetails = mockWatchlistItems.map(watchItem => {
    const itemDetails = items.find(item => item.id === watchItem.item_id)
    return {
      ...watchItem,
      ...itemDetails,
      watchlist_id: watchItem.id
    }
  }).filter(item => item.name) // Only include items that were found

  const handleAddToWatchlist = (itemData) => {
    // This would typically make an API call to add the item to the watchlist
    console.log('Adding to watchlist:', itemData)
    setAddModalOpened(false)
    // Refresh watchlist data here
  }

  const handleRemoveFromWatchlist = (watchlistId) => {
    // This would typically make an API call to remove the item from the watchlist
    console.log('Removing from watchlist:', watchlistId)
    // Refresh watchlist data here
  }

  const handleUpdateThresholds = (watchlistId, thresholds) => {
    // This would typically make an API call to update the thresholds
    console.log('Updating thresholds:', watchlistId, thresholds)
    // Refresh watchlist data here
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
                    (mapStatus === 'loading' || priceStatus === 'loading') &&
                    <Center maw={400} h={300} mx="auto">
                        <Loader/>
                    </Center>
                }
                {priceStatus === 'success' && (
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
