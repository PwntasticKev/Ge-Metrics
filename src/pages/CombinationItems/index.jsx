import {
  Box,
  Center,
  Loader,
  Group,
  Text,
  Badge,
  Card
} from '@mantine/core'
import { IconClock, IconRefresh } from '@tabler/icons-react'
import React, { useState, useEffect } from 'react'
import ItemSetsTable from '../../components/Table/item-sets-table.jsx'
import ItemData from '../../utils/item-data.jsx'
import { getRelativeTime } from '../../utils/utils.jsx'
import { buildCombinationRows } from '../../utils/flipRows.js'
import { itemRecipes } from '../../components/Table/data/item-set-filters.jsx'
import { useFavorites } from '../../hooks/useFavorites.js'
import GraphModal from '../../shared/modals/graph-modal.jsx'
import PremiumPageWrapper from '../../components/PremiumPageWrapper'

export default function CombinationItems () {
  const { items, mapStatus, priceStatus, pricesUpdatedAt } = ItemData()
  const [lastFetchTime, setLastFetchTime] = useState(new Date())
  const [currentTime, setCurrentTime] = useState(new Date())
  const [itemSets, setItemSets] = useState([])
  const [graphInfo, setGraphInfo] = useState({ open: false, item: null })
  const { favoriteItems, toggleFavorite, isLoadingFavorites } = useFavorites()

  const favoriteItemIds = new Set(
    (favoriteItems || [])
      .filter(fav => fav.itemType === 'combination')
      .map(fav => fav.itemId)
  )

  useEffect(() => {
    if (priceStatus === 'success' && items.length > 0) {
      // Prices painted from the saved copy show their real age.
      setLastFetchTime(pricesUpdatedAt ? new Date(pricesUpdatedAt) : new Date())
      // Shared flipping engine (same as the app); sorted by profit, highest first.
      setItemSets(buildCombinationRows(itemRecipes, items))
    }
  }, [priceStatus, items, pricesUpdatedAt])

  // Update current time every second for live ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const isLoading = mapStatus === 'loading' || priceStatus === 'loading' || isLoadingFavorites

  return (
    <PremiumPageWrapper>
      <React.Fragment>
        {(mapStatus === 'error' || priceStatus === 'error') && <p>Error fetching data</p>}
        {
          isLoading &&
          <Center maw={400} h={300} mx="auto">
            <Loader/>
          </Center>
        }
        {priceStatus === 'success' && itemSets && itemSets.length > 0 && (
          <Box sx={{ py: 4 }}>
            <Group position="apart" mb="md">
              <div>
                <Text size="xl" weight={700} color="white">Arbitrage Tracker</Text>
                <Text size="sm" color="rgba(255, 255, 255, 0.7)">
                  Monitor arbitrage opportunities between individual items and their combination sets. Setup alerts and execute trades.
                </Text>
              </div>
              <Group spacing="md">
              <Badge
                color="blue"
                size="lg"
              >
                <Group spacing="xs">
                  <IconClock size={14} />
                  <span>{getRelativeTime(lastFetchTime, currentTime)}</span>
                </Group>
              </Badge>
              <Badge
                color={itemSets.length > 0 ? 'green' : 'orange'}
                size="lg"
              >
                {itemSets.length} Sets Available
              </Badge>
            </Group>
          </Group>

          <Card withBorder p="md" mb="md" style={{ backgroundColor: 'rgba(25, 113, 194, 0.1)' }}>
            <Group position="apart">
              <div>
                <Text weight={500} size="sm" color="white">Data Status</Text>
                <Text size="xs" color="rgba(255, 255, 255, 0.7)">
                  Last updated {getRelativeTime(lastFetchTime, currentTime)} •
                  {itemSets.length} combination sets tracked
                </Text>
              </div>
              <Badge color="green">
                <Group spacing="xs">
                  <IconRefresh size={12} />
                  <span>Live Data</span>
                </Group>
              </Badge>
            </Group>
          </Card>

          {priceStatus === 'success' && itemSets && itemSets.length > 0 && (
            <ItemSetsTable
              data={itemSets}
              items={items}
              favoriteItems={favoriteItemIds}
              onToggleFavorite={(itemId) => toggleFavorite(itemId, 'combination')}
              setGraphInfo={(info) => setGraphInfo({ ...info, item: { ...info.item, items } })}
            />
          )}

        </Box>
      )}
      <GraphModal
        opened={graphInfo.open}
        onClose={() => setGraphInfo({ open: false, item: null })}
        item={graphInfo.item}
      />
      </React.Fragment>
    </PremiumPageWrapper>
  )
}
