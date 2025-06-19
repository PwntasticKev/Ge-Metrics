import AllItemsTable from '../../components/Table/all-items-table.jsx'
import { Badge, Box, Card, Center, Group, Loader, Text } from '@mantine/core'
import { IconClock } from '@tabler/icons-react'
import { useState, useEffect } from 'react'
import ItemData from '../../utils/item-data.jsx'
import { getRelativeTime } from '../../utils/utils.jsx'

export default function AllItems () {
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
                            All Items - {getRelativeTime(lastFetchTime)}
                          </Text>
                          <Text size="sm" color="dimmed">
                            ({items.length} items loaded)
                          </Text>
                        </Group>
                        <Badge color="green" variant="light">Live Data</Badge>
                      </Group>
                    </Card>

                    <AllItemsTable data={items}/>
                </Box>
            )}

        </>
  )
}
