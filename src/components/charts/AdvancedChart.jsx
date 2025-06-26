import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Brush,
  BarChart,
  Bar,
  ComposedChart,
  Area,
  AreaChart,
  Scatter,
  ScatterChart,
  Cell
} from 'recharts'
import {
  Card,
  Group,
  Button,
  Select,
  Badge,
  Text,
  ActionIcon,
  Menu,
  Popover,
  TextInput,
  ColorPicker,
  Switch,
  Stack,
  Divider,
  Tooltip as MantineTooltip,
  Modal,
  NumberInput,
  Textarea
} from '@mantine/core'
import {
  IconSettings,
  IconTag,
  IconTrendingUp,
  IconTrendingDown,
  IconVolume,
  IconCalendarEvent,
  IconPlus,
  IconEdit,
  IconTrash,
  IconEye,
  IconEyeOff,
  IconDownload,
  IconMaximize,
  IconZoomIn,
  IconZoomOut,
  IconRefresh
} from '@tabler/icons-react'
import { useQuery } from 'react-query'
import { getItemHistoryById } from '../../api/rs-wiki-api.jsx'
import { getItemById, getRelativeTime } from '../../utils/utils.jsx'

const AdvancedChart = ({ itemId, height = 500, showControls = true }) => {
  const [timeframe, setTimeframe] = useState('24h')
  const [chartType, setChartType] = useState('candlestick')
  const [showVolume, setShowVolume] = useState(true)
  const [showGameUpdates, setShowGameUpdates] = useState(true)
  const [annotations, setAnnotations] = useState([])
  const [selectedAnnotation, setSelectedAnnotation] = useState(null)
  const [annotationModalOpen, setAnnotationModalOpen] = useState(false)
  const [zoomDomain, setZoomDomain] = useState(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const chartRef = useRef(null)
  const item = getItemById(Number(itemId))

  // Mock game updates data - in real app, this would come from your database
  const gameUpdates = [
    {
      id: 'update_1',
      date: new Date('2024-01-15'),
      title: 'Mining & Smithing Rework',
      description: 'Major update affecting metal prices',
      type: 'major',
      color: '#ff6b6b'
    },
    {
      id: 'update_2',
      date: new Date('2024-01-20'),
      title: 'Double XP Weekend',
      description: 'Increased demand for training items',
      type: 'event',
      color: '#4ecdc4'
    },
    {
      id: 'update_3',
      date: new Date('2024-01-25'),
      title: 'Boss Drop Rate Changes',
      description: 'Adjusted rare drop rates',
      type: 'minor',
      color: '#45b7d1'
    }
  ]

  const { data: historyData, isLoading, refetch } = useQuery({
    queryKey: ['advancedChart', itemId, timeframe],
    queryFn: async () => {
      const result = await getItemHistoryById(timeframe, itemId)
      return result?.data?.data || []
    },
    enabled: !!itemId,
    refetchInterval: 30000 // Refetch every 30 seconds
  })

  // Process data for chart
  const chartData = useMemo(() => {
    if (!historyData || historyData.length === 0) return []

    return historyData
      .filter(item => item.timestamp && (item.avgHighPrice !== null || item.avgLowPrice !== null))
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((item, index) => {
        const date = new Date(item.timestamp * 1000)
        const high = item.avgHighPrice || item.avgLowPrice || 0
        const low = item.avgLowPrice || item.avgHighPrice || 0
        const volume = item.highPriceVolume || item.lowPriceVolume || 0

        return {
          timestamp: item.timestamp,
          date: date.toISOString(),
          dateFormatted: formatDateForTimeframe(date, timeframe),
          high,
          low,
          close: high, // Use high as close for now
          open: index > 0 ? chartData[index - 1]?.high || high : high,
          volume,
          avgPrice: (high + low) / 2,
          spread: high - low,
          spreadPercent: low > 0 ? ((high - low) / low) * 100 : 0
        }
      })
  }, [historyData, timeframe])

  // Format date based on timeframe
  const formatDateForTimeframe = (date, tf) => {
    switch (tf) {
      case '5m':
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      case '1h':
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      case '6h':
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit' })
      case '24h':
      default:
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  // Add annotation
  const addAnnotation = (x, y, type = 'note') => {
    const newAnnotation = {
      id: `annotation_${Date.now()}`,
      x,
      y,
      type,
      title: 'New Annotation',
      description: '',
      color: '#339af0',
      visible: true,
      createdAt: new Date()
    }
    setAnnotations([...annotations, newAnnotation])
    setSelectedAnnotation(newAnnotation)
    setAnnotationModalOpen(true)
  }

  // Update annotation
  const updateAnnotation = (id, updates) => {
    setAnnotations(annotations.map(ann =>
      ann.id === id ? { ...ann, ...updates } : ann
    ))
  }

  // Delete annotation
  const deleteAnnotation = (id) => {
    setAnnotations(annotations.filter(ann => ann.id !== id))
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null

    const data = payload[0].payload
    const gameUpdate = gameUpdates.find(update =>
      Math.abs(new Date(update.date).getTime() - new Date(data.date).getTime()) < 24 * 60 * 60 * 1000
    )

    return (
      <Card shadow="md" p="sm" style={{ minWidth: 200 }}>
        <Text size="sm" weight={500} mb="xs">
          {data.dateFormatted}
        </Text>

        <Stack spacing={4}>
          <Group position="apart">
            <Text size="xs" color="dimmed">High:</Text>
            <Text size="xs" weight={500} color="green">
              {new Intl.NumberFormat().format(data.high)}
            </Text>
          </Group>

          <Group position="apart">
            <Text size="xs" color="dimmed">Low:</Text>
            <Text size="xs" weight={500} color="blue">
              {new Intl.NumberFormat().format(data.low)}
            </Text>
          </Group>

          <Group position="apart">
            <Text size="xs" color="dimmed">Volume:</Text>
            <Text size="xs" weight={500}>
              {new Intl.NumberFormat().format(data.volume)}
            </Text>
          </Group>

          <Group position="apart">
            <Text size="xs" color="dimmed">Spread:</Text>
            <Text size="xs" weight={500}>
              {data.spreadPercent.toFixed(2)}%
            </Text>
          </Group>
        </Stack>

        {gameUpdate && (
          <>
            <Divider my="xs" />
            <Badge
              color={gameUpdate.type === 'major' ? 'red' : gameUpdate.type === 'event' ? 'green' : 'blue'}
              variant="light"
              size="sm"
              fullWidth
            >
              {gameUpdate.title}
            </Badge>
            <Text size="xs" color="dimmed" mt={4}>
              {gameUpdate.description}
            </Text>
          </>
        )}
      </Card>
    )
  }

  // Custom dot for game updates
  const GameUpdateDot = ({ cx, cy, payload }) => {
    const gameUpdate = gameUpdates.find(update =>
      Math.abs(new Date(update.date).getTime() - new Date(payload.date).getTime()) < 24 * 60 * 60 * 1000
    )

    if (!gameUpdate || !showGameUpdates) return null

    return (
      <MantineTooltip label={gameUpdate.title} position="top">
        <circle
          cx={cx}
          cy={cy - 20}
          r={6}
          fill={gameUpdate.color}
          stroke="#fff"
          strokeWidth={2}
          style={{ cursor: 'pointer' }}
        />
      </MantineTooltip>
    )
  }

  // Render different chart types
  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 20, right: 30, left: 20, bottom: 20 }
    }

    switch (chartType) {
      case 'line':
        return (
          <ComposedChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="dateFormatted"
              stroke="#9CA3AF"
              fontSize={12}
            />
            <YAxis
              stroke="#9CA3AF"
              fontSize={12}
              tickFormatter={(value) => new Intl.NumberFormat().format(value)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />

            <Line
              type="monotone"
              dataKey="high"
              stroke="#10B981"
              strokeWidth={2}
              dot={false}
              name="High Price"
            />
            <Line
              type="monotone"
              dataKey="low"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={false}
              name="Low Price"
            />

            {showVolume && (
              <Bar
                dataKey="volume"
                fill="#6B7280"
                opacity={0.3}
                yAxisId="volume"
                name="Volume"
              />
            )}

            {/* Game update markers */}
            {chartData.map((entry, index) => (
              <GameUpdateDot key={index} cx={index} cy={entry.high} payload={entry} />
            ))}

            {/* Annotations */}
            {annotations.filter(ann => ann.visible).map(annotation => (
              <ReferenceLine
                key={annotation.id}
                x={annotation.x}
                stroke={annotation.color}
                strokeDasharray="5 5"
                label={{ value: annotation.title, position: 'top' }}
              />
            ))}
          </ComposedChart>
        )

      case 'area':
        return (
          <ComposedChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="dateFormatted"
              stroke="#9CA3AF"
              fontSize={12}
            />
            <YAxis
              stroke="#9CA3AF"
              fontSize={12}
              tickFormatter={(value) => new Intl.NumberFormat().format(value)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />

            <Area
              type="monotone"
              dataKey="high"
              stackId="1"
              stroke="#10B981"
              fill="#10B981"
              fillOpacity={0.6}
              name="High Price"
            />
            <Area
              type="monotone"
              dataKey="low"
              stackId="1"
              stroke="#3B82F6"
              fill="#3B82F6"
              fillOpacity={0.4}
              name="Low Price"
            />

            {showVolume && (
              <Bar
                dataKey="volume"
                fill="#6B7280"
                opacity={0.3}
                yAxisId="volume"
                name="Volume"
              />
            )}
          </ComposedChart>
        )

      case 'candlestick':
      default:
        return (
          <ComposedChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="dateFormatted"
              stroke="#9CA3AF"
              fontSize={12}
            />
            <YAxis
              stroke="#9CA3AF"
              fontSize={12}
              tickFormatter={(value) => new Intl.NumberFormat().format(value)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />

            {/* Candlestick representation using areas */}
            <Area
              type="monotone"
              dataKey="high"
              stroke="#10B981"
              fill="transparent"
              strokeWidth={2}
              name="High Price"
            />
            <Area
              type="monotone"
              dataKey="low"
              stroke="#EF4444"
              fill="transparent"
              strokeWidth={2}
              name="Low Price"
            />

            {showVolume && (
              <Bar
                dataKey="volume"
                fill="#6B7280"
                opacity={0.3}
                yAxisId="volume"
                name="Volume"
              />
            )}
          </ComposedChart>
        )
    }
  }

  const timeframeOptions = [
    { value: '5m', label: '5 Min' },
    { value: '1h', label: '1 Hour' },
    { value: '6h', label: '6 Hours' },
    { value: '24h', label: '24 Hours' }
  ]

  const chartTypeOptions = [
    { value: 'candlestick', label: 'Candlestick' },
    { value: 'line', label: 'Line Chart' },
    { value: 'area', label: 'Area Chart' }
  ]

  return (
    <Card shadow="sm" p="md" style={{ height: isFullscreen ? '100vh' : 'auto' }}>
      {/* Chart Controls */}
      {showControls && (
        <Group position="apart" mb="md">
          <Group>
            <Select
              data={timeframeOptions}
              value={timeframe}
              onChange={(value) => setTimeframe(value ?? '1d')}
              size="sm"
              style={{ width: 100 }}
            />

            <Select
              data={chartTypeOptions}
              value={chartType}
              onChange={(value) => setChartType(value ?? 'line')}
              size="sm"
              style={{ width: 130 }}
            />

            <ActionIcon onClick={refetch} size="sm" variant="light">
              <IconRefresh size={16} />
            </ActionIcon>
          </Group>

          <Group>
            <Switch
              label="Volume"
              checked={showVolume}
              onChange={(e) => setShowVolume(e.currentTarget.checked)}
              size="sm"
            />

            <Switch
              label="Game Updates"
              checked={showGameUpdates}
              onChange={(e) => setShowGameUpdates(e.currentTarget.checked)}
              size="sm"
            />

            <Menu shadow="md" width={200}>
              <Menu.Target>
                <ActionIcon size="sm" variant="light">
                  <IconSettings size={16} />
                </ActionIcon>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Item
                  icon={<IconTag size={14} />}
                  onClick={() => setAnnotationModalOpen(true)}
                >
                  Add Annotation
                </Menu.Item>
                <Menu.Item
                  icon={<IconDownload size={14} />}
                  onClick={() => { /* Export chart */ }}
                >
                  Export Chart
                </Menu.Item>
                <Menu.Item
                  icon={<IconMaximize size={14} />}
                  onClick={() => setIsFullscreen(!isFullscreen)}
                >
                  {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      )}

      {/* Chart Title */}
      <Group position="apart" align="center" mb="md">
        <div>
          <Text size="lg" weight={500}>
            {item?.name || 'Loading...'}
          </Text>
          <Group spacing="xs">
            <Badge color="blue" variant="light" size="sm">
              {timeframe}
            </Badge>
            <Badge color="green" variant="light" size="sm">
              Live Data
            </Badge>
            {chartData.length > 0 && (
              <Text size="xs" color="dimmed">
                {chartData.length} data points
              </Text>
            )}
          </Group>
        </div>

        {/* Price Summary */}
        {chartData.length > 0 && (
          <div style={{ textAlign: 'right' }}>
            <Text size="xl" weight={700} color="green">
              {new Intl.NumberFormat().format(chartData[chartData.length - 1]?.high || 0)}
            </Text>
            <Text size="sm" color="dimmed">
              Latest High Price
            </Text>
          </div>
        )}
      </Group>

      {/* Chart Container */}
      <div style={{ height, width: '100%' }} ref={chartRef}>
        {isLoading
          ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%'
          }}>
            <Text>Loading chart data...</Text>
          </div>
            )
          : chartData.length === 0
            ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%'
          }}>
            <Text color="dimmed">No data available for this timeframe</Text>
          </div>
              )
            : (
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
              )}
      </div>

      {/* Game Updates Legend */}
      {showGameUpdates && gameUpdates.length > 0 && (
        <Group mt="md" spacing="xs">
          <Text size="xs" color="dimmed">Game Updates:</Text>
          {gameUpdates.map(update => (
            <Badge
              key={update.id}
              color={update.type === 'major' ? 'red' : update.type === 'event' ? 'green' : 'blue'}
              variant="dot"
              size="sm"
            >
              {update.title}
            </Badge>
          ))}
        </Group>
      )}

      {/* Annotation Modal */}
      <Modal
        opened={annotationModalOpen}
        onClose={() => setAnnotationModalOpen(false)}
        title="Add Annotation"
        size="md"
      >
        <Stack spacing="md">
          <TextInput
            label="Title"
            placeholder="Annotation title"
            value={selectedAnnotation?.title || ''}
            onChange={(e) => setSelectedAnnotation({
              ...selectedAnnotation,
              title: e.target.value
            })}
          />

          <Textarea
            label="Description"
            placeholder="Add description..."
            value={selectedAnnotation?.description || ''}
            onChange={(e) => setSelectedAnnotation({
              ...selectedAnnotation,
              description: e.target.value
            })}
          />

          <Group>
            <ColorPicker
              value={selectedAnnotation?.color || '#339af0'}
              onChange={(color) => setSelectedAnnotation({
                ...selectedAnnotation,
                color
              })}
            />
          </Group>

          <Group position="right">
            <Button
              variant="default"
              onClick={() => setAnnotationModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedAnnotation) {
                  updateAnnotation(selectedAnnotation.id, selectedAnnotation)
                }
                setAnnotationModalOpen(false)
              }}
            >
              Save
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Card>
  )
}

export default AdvancedChart
