import HighVolumesTable from '../../components/Table/high-volumes-table.jsx'
import { Badge, Box, Card, Center, Group, Loader, Text } from '@mantine/core'
import { IconClock } from '@tabler/icons-react'
import { useState, useEffect } from 'react'
import ItemData from '../../utils/item-data.jsx'
import { getRelativeTime } from '../../utils/utils.jsx'

export default function HighVolumes () {
  const { items, mapStatus, priceStatus } = ItemData()
  const [lastFetchTime, setLastFetchTime] = useState(new Date())
  const [currentTime, setCurrentTime] = useState(new Date())

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

  // Filter items with high volume data - items with both volume > 10000 and high trading activity
  const highVolumeItems = items.filter(item => {
    const volume = item.volume ? parseInt(item.volume.toString().replace(/,/g, '')) : 0
    const price = item.high ? parseInt(item.high.toString().replace(/,/g, '')) : 0
    const profit = item.profit ? parseInt(item.profit.toString().replace(/,/g, '')) : 0

    // High volume criteria: volume > 10000 AND (high price OR good profit margins)
    return volume > 10000 && (price > 1000 || Math.abs(profit) > 100)
  })

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
                    {/* Status Card */}
                    <Card withBorder radius="md" mb="md" sx={(theme) => ({
                      backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.colors.gray[1]
                    })}>
                      <Group position="apart">
                        <Group>
                          <IconClock size={16} />
                          <Text size="sm">
                            High Volumes - {getRelativeTime(lastFetchTime)}
                          </Text>
                          <Text size="sm" color="dimmed">
                            ({highVolumeItems.length} high-volume items)
                          </Text>
                        </Group>
                        <Badge color="green" variant="light">Live Data</Badge>
                      </Group>
                    </Card>

                    <HighVolumesTable data={items}/>
                </Box>
            )}

        </>
  )
}
