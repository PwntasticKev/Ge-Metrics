import React, { useState, useEffect, useMemo } from 'react'
import {
  Box,
  Card,
  Center,
  Group,
  Loader,
  Text,
  Badge,
  Grid,
  Stack,
  SimpleGrid,
  Divider,
  SegmentedControl,
  Tooltip
} from '@mantine/core'
import { IconClock, IconTrendingUp, IconTrendingDown, IconActivity, IconPercentage } from '@tabler/icons-react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend
} from 'chart.js'
import ItemData from '../../utils/item-data.jsx'
import { getRelativeTime } from '../../utils/utils.jsx'
import {
  foodFilter,
  potionsFilter,
  herbsFilter,
  runesFilter,
  logsFilter,
  oresAndBarsFilter
} from '../../utils/market-watch-filters.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend
)

const marketWatchIndexes = {
  food: {
    name: 'Food Index',
    description: 'Tracks the market health of popular consumables.',
    color: 'blue',
    filter: foodFilter
  },
  potions: {
    name: 'Potions Index',
    description: 'Tracks the value of common combat and utility potions.',
    color: 'green',
    filter: potionsFilter
  },
  herbs: {
    name: 'Herbs Index',
    description: 'Monitors the market for clean herbs used in Herblore.',
    color: 'teal',
    filter: herbsFilter
  },
  runes: {
    name: 'Runes Index',
    description: 'Follows the market for elemental and catalytic runes.',
    color: 'violet',
    filter: runesFilter
  },
  logs: {
    name: 'Logs Index',
    description: 'An index of logs used in Fletching and Construction.',
    color: 'orange',
    filter: logsFilter
  },
  metal: {
    name: 'Metal Index',
    description: 'Tracks the value of primary ores and bars.',
    color: 'gray',
    filter: oresAndBarsFilter
  }
}

