import { Box, Center, Loader, Group, Text, Badge, Card } from '@mantine/core'
import { IconClock, IconRefresh } from '@tabler/icons-react'
import { useState, useEffect } from 'react'
import ItemSetsTable from '../../components/Table/item-sets-table.jsx'
import ItemData from '../../utils/item-data.jsx'
import { getRelativeTime } from '../../utils/utils.jsx'

export default function CombinationItems () {
  const { items, itemSets, mapStatus, priceStatus } = ItemData()
  const [lastFetchTime, setLastFetchTime] = useState(new Date())
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    if (priceStatus === 'success') {
      setLastFetchTime(new Date())
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
    <>
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
              <Text size="xl" weight={700} color="white">Arbitrage Tracker</Text>
              <Text size="sm" color="rgba(255, 255, 255, 0.7)">
                Monitor arbitrage opportunities between individual items and their combination sets. Setup alerts and execute trades.
              </Text>
            </div>
            <Group spacing="md">
              <Badge
                color="blue"
                size="lg"
                leftSection={<IconClock size={14} />}
              >
                {getRelativeTime(lastFetchTime, currentTime)}
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
              <Badge color="green" leftSection={<IconRefresh size={12} />}>
                Live Data
              </Badge>
            </Group>
          </Card>

          <ItemSetsTable data={itemSets}/>
        </Box>
      )}
    </>
  )
}
