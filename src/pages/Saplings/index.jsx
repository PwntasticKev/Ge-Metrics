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
import { getRelativeTime, getItemSetProfit } from '../../utils/utils.jsx'
import { saplingRecipes } from '../../components/Table/data/sapling-filters.jsx'

export default function Saplings () {
  const { items, mapStatus, priceStatus } = ItemData()
  const [lastFetchTime, setLastFetchTime] = useState(new Date())
  const [currentTime, setCurrentTime] = useState(new Date())
  const [saplingSets, setSaplingSets] = useState([])

  useEffect(() => {
    if (priceStatus === 'success' && items.length > 0) {
      setLastFetchTime(new Date())
      const processedSaplings = saplingRecipes
        .map(recipe => getItemSetProfit(recipe, items))
        .filter(item => item) // Filter out null or undefined results
        .sort((a, b) => b.profit - a.profit)
      setSaplingSets(processedSaplings)
    }
  }, [priceStatus, items])

  // Update current time every second for live ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <React.Fragment>
      {(mapStatus === 'error' || priceStatus === 'error') && <p>Error fetching data</p>}
      {
        (mapStatus === 'loading' || priceStatus === 'loading') &&
        <Center maw={400} h={300} mx="auto">
          <Loader/>
        </Center>
      }
      {priceStatus === 'success' && items.length > 0 && (
        <Box sx={{ py: 4 }}>
          <Group position="apart" mb="md">
            <div>
              <Text size="xl" weight={700} color="white">Sapling Arbitrage</Text>
              <Text size="sm" color="rgba(255, 255, 255, 0.7)">
                Monitor arbitrage opportunities between seeds and their saplings.
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
                color={saplingSets.length > 0 ? 'green' : 'orange'}
                size="lg"
              >
                {saplingSets.length} Saplings Available
              </Badge>
            </Group>
          </Group>

          {priceStatus === 'success' && saplingSets && saplingSets.length > 0 && (
            <ItemSetsTable data={saplingSets} />
          )}
        </Box>
      )}
    </React.Fragment>
  )
}