export default function MarketWatchIndex ({ indexType }) {
  const { items, mapStatus, priceStatus } = ItemData()
  const [lastFetchTime, setLastFetchTime] = useState(new Date())
  const [currentTime, setCurrentTime] = useState(new Date())
  const [chartView, setChartView] = useState('price') // 'price', 'volume', or 'profit'

  const indexConfig = marketWatchIndexes[indexType] || marketWatchIndexes.food

  useEffect(() => {
    if (priceStatus === 'success') {
      setLastFetchTime(new Date())
    }
  }, [priceStatus])

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Filter items for this index using the new dynamic filter
  const indexItems = useMemo(() => {
    if (!items || items.length === 0) {
      return []
    }
    // Use the filter function from the index config
    return items.filter(indexConfig.filter)
  }, [items, indexConfig.filter])

  // Calculate index statistics (like a stock market index)
  const indexStats = useMemo(() => {
    if (indexItems.length === 0) {
      return {
        totalVolume: 0,
        indexValue: 100,
        avgProfit: 0,
        marketCap: 0,
        dailyChange: 0,
        itemCount: 0,
        profitableCount: 0
      }
    }

    // Calculate volume-weighted average price (more representative for trading)
    const totalVolume = indexItems.reduce((sum, item) => {
      const volume = parseInt(item.volume?.toString().replace(/,/g, '') || '0')
      return sum + volume
    }, 0)

    // Volume-weighted price calculation
    const volumeWeightedPrice = indexItems.reduce((sum, item) => {
      const price = parseInt(item.high?.toString().replace(/,/g, '') || '0')
      const volume = parseInt(item.volume?.toString().replace(/,/g, '') || '0')
      if (totalVolume === 0) return sum
      const weight = volume / totalVolume
      return sum + (price * weight)
    }, 0)

    // Calculate index value based on average price trends
    const averagePrice = indexItems.reduce((sum, item) => {
      const price = parseInt(item.high?.toString().replace(/,/g, '') || '0')
      return sum + price
    }, 0) / indexItems.length

    // Index calculation: normalize volume-weighted average price to index range (70-130)
    const indexValue = Math.max(70, Math.min(130, Math.floor((volumeWeightedPrice / 100) + 70)))

    const totalProfit = indexItems.reduce((sum, item) => {
      const profit = parseInt(item.profit?.toString().replace(/,/g, '') || '0')
      return sum + profit
    }, 0)

    const totalMarketCap = indexItems.reduce((sum, item) => {
      const price = parseInt(item.high?.toString().replace(/,/g, '') || '0')
      const volume = parseInt(item.volume?.toString().replace(/,/g, '') || '0')
      return sum + (price * volume)
    }, 0)

    // More realistic daily change based on actual price volatility
    const priceVolatility = indexItems.reduce((sum, item) => {
      const high = parseInt(item.high?.toString().replace(/,/g, '') || '0')
      const low = parseInt(item.low?.toString().replace(/,/g, '') || '0')
      const volatility = high > 0 ? ((high - low) / high) * 100 : 0
      return sum + volatility
    }, 0) / indexItems.length

    const profitableCount = indexItems.filter(item => parseInt(item.profit?.toString().replace(/,/g, '') || '0') > 0).length

    return {
      totalVolume,
      indexValue,
      avgProfit: Math.floor(totalProfit / indexItems.length),
      marketCap: totalMarketCap,
      dailyChange: parseFloat(priceVolatility.toFixed(2)), // Replaced random dailyChange with priceVolatility
      itemCount: indexItems.length,
      averagePrice: Math.floor(averagePrice),
      volumeWeightedPrice: Math.floor(volumeWeightedPrice),
      priceVolatility: priceVolatility.toFixed(1),
      profitableCount
    }
  }, [indexItems])

  // Chart data for index overview
  const chartData = useMemo(() => {
    const sortedItems = [...indexItems]
      .sort((a, b) => {
        if (chartView === 'volume') {
          return (b.volume || 0) - (a.volume || 0)
        } else if (chartView === 'profit') {
          return (b.profit || 0) - (a.profit || 0)
        }
        // Default to sorting by price
        return (b.high || 0) - (a.high || 0)
      })
      .slice(0, 10) // Top 10 items

    const getChartLabel = () => {
      if (chartView === 'volume') return 'Volume'
      if (chartView === 'profit') return 'Profit (gp)'
      return 'High Price (gp)'
    }

    const getChartData = (item) => {
      if (chartView === 'volume') return item.volume || 0
      if (chartView === 'profit') return item.profit || 0
      return item.high || 0
    }

    return {
      labels: sortedItems.map(item => item.name?.slice(0, 15) + '...' || 'Unknown'),
      datasets: [
        {
          label: getChartLabel(),
          data: sortedItems.map(getChartData),
          borderColor: `var(--mantine-color-${indexConfig.color}-5)`,
          backgroundColor: `var(--mantine-color-${indexConfig.color}-1)`,
          fill: true,
          tension: 0.4,
          pointRadius: 3, // Add points to the line
          pointBackgroundColor: `var(--mantine-color-${indexConfig.color}-7)`
        }
      ]
    }
  }, [indexItems, indexConfig.color, chartView])

  if (mapStatus === 'loading' || priceStatus === 'loading') {
    return (
      <Center h={300}>
        <Loader size="lg" />
      </Center>
    )
  }

  if (mapStatus === 'error' || priceStatus === 'error') {
    return (
      <Center h={300}>
        <Text color="red">Error loading market data</Text>
      </Center>
    )
  }

  return (
    <Box sx={{ py: 4 }}>
      {/* Header */}
      <Group position="apart" mb="xl">
        <div>
          <Text size="xl" weight={700} color="white">{indexConfig.name}</Text>
          <Text size="sm" color="rgba(255, 255, 255, 0.7)">
            {indexConfig.description}
          </Text>
          <Text size="xs" color="rgba(255, 255, 255, 0.5)" mt="xs">
            Index Value: Volume-weighted average price normalized to 70-130 range
            <br />
            Avg Price: {indexStats.averagePrice?.toLocaleString()} gp |
            Volume Weighted: {indexStats.volumeWeightedPrice?.toLocaleString()} gp |
            Volatility: {indexStats.priceVolatility}%
          </Text>
        </div>
        <Group spacing="md">
          <Badge
            color="blue"
            size="lg"
          >
            <Group spacing="xs" noWrap>
              <IconClock size={14} />
              <span>{getRelativeTime(lastFetchTime, currentTime)}</span>
            </Group>
          </Badge>
          <Badge
            color={indexStats.itemCount > 0 ? 'green' : 'orange'}
            size="lg"
          >
            {indexStats.itemCount} Items Tracked
          </Badge>
        </Group>
      </Group>

      {/* Statistics Cards */}
      <SimpleGrid cols={4} spacing="md" mb="xl">
        <Card withBorder p="md">
          <Group position="apart">
            <div>
              <Text size="xs" color="dimmed" weight={500}>INDEX VALUE</Text>
              <Group spacing="xs" align="baseline">
                <Text size="xl" weight={700}>
                  {indexStats.indexValue.toLocaleString()}
                </Text>
                <Tooltip label="Represents the average price change of items in this index over the last 24 hours." withArrow>
                  <Text
                    size="sm"
                    weight={500}
                  >
                    {indexStats.priceVolatility}% Volatility
                  </Text>
                </Tooltip>
              </Group>
            </div>
            <IconTrendingUp size={24} color={indexStats.dailyChange >= 0 ? 'green' : 'red'} />
          </Group>
        </Card>

        <Card withBorder p="md">
          <Group position="apart">
            <div>
              <Text size="xs" color="dimmed" weight={500}>AVG PROFIT MARGIN</Text>
              <Text size="xl" weight={700} color={indexStats.avgProfit >= 0 ? 'green' : 'red'}>
                {indexStats.avgProfit >= 0 ? '+' : ''}{indexStats.avgProfit.toLocaleString()} gp
              </Text>
            </div>
            <IconTrendingDown size={24} color={indexStats.avgProfit >= 0 ? 'green' : 'red'} />
          </Group>
        </Card>

        <Card withBorder p="md">
          <Group position="apart">
            <div>
              <Text size="xs" color="dimmed" weight={500}>PROFITABLE RATIO</Text>
              <Text size="xl" weight={700}>
                {indexStats.profitableCount} / {indexStats.itemCount}
              </Text>
            </div>
            <IconPercentage size={24} color="cyan" />
          </Group>
        </Card>

        <Card withBorder p="md">
          <Group position="apart">
            <div>
              <Text size="xs" color="dimmed" weight={500}>ITEMS TRACKED</Text>
              <Text size="xl" weight={700}>
                {indexStats.itemCount}
              </Text>
            </div>
            <Badge size="lg" color={indexConfig.color}>
              {indexConfig.name.split(' ')[0]}
            </Badge>
          </Group>
        </Card>
      </SimpleGrid>

      {/* Chart */}
      <Card withBorder p="md" mb="xl">
        <Group position="apart" mb="md">
          <Text weight={500}>Top 10 Items by {chartView.charAt(0).toUpperCase() + chartView.slice(1)}</Text>
          <SegmentedControl
            value={chartView}
            onChange={setChartView}
            data={[
              { label: 'Price', value: 'price' },
              { label: 'Volume', value: 'volume' },
              { label: 'Profit', value: 'profit' }
            ]}
          />
        </Group>
        <Box h={300}>
          <Line
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: false
                }
              },
              scales: {
                y: {
                  beginAtZero: false, // Allow the chart to autoscale better
                  ticks: {
                    callback: function (value, index, values) {
                      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}m`
                      if (value >= 1000) return `${(value / 1000).toFixed(0)}k`
                      return value.toLocaleString()
                    }
                  }
                },
                x: {
                  ticks: {
                    maxRotation: 45,
                    minRotation: 45
                  }
                }
              }
            }}
          />
        </Box>
      </Card>

      {/* Items List */}
      <Card withBorder p="md">
        <Text weight={500} mb="md">All {indexConfig.name} Items ({indexItems.length})</Text>
        <Stack spacing="xs">
          {indexItems.map((item, index) => {
            const profitPerItem = parseInt(item.profit?.toString().replace(/,/g, '') || '0')
            const volume24h = parseInt(item.volume?.toString().replace(/,/g, '') || '0')
            const lowPrice = parseInt(item.low?.toString().replace(/,/g, '') || '0')
            const roi = lowPrice > 0 ? ((profitPerItem / lowPrice) * 100).toFixed(2) : 0

            return (
              <Group key={index} position="apart" p="xs" style={{
                backgroundColor: index % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                borderRadius: '4px'
              }}>
                <Group>
                  <img src={item.img} alt={item.name} style={{ width: 24, height: 24 }} />
                  <Text weight={500}>{item.name}</Text>
                  <Badge size="sm" color="blue">ID: {item.id}</Badge>
                </Group>
                <Group spacing="md">
                  <Text size="sm" color="dimmed">Volume: {volume24h.toLocaleString()}</Text>
                  <Text size="sm" weight={500}>High: {item.high?.toLocaleString()}</Text>
                  <Text size="sm" weight={500}>Low: {item.low?.toLocaleString()}</Text>
                  <Text
                    size="sm"
                    weight={500}
                    color={profitPerItem >= 0 ? 'green' : 'red'}
                    style={{ minWidth: '100px', textAlign: 'right' }}
                  >
                    Profit: {profitPerItem.toLocaleString()} gp
                  </Text>
                  <Text
                    size="sm"
                    weight={700}
                    color={roi >= 0 ? 'green' : 'red'}
                    style={{ minWidth: '100px', textAlign: 'right' }}
                  >
                    ROI: {roi}%
                  </Text>
                </Group>
              </Group>
            )
          })}
        </Stack>
      </Card>
    </Box>
  )
}
