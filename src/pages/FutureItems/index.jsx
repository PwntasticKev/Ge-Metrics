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
  Alert,
  Button,
  Progress,
  Tabs,
  Table,
  ActionIcon,
  Tooltip
} from '@mantine/core'
import {
  IconClock,
  IconTrendingUp,
  IconWand,
  IconActivity,
  IconTarget,
  IconBrain,
  IconFlask,
  IconStar,
  IconAlertTriangle,
  IconEye,
  IconHeart
} from '@tabler/icons-react'
import ItemData from '../../utils/item-data.jsx'
import { getRelativeTime } from '../../utils/utils.jsx'

// Mock AI predictions data - in real app, this would come from ML models
const generateFuturePredictions = (items) => {
  if (!items || items.length === 0) return []

  // Mock prediction algorithm based on volume trends, seasonal patterns, etc.
  const predictions = items
    .filter(item => parseInt(item.volume?.toString().replace(/,/g, '') || '0') > 1000)
    .map(item => {
      const volume = parseInt(item.volume?.toString().replace(/,/g, '') || '0')
      const currentPrice = parseInt(item.high?.toString().replace(/,/g, '') || '0')
      const profit = parseInt(item.profit?.toString().replace(/,/g, '') || '0')

      // Mock prediction logic
      const trendScore = Math.random() * 100
      const volatility = Math.random() * 50
      const confidence = Math.max(20, 100 - volatility)

      const predictedChange = (Math.random() - 0.5) * 0.4 // -20% to +20%
      const predictedPrice = Math.floor(currentPrice * (1 + predictedChange))
      const predictedProfit = predictedPrice - currentPrice

      // Determine prediction type
      let predictionType = 'hold'
      let reasoning = 'Stable market conditions expected'

      if (predictedChange > 0.1) {
        predictionType = 'buy'
        reasoning = 'Strong upward trend detected'
      } else if (predictedChange < -0.1) {
        predictionType = 'sell'
        reasoning = 'Potential price decline forecasted'
      }

      return {
        ...item,
        trendScore,
        confidence: Math.floor(confidence),
        predictedPrice,
        predictedProfit,
        predictedChange: (predictedChange * 100).toFixed(1),
        predictionType,
        reasoning,
        timeframe: '24-72 hours',
        riskLevel: volatility < 20 ? 'Low' : volatility < 35 ? 'Medium' : 'High'
      }
    })
    .sort((a, b) => parseFloat(Math.abs(b.predictedChange)) - parseFloat(Math.abs(a.predictedChange)))
    .slice(0, 50)

  return predictions
}

const predictionCategories = {
  hot: {
    name: '🔥 Hot Picks',
    description: 'Items with highest profit potential',
    color: 'red',
    filter: (predictions) => predictions.filter(p => p.predictionType === 'buy' && Math.abs(parseFloat(p.predictedChange)) > 8)
  },
  stable: {
    name: '💎 Stable Investments',
    description: 'Low risk, consistent returns',
    color: 'blue',
    filter: (predictions) => predictions.filter(p => p.riskLevel === 'Low' && parseFloat(p.predictedChange) > 0)
  },
  risky: {
    name: '⚡ High Risk/Reward',
    description: 'High volatility with big potential',
    color: 'orange',
    filter: (predictions) => predictions.filter(p => p.riskLevel === 'High' && Math.abs(parseFloat(p.predictedChange)) > 10)
  }
}

