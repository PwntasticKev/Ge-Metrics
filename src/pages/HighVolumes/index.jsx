import HighVolumesTable from '../../components/Table/high-volumes-table.jsx'
import { Badge, Box, Card, Center, Group, Loader, Text } from '@mantine/core'
import { IconClock } from '@tabler/icons-react'
import { useState, useEffect, useMemo } from 'react'
import ItemData from '../../utils/item-data.jsx'
import { getRelativeTime } from '../../utils/utils.jsx'
import { isRecommendable, sortRows, toAllItemsRow } from '../../utils/flipRows.js'
import RankControls from '../../components/Table/RankControls.jsx'
import { useBudget } from '../../hooks/useBudget.js'

// Items traded at least this many times a day count as high volume.
const MIN_DAILY_VOLUME = 10_000

export default function HighVolumes () {
  const { items, mapStatus, priceStatus } = ItemData()
  const [lastFetchTime, setLastFetchTime] = useState(new Date())
  const [currentTime, setCurrentTime] = useState(new Date())
  const [sortBy, setSortBy] = useState('potential')
  const [budget, setBudget] = useBudget()

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

  // Liquid items (10k+ traded a day) ranked by 4h profit from the shared engine:
  // margin after tax x what one buy-limit window and the volume let you fill.
  const highVolumeItems = useMemo(() => {
    const nowSec = Math.floor(Date.now() / 1000)
    const liquid = items
      .filter(item => (Number(item.volume) || 0) >= MIN_DAILY_VOLUME)
      .map(item => toAllItemsRow(item, { nowSec, budget }))
    return sortRows(liquid, sortBy)
  }, [items, sortBy, budget])
  const profitableCount = highVolumeItems.filter(isRecommendable).length

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
                            ({highVolumeItems.length} items trading {MIN_DAILY_VOLUME.toLocaleString()}+ a day, {profitableCount} profitable)
                          </Text>
                        </Group>
                        <Badge color="green" variant="light">Live Data</Badge>
                      </Group>
                    </Card>

                    <RankControls sortBy={sortBy} onSortChange={setSortBy} budget={budget} onBudgetChange={setBudget} />
                    <HighVolumesTable data={highVolumeItems} keepOrder/>
                </Box>
            )}

        </>
  )
}