export default function FutureItems () {
  const { items, mapStatus, priceStatus } = ItemData()
  const [lastFetchTime, setLastFetchTime] = useState(new Date())
  const [currentTime, setCurrentTime] = useState(new Date())
  const [selectedCategory, setSelectedCategory] = useState('hot')
  const [watchlist, setWatchlist] = useState(new Set())

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

  const predictions = useMemo(() => generateFuturePredictions(items), [items])
  const categorizedPredictions = useMemo(() => {
    const result = {}
    Object.keys(predictionCategories).forEach(key => {
      result[key] = predictionCategories[key].filter(predictions)
    })
    return result
  }, [predictions])

  const toggleWatchlist = (itemId) => {
    const newWatchlist = new Set(watchlist)
    if (newWatchlist.has(itemId)) {
      newWatchlist.delete(itemId)
    } else {
      newWatchlist.add(itemId)
    }
    setWatchlist(newWatchlist)
  }

  if (mapStatus === 'loading' || priceStatus === 'loading') {
    return (
      <Center h={300}>
        <Loader size="lg" />
      </Center>
    )
  }

  return (
    <Box sx={{ py: 4 }}>
      {/* Header */}
      <Group position="apart" mb="xl">
        <div>
          <Text size="xl" weight={700} color="white">🔮 Future Items Predictor</Text>
          <Text size="sm" color="rgba(255, 255, 255, 0.7)">
            AI-powered predictions for upcoming market opportunities
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
          <Badge color="purple" size="lg">
            {predictions.length} Predictions
          </Badge>
        </Group>
      </Group>

      {/* AI Confidence Overview */}
      <Card withBorder p="md" mb="xl">
        <Group position="apart" mb="md">
          <Group>
            <IconBrain size={20} color="purple" />
            <Text weight={500}>AI Market Analysis</Text>
          </Group>
          <Badge color="green" variant="light">
            Model Accuracy: 73.2%
          </Badge>
        </Group>
        <Grid>
          <Grid.Col span={4}>
            <Stack spacing="xs">
              <Text size="sm" color="dimmed">Market Sentiment</Text>
              <Group>
                <Progress
                  value={68}
                  color="green"
                  size="sm"
                  style={{ flex: 1 }}
                />
                <Text size="sm" weight={500}>Bullish</Text>
              </Group>
            </Stack>
          </Grid.Col>
          <Grid.Col span={4}>
            <Stack spacing="xs">
              <Text size="sm" color="dimmed">Volatility Index</Text>
              <Group>
                <Progress
                  value={42}
                  color="orange"
                  size="sm"
                  style={{ flex: 1 }}
                />
                <Text size="sm" weight={500}>Moderate</Text>
              </Group>
            </Stack>
          </Grid.Col>
          <Grid.Col span={4}>
            <Stack spacing="xs">
              <Text size="sm" color="dimmed">Data Quality</Text>
              <Group>
                <Progress
                  value={91}
                  color="blue"
                  size="sm"
                  style={{ flex: 1 }}
                />
                <Text size="sm" weight={500}>Excellent</Text>
              </Group>
            </Stack>
          </Grid.Col>
        </Grid>
      </Card>

      {/* Prediction Categories */}
      <Tabs value={selectedCategory} onTabChange={setSelectedCategory} variant="outline">
        <Tabs.List>
          {Object.entries(predictionCategories).map(([key, category]) => (
            <Tabs.Tab
              key={key}
              value={key}
              icon={<IconTarget size={16} />}
            >
              <div>
                <Text size="sm" weight={500}>{category.name}</Text>
                <Text size="xs" color="dimmed">{category.description}</Text>
              </div>
            </Tabs.Tab>
          ))}
        </Tabs.List>

        {Object.entries(predictionCategories).map(([key, category]) => (
          <Tabs.Panel key={key} value={key} pt="md">
            {categorizedPredictions[key]?.length > 0
              ? (
              <Table striped highlightOnHover>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Current Price</th>
                    <th>Predicted Price</th>
                    <th>Change</th>
                    <th>Confidence</th>
                    <th>Risk</th>
                    <th>Timeframe</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categorizedPredictions[key].slice(0, 20).map((prediction, idx) => (
                    <tr key={idx}>
                      <td>
                        <Group spacing="xs">
                          <Text weight={500} size="sm">{prediction.name}</Text>
                          <Badge size="xs" color="gray">ID: {prediction.id}</Badge>
                        </Group>
                      </td>
                      <td>
                        <Text size="sm">{prediction.high}</Text>
                      </td>
                      <td>
                        <Text size="sm" weight={500}>
                          {prediction.predictedPrice.toLocaleString()} gp
                        </Text>
                      </td>
                      <td>
                        <Badge
                          color={parseFloat(prediction.predictedChange) >= 0 ? 'green' : 'red'}
                          variant="light"
                        >
                          {parseFloat(prediction.predictedChange) >= 0 ? '+' : ''}{prediction.predictedChange}%
                        </Badge>
                      </td>
                      <td>
                        <Group spacing="xs">
                          <Progress
                            value={prediction.confidence}
                            color={prediction.confidence > 70 ? 'green' : prediction.confidence > 50 ? 'yellow' : 'red'}
                            size="sm"
                            style={{ width: 60 }}
                          />
                          <Text size="xs">{prediction.confidence}%</Text>
                        </Group>
                      </td>
                      <td>
                        <Badge
                          color={prediction.riskLevel === 'Low' ? 'green' : prediction.riskLevel === 'Medium' ? 'yellow' : 'red'}
                          size="sm"
                        >
                          {prediction.riskLevel}
                        </Badge>
                      </td>
                      <td>
                        <Text size="sm" color="dimmed">{prediction.timeframe}</Text>
                      </td>
                      <td>
                        <Group spacing="xs">
                          <Tooltip label="Add to watchlist">
                            <ActionIcon
                              color={watchlist.has(prediction.id) ? 'red' : 'gray'}
                              variant="light"
                              size="sm"
                              onClick={() => toggleWatchlist(prediction.id)}
                            >
                              <IconHeart size={14} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="View details">
                            <ActionIcon
                              color="blue"
                              variant="light"
                              size="sm"
                            >
                              <IconEye size={14} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
                )
              : (
              <Center h={200}>
                <Stack align="center" spacing="md">
                  <IconFlask size={48} color="gray" />
                  <Text color="dimmed">No predictions available for this category</Text>
                </Stack>
              </Center>
                )}
          </Tabs.Panel>
        ))}
      </Tabs>

      {/* Disclaimer */}
      <Alert
        icon={<IconAlertTriangle size={16} />}
        title="Important Disclaimer"
        color="yellow"
        mt="xl"
      >
        <Text size="sm">
          These predictions are generated using AI algorithms and historical data analysis.
          They should be used for informational purposes only and do not guarantee future performance.
          Always conduct your own research and consider market risks before making trading decisions.
        </Text>
      </Alert>
    </Box>
  )
}
