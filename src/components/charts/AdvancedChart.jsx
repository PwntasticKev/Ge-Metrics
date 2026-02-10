import React, { useState, useEffect, useMemo } from 'react'
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  BarChart,
  Bar,
  ComposedChart,
  Area,
  ReferenceArea,
  Scatter
} from 'recharts'
import {
  Card,
  Group,
  Button,
  Badge,
  Text,
  ActionIcon,
  Menu,
  TextInput,
  ColorPicker,
  Stack,
  Divider,
  Modal,
  Textarea,
  Box,
  Flex,
  Checkbox,
  Popover
} from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import {
  IconSettings,
  IconTag,
  IconMaximize,
  IconZoomOut,
  IconFilter,
  IconSparkles
} from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { getItemHistoryById } from '../../api/rs-wiki-api.jsx'
import { getItemById } from '../../utils/utils.jsx'
import { calculateSMA, calculateEMA } from '../../utils/indicators.js'
import { trpc } from '../../utils/trpc.jsx'
import { isThreeJsChartEnabled, toggleThreeJsChart } from '../../config/featureFlags.js'
import ChartLegend from './ChartLegend.jsx'
import PriceChangeIndicator from './PriceChangeIndicator.jsx'
import InteractionHints from './InteractionHints.jsx'
import MobileInfoDrawer from './MobileInfoDrawer.jsx'

// Color Constants
const COLORS = {
  sell: '#f59e0b',
  buy: '#3b82f6',
  sma: '#22d3ee',
  ema: '#a78bfa',
  grid: 'rgba(55, 65, 81, 0.2)',
  crosshair: '#6B7280',
  text: '#C1C2C5',
  blog: '#3b82f6',
  update: '#f59e0b'
}

export { COLORS }

const AdvancedChart = ({ itemId, items, item: itemProp, height = 600, showControls = true, transparentBg = false, onChartDataReady }) => {
  const [timeframe, setTimeframe] = useState('1h')
  const [range, setRange] = useState('1W')
  const isMobile = useMediaQuery('(max-width: 768px)')

  const [seriesVisibility, setSeriesVisibility] = useState({
    highPrice: true,
    lowPrice: true,
    buyVolume: true,
    sellVolume: true,
    sma20: false,
    ema20: false,
    updates: true
  })

  const [left, setLeft] = useState('dataMin')
  const [right, setRight] = useState('dataMax')
  const [refAreaLeft, setRefAreaLeft] = useState('')
  const [refAreaRight, setRefAreaRight] = useState('')
  const [top, setTop] = useState('auto')
  const [bottom, setBottom] = useState('auto')

  const [hoverData, setHoverData] = useState(null)
  const [activeTimestamp, setActiveTimestamp] = useState(null)

  const [annotations, setAnnotations] = useState([])
  const [selectedAnnotation, setSelectedAnnotation] = useState(null)
  const [annotationModalOpen, setAnnotationModalOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const item = useMemo(() => {
    if (itemProp) return itemProp
    if (itemId && items) return getItemById(Number(itemId), items)
    return { name: 'Unknown Item', id: itemId }
  }, [itemId, items, itemProp])

  const { data: historyData, isLoading, error: fetchError, refetch } = useQuery({
    queryKey: ['advancedChart', itemId, timeframe],
    queryFn: async () => {
      if (!itemId) return []
      const result = await getItemHistoryById(timeframe, itemId)
      return result?.data?.data || []
    },
    enabled: !!itemId,
    refetchInterval: 30000
  })

  const startDate = useMemo(() => {
    if (!historyData?.length) return new Date('2024-01-01')
    const chartStartTime = Math.min(...historyData.map(d => d.timestamp * 1000))
    const chartStart = new Date(chartStartTime)
    const eventStart = new Date(chartStart)
    eventStart.setMonth(chartStart.getMonth() - 6)
    return eventStart
  }, [historyData])

  const endDate = useMemo(() => {
    if (!historyData?.length) return new Date('2025-12-31')
    const chartEndTime = Math.max(...historyData.map(d => d.timestamp * 1000))
    const chartEnd = new Date(chartEndTime)
    const eventEnd = new Date(chartEnd)
    eventEnd.setMonth(chartEnd.getMonth() + 1)
    return eventEnd
  }, [historyData])

  const blogsQuery = trpc.gameEvents.getByDateRange.useQuery({
    startDate,
    endDate
  }, {
    enabled: !!historyData && historyData.length > 0 && seriesVisibility.updates,
    staleTime: 5 * 60 * 1000
  })

  const gameUpdates = useMemo(() => {
    const blogs = blogsQuery.data?.data?.blogs || []
    const updates = blogsQuery.data?.data?.updates || []

    const combined = [
      ...blogs.map(b => ({
        id: `blog_${b.date}`,
        date: new Date(b.date),
        title: b.title || 'Developer Blog',
        description: 'Read more on the OSRS homepage',
        type: 'blog',
        color: COLORS.blog
      })),
      ...updates.map(u => ({
        id: `update_${u.updateDate || u.date}`,
        date: new Date(u.updateDate || u.date),
        title: u.title || 'Game Update',
        description: u.category || 'Game Update',
        type: 'update',
        color: COLORS.update
      }))
    ]

    return combined.sort((a, b) => a.date - b.date)
  }, [blogsQuery.data])

  const formatDateForTimeframe = (date, rng) => {
    switch (rng) {
      case '1D': return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      case '1W': return date.toLocaleDateString('en-US', { weekday: 'short', hour: '2-digit' })
      case '1M': case '3M': return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      default: return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    }
  }

  useEffect(() => {
    switch (range) {
      case '1D': setTimeframe('5m'); break
      case '1W': setTimeframe('1h'); break
      case '1M': setTimeframe('1h'); break
      case '3M': setTimeframe('6h'); break
      case '6M': setTimeframe('6h'); break
      case '1Y': setTimeframe('24h'); break
      case 'All': setTimeframe('24h'); break
      default: setTimeframe('24h')
    }
    zoomOut()
  }, [range])

  const chartData = useMemo(() => {
    if (!historyData || historyData.length === 0) return []

    const now = Date.now()
    let cutoff = 0
    switch (range) {
      case '1D': cutoff = now - 24 * 60 * 60 * 1000; break
      case '1W': cutoff = now - 7 * 24 * 60 * 60 * 1000; break
      case '1M': cutoff = now - 30 * 24 * 60 * 60 * 1000; break
      case '3M': cutoff = now - 90 * 24 * 60 * 60 * 1000; break
      case '6M': cutoff = now - 180 * 24 * 60 * 60 * 1000; break
      case '1Y': cutoff = now - 365 * 24 * 60 * 60 * 1000; break
      default: cutoff = 0
    }

    let processed = historyData
      .filter(d => {
        const ts = d.timestamp * 1000
        return ts >= cutoff && (d.avgHighPrice !== null || d.avgLowPrice !== null)
      })
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(d => {
        const date = new Date(d.timestamp * 1000)
        const high = d.avgHighPrice || d.avgLowPrice || 0
        const low = d.avgLowPrice || d.avgHighPrice || 0

        return {
          timestamp: d.timestamp,
          time: d.timestamp,
          value: high,
          date: date.toISOString(),
          dateObj: date,
          dateFormatted: formatDateForTimeframe(date, range),
          high,
          low,
          buyVolume: d.lowPriceVolume || 0,
          sellVolume: d.highPriceVolume || 0,
          negativeSellVolume: -(d.highPriceVolume || 0)
        }
      })

    if (processed.length > 0) {
      const sma20 = calculateSMA(processed, 20)
      const ema20 = calculateEMA(processed, 20)

      const smaMap = new Map(sma20.map(s => [s.time, s.value]))
      const emaMap = new Map(ema20.map(e => [e.time, e.value]))

      processed = processed.map(p => ({
        ...p,
        sma20: smaMap.get(p.time) ?? null,
        ema20: emaMap.get(p.time) ?? null
      }))
    }

    return processed
  }, [historyData, range, timeframe])

  useEffect(() => {
    if (onChartDataReady && chartData.length > 0) {
      onChartDataReady(chartData)
    }
  }, [chartData, onChartDataReady])

  // Compute max volume for butterfly chart symmetric domain
  const maxVolume = useMemo(() => {
    if (!chartData.length) return 1
    let max = 0
    for (const d of chartData) {
      if (d.buyVolume > max) max = d.buyVolume
      if (d.sellVolume > max) max = d.sellVolume
    }
    return max || 1
  }, [chartData])

  // Latest price for current price marker
  const latestPrice = useMemo(() => {
    if (!chartData.length) return null
    const last = chartData[chartData.length - 1]
    return last.high || last.low || null
  }, [chartData])

  const updatesData = useMemo(() => {
    if (!gameUpdates.length || !chartData.length) return []

    const leftBound = left === 'dataMin' ? chartData[0]?.timestamp : left
    const rightBound = right === 'dataMax' ? chartData[chartData.length - 1]?.timestamp : right

    const visibleData = chartData.filter(d => d.timestamp >= leftBound && d.timestamp <= rightBound)
    if (!visibleData.length) return []

    const prices = visibleData.flatMap(d => [
      seriesVisibility.highPrice ? d.high : null,
      seriesVisibility.lowPrice ? d.low : null,
      seriesVisibility.sma20 ? d.sma20 : null,
      seriesVisibility.ema20 ? d.ema20 : null
    ].filter(p => p !== null && p > 0))

    if (prices.length === 0) {
      const allPrices = visibleData.flatMap(d => [d.high, d.low].filter(p => p !== null && p > 0))
      prices.push(...allPrices)
    }

    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const priceRange = maxPrice - minPrice
    const dotY = minPrice + (priceRange * 0.05)

    return gameUpdates.map(u => ({
      timestamp: u.date.getTime() / 1000,
      y: dotY,
      updateData: u,
      dateFormatted: formatDateForTimeframe(u.date, range),
      dateObj: u.date
    }))
  }, [gameUpdates, range, chartData, left, right, seriesVisibility])

  useEffect(() => {
    if (chartData.length > 0 && !hoverData) {
      setHoverData(chartData[chartData.length - 1])
    }
  }, [chartData])

  const zoom = () => {
    if (refAreaLeft === refAreaRight || refAreaRight === '') {
      setRefAreaLeft('')
      setRefAreaRight('')
      return
    }

    let leftX = refAreaLeft
    let rightX = refAreaRight
    if (leftX > rightX) [leftX, rightX] = [rightX, leftX]

    const zoomedData = chartData.filter(d => d.timestamp >= leftX && d.timestamp <= rightX)
    if (zoomedData.length > 0) {
      const activeValues = []
      zoomedData.forEach(d => {
        if (seriesVisibility.highPrice) activeValues.push(d.high)
        if (seriesVisibility.lowPrice) activeValues.push(d.low)
        if (seriesVisibility.sma20 && d.sma20) activeValues.push(d.sma20)
        if (seriesVisibility.ema20 && d.ema20) activeValues.push(d.ema20)
      })

      if (activeValues.length > 0) {
        const minP = Math.min(...activeValues)
        const maxP = Math.max(...activeValues)
        const padding = (maxP - minP) * 0.1
        setBottom(minP - padding)
        setTop(maxP + padding)
      }
    }

    setLeft(leftX)
    setRight(rightX)
    setRefAreaLeft('')
    setRefAreaRight('')
  }

  const zoomOut = () => {
    setLeft('dataMin')
    setRight('dataMax')
    setTop('auto')
    setBottom('auto')
    setRefAreaLeft('')
    setRefAreaRight('')
  }

  const handleWheel = (e) => {
    if (!chartData || chartData.length === 0) return

    const minTime = chartData[0].timestamp
    const maxTime = chartData[chartData.length - 1].timestamp

    let currentLeft = left === 'dataMin' ? minTime : left
    let currentRight = right === 'dataMax' ? maxTime : right

    if (typeof currentLeft !== 'number') currentLeft = minTime
    if (typeof currentRight !== 'number') currentRight = maxTime

    const rangeVal = currentRight - currentLeft
    if (rangeVal <= 0) return

    if (e.ctrlKey || e.metaKey) {
      const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9
      const newRange = rangeVal * zoomFactor

      const center = (currentLeft + currentRight) / 2
      let newLeft = center - newRange / 2
      let newRight = center + newRange / 2

      if (newLeft < minTime) newLeft = minTime
      if (newRight > maxTime) newRight = maxTime

      const visibleData = chartData.filter(d => d.timestamp >= newLeft && d.timestamp <= newRight)
      if (visibleData.length > 0) {
        const activeValues = []
        visibleData.forEach(d => {
          if (seriesVisibility.highPrice) activeValues.push(d.high)
          if (seriesVisibility.lowPrice) activeValues.push(d.low)
        })
        if (activeValues.length > 0) {
          const minP = Math.min(...activeValues)
          const maxP = Math.max(...activeValues)
          const padding = (maxP - minP) * 0.1
          setBottom(minP - padding)
          setTop(maxP + padding)
        }
      }

      setLeft(newLeft)
      setRight(newRight)
    } else {
      const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY
      if (delta === 0) return

      const shift = (rangeVal / 1000) * delta

      let newLeft = currentLeft + shift
      let newRight = currentRight + shift

      if (newLeft < minTime) {
        newLeft = minTime
        newRight = newLeft + rangeVal
      }
      if (newRight > maxTime) {
        newRight = maxTime
        newLeft = newRight - rangeVal
      }

      setLeft(newLeft)
      setRight(newRight)

      const visibleData = chartData.filter(d => d.timestamp >= newLeft && d.timestamp <= newRight)
      if (visibleData.length > 0) {
        const activeValues = []
        visibleData.forEach(d => {
          if (seriesVisibility.highPrice) activeValues.push(d.high)
          if (seriesVisibility.lowPrice) activeValues.push(d.low)
        })
        if (activeValues.length > 0) {
          const minP = Math.min(...activeValues)
          const maxP = Math.max(...activeValues)
          const padding = (maxP - minP) * 0.1
          setBottom(minP - padding)
          setTop(maxP + padding)
        }
      }
    }
  }

  const commonChartProps = {
    data: chartData,
    margin: { top: 5, right: 30, left: 0, bottom: 5 },
    onMouseDown: (e) => setRefAreaLeft(e?.activePayload?.[0]?.payload?.timestamp),
    onMouseUp: zoom,
    onMouseLeave: () => {}
  }

  const handleMouseMove = (e) => {
    if (e?.activePayload?.[0]?.payload) {
      const payload = e.activePayload[0].payload
      const currentTimestamp = payload.timestamp

      const gracePeriod = 7 * 24 * 60 * 60
      let nearbyEvent = null
      let closestEventDiff = Infinity

      updatesData.forEach(event => {
        const timeDiff = Math.abs(currentTimestamp - event.timestamp)
        if (timeDiff <= gracePeriod && timeDiff < closestEventDiff) {
          closestEventDiff = timeDiff
          nearbyEvent = event
        }
      })

      if (nearbyEvent) {
        setHoverData({
          ...payload,
          updateData: nearbyEvent.updateData,
          eventTimestamp: nearbyEvent.timestamp,
          isEventHover: true
        })
      } else {
        setHoverData(payload)
      }

      setActiveTimestamp(currentTimestamp)
      if (refAreaLeft) setRefAreaRight(currentTimestamp)
    }
  }

  const handleMouseLeave = () => {
    setActiveTimestamp(null)
  }

  const handleLegendToggle = (key) => {
    setSeriesVisibility(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Controls UI
  const renderControls = () => (
    <Group spacing="md" noWrap>
      <Popover position="bottom" withArrow shadow="md">
        <Popover.Target>
          <Button variant="subtle" size="xs" leftIcon={<IconFilter size={14} />} compact>
            Indicators
          </Button>
        </Popover.Target>
        <Popover.Dropdown>
          <Stack spacing="xs">
            <Checkbox
              label={<Text size="sm" color={COLORS.sell}>Sell Price</Text>}
              checked={seriesVisibility.highPrice}
              onChange={(e) => setSeriesVisibility(p => ({ ...p, highPrice: e.currentTarget.checked }))}
            />
            <Checkbox
              label={<Text size="sm" color={COLORS.buy}>Buy Price</Text>}
              checked={seriesVisibility.lowPrice}
              onChange={(e) => setSeriesVisibility(p => ({ ...p, lowPrice: e.currentTarget.checked }))}
            />
            <Divider my={4} />
            <Checkbox
              label={<Text size="sm" color={COLORS.sma}>SMA (20)</Text>}
              checked={seriesVisibility.sma20}
              onChange={(e) => setSeriesVisibility(p => ({ ...p, sma20: e.currentTarget.checked }))}
            />
            <Checkbox
              label={<Text size="sm" color={COLORS.ema}>EMA (20)</Text>}
              checked={seriesVisibility.ema20}
              onChange={(e) => setSeriesVisibility(p => ({ ...p, ema20: e.currentTarget.checked }))}
            />
            <Divider my={4} />
            <Checkbox
              label={<Text size="sm" color={COLORS.buy}>Buy Volume</Text>}
              checked={seriesVisibility.buyVolume}
              onChange={(e) => setSeriesVisibility(p => ({ ...p, buyVolume: e.currentTarget.checked }))}
            />
            <Checkbox
              label={<Text size="sm" color={COLORS.sell}>Sell Volume</Text>}
              checked={seriesVisibility.sellVolume}
              onChange={(e) => setSeriesVisibility(p => ({ ...p, sellVolume: e.currentTarget.checked }))}
            />
            <Divider my={4} />
            <Checkbox
              label={<Text size="sm">Game Updates</Text>}
              checked={seriesVisibility.updates}
              onChange={(e) => setSeriesVisibility(p => ({ ...p, updates: e.currentTarget.checked }))}
            />
          </Stack>
        </Popover.Dropdown>
      </Popover>
    </Group>
  )

  const renderMainChart = () => {
    const yDomain = [bottom === 'auto' ? 'dataMin' : bottom, top === 'auto' ? 'dataMax' : top]

    return (
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart {...commonChartProps} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
          <defs>
            {/* Glow area fills */}
            <linearGradient id="gradSell" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.sell} stopOpacity={0.5} />
              <stop offset="40%" stopColor={COLORS.sell} stopOpacity={0.15} />
              <stop offset="100%" stopColor={COLORS.sell} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradBuy" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.buy} stopOpacity={0.5} />
              <stop offset="40%" stopColor={COLORS.buy} stopOpacity={0.15} />
              <stop offset="100%" stopColor={COLORS.buy} stopOpacity={0} />
            </linearGradient>
            {/* Spread shading between buy/sell */}
            <linearGradient id="gradSpread" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.sell} stopOpacity={0.08} />
              <stop offset="100%" stopColor={COLORS.buy} stopOpacity={0.08} />
            </linearGradient>
            {/* SVG glow filters */}
            <filter id="glowSell">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor={COLORS.sell} floodOpacity="0.6" />
            </filter>
            <filter id="glowBuy">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor={COLORS.buy} floodOpacity="0.6" />
            </filter>
          </defs>
          <CartesianGrid stroke={COLORS.grid} vertical={false} />
          <XAxis
            dataKey="timestamp"
            type="number"
            domain={[left, right]}
            hide
            allowDataOverflow
          />
          <YAxis
            orientation="right"
            domain={yDomain}
            tick={{ fontSize: 12, fill: COLORS.crosshair }}
            tickFormatter={(value) => new Intl.NumberFormat('en', { notation: 'compact' }).format(value)}
            axisLine={false}
            tickLine={false}
            padding={{ top: 20, bottom: 20 }}
            allowDataOverflow
          />
          <Tooltip content={<></>} cursor={{ stroke: COLORS.crosshair, strokeWidth: 1, strokeDasharray: '4 4' }} />

          {/* Synchronized crosshair */}
          {activeTimestamp && (
            <ReferenceLine x={activeTimestamp} stroke={COLORS.crosshair} strokeWidth={1} strokeDasharray="2 2" />
          )}

          {/* Current price marker */}
          {latestPrice && (
            <ReferenceLine
              y={latestPrice}
              stroke={COLORS.sell}
              strokeDasharray="4 2"
              strokeOpacity={0.6}
              label={{
                value: new Intl.NumberFormat('en', { notation: 'compact' }).format(latestPrice),
                position: 'right',
                fill: COLORS.sell,
                fontSize: 10
              }}
            />
          )}

          {/* Spread shading — area fill between sell and buy using sell line as upper bound */}
          {seriesVisibility.highPrice && seriesVisibility.lowPrice && (
            <Area
              type="monotone"
              dataKey="high"
              stroke="none"
              fill="url(#gradSpread)"
              fillOpacity={1}
              isAnimationActive={false}
              connectNulls
              baseLine={0}
            />
          )}

          {/* Sell Price area fill with glow */}
          {seriesVisibility.highPrice && (
            <Area
              type="monotone"
              dataKey="high"
              stroke={COLORS.sell}
              strokeWidth={2.5}
              fill="url(#gradSell)"
              filter="url(#glowSell)"
              dot={false}
              activeDot={{ r: 4, stroke: COLORS.sell, fill: '#1A1B1E' }}
              isAnimationActive={false}
              connectNulls
            />
          )}

          {/* Buy Price area fill with glow */}
          {seriesVisibility.lowPrice && (
            <Area
              type="monotone"
              dataKey="low"
              stroke={COLORS.buy}
              strokeWidth={2.5}
              fill="url(#gradBuy)"
              filter="url(#glowBuy)"
              dot={false}
              activeDot={{ r: 4, stroke: COLORS.buy, fill: '#1A1B1E' }}
              isAnimationActive={false}
              connectNulls
            />
          )}

          {/* SMA 20 */}
          {seriesVisibility.sma20 && (
            <Line
              type="monotone"
              dataKey="sma20"
              stroke={COLORS.sma}
              strokeWidth={1.5}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
              connectNulls
            />
          )}

          {/* EMA 20 */}
          {seriesVisibility.ema20 && (
            <Line
              type="monotone"
              dataKey="ema20"
              stroke={COLORS.ema}
              strokeWidth={1.5}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
              connectNulls
            />
          )}

          {refAreaLeft && refAreaRight ? (
            <ReferenceArea x1={refAreaLeft} x2={refAreaRight} strokeOpacity={0.3} fill="#3B82F6" fillOpacity={0.1} />
          ) : null}
        </ComposedChart>
      </ResponsiveContainer>
    )
  }

  const renderVolumeChart = () => {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart {...commonChartProps} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
          <CartesianGrid stroke={COLORS.grid} vertical={false} />
          <XAxis
            dataKey="timestamp"
            type="number"
            domain={[left, right]}
            tick={{ fontSize: 12, fill: COLORS.crosshair }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(unix) => formatDateForTimeframe(new Date(unix * 1000), range)}
            allowDataOverflow
            minTickGap={30}
          />
          <YAxis
            orientation="right"
            domain={[-maxVolume, maxVolume]}
            tick={{ fontSize: 12, fill: COLORS.crosshair }}
            tickFormatter={(value) => new Intl.NumberFormat('en', { notation: 'compact' }).format(Math.abs(value))}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<></>} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />

          {/* Center line for butterfly */}
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />

          {/* Synchronized crosshair */}
          {activeTimestamp && (
            <ReferenceLine x={activeTimestamp} stroke={COLORS.crosshair} strokeWidth={1} strokeDasharray="2 2" />
          )}

          {/* Buy volume UP (positive) */}
          {seriesVisibility.buyVolume && (
            <Bar dataKey="buyVolume" fill={COLORS.buy} opacity={0.8} />
          )}
          {/* Sell volume DOWN (negative) */}
          {seriesVisibility.sellVolume && (
            <Bar dataKey="negativeSellVolume" fill={COLORS.sell} opacity={0.8} />
          )}
        </BarChart>
      </ResponsiveContainer>
    )
  }

  // Info Panel (desktop sidebar)
  const InfoPanel = ({ data }) => {
    if (!data) return (
      <Stack spacing="xs" p="md" align="center" justify="center" h="100%">
        <Text color="dimmed" size="sm">Hover chart for details</Text>
      </Stack>
    )

    return (
      <Stack spacing="md" p="md" h="100%" style={{ borderLeft: '1px solid rgba(255,255,255,0.05)', overflowY: 'auto' }}>
        <div>
          <Text size="xs" color="dimmed" transform="uppercase" weight={700} spacing={1}>Date</Text>
          <Text size="lg" weight={600} color="white">{data.dateFormatted}</Text>
          <Text size="xs" color="dimmed">{data.dateObj?.toLocaleTimeString()}</Text>
        </div>

        {(data.high !== undefined || data.low !== undefined) && (
          <div>
            <Text size="xs" color="dimmed" transform="uppercase" weight={700} spacing={1}>Price</Text>
            <Stack spacing={4}>
              {seriesVisibility.highPrice && data.high !== undefined && (
                <Group position="apart">
                  <Text size="sm" color={COLORS.sell}>Sell:</Text>
                  <Text size="sm" weight={700} color={COLORS.sell}>
                    {new Intl.NumberFormat().format(data.high)}
                  </Text>
                </Group>
              )}
              {seriesVisibility.lowPrice && data.low !== undefined && (
                <Group position="apart">
                  <Text size="sm" color={COLORS.buy}>Buy:</Text>
                  <Text size="sm" weight={700} color={COLORS.buy}>
                    {new Intl.NumberFormat().format(data.low)}
                  </Text>
                </Group>
              )}
            </Stack>
          </div>
        )}

        {(seriesVisibility.sma20 || seriesVisibility.ema20) && (
          <div>
            <Text size="xs" color="dimmed" transform="uppercase" weight={700} spacing={1}>Indicators</Text>
            <Stack spacing={4}>
              {seriesVisibility.sma20 && data.sma20 && (
                <Group position="apart">
                  <Text size="sm" color={COLORS.sma}>SMA(20):</Text>
                  <Text size="sm" weight={600} color="white">
                    {new Intl.NumberFormat().format(Math.round(data.sma20))}
                  </Text>
                </Group>
              )}
              {seriesVisibility.ema20 && data.ema20 && (
                <Group position="apart">
                  <Text size="sm" color={COLORS.ema}>EMA(20):</Text>
                  <Text size="sm" weight={600} color="white">
                    {new Intl.NumberFormat().format(Math.round(data.ema20))}
                  </Text>
                </Group>
              )}
            </Stack>
          </div>
        )}

        {(data.sellVolume !== undefined || data.buyVolume !== undefined) && (
          <div>
            <Text size="xs" color="dimmed" transform="uppercase" weight={700} spacing={1}>Volume</Text>
            <Stack spacing={4}>
              {seriesVisibility.sellVolume && (
                <Group position="apart">
                  <Text size="sm" color={COLORS.sell}>Sell Vol:</Text>
                  <Text size="sm" weight={600} color="white">
                    {new Intl.NumberFormat().format(data.sellVolume || 0)}
                  </Text>
                </Group>
              )}
              {seriesVisibility.buyVolume && (
                <Group position="apart">
                  <Text size="sm" color={COLORS.buy}>Buy Vol:</Text>
                  <Text size="sm" weight={600} color="white">
                    {new Intl.NumberFormat().format(data.buyVolume || 0)}
                  </Text>
                </Group>
              )}
            </Stack>
          </div>
        )}

        {data.updateData && (
          <Box mt="sm" p="xs" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 4 }}>
            <Badge
              color={data.updateData.color === COLORS.blog ? 'blue' : 'orange'}
              variant="filled"
              size="sm"
              mb={4}
            >
              {data.updateData.type}
            </Badge>
            <Text size="sm" weight={600} color="white">{data.updateData.title}</Text>
            <Text size="xs" color="dimmed" mt={2}>{data.updateData.description}</Text>
          </Box>
        )}
      </Stack>
    )
  }

  const rangeOptions = [
    { value: '1D', label: '1D' },
    { value: '1W', label: '1W' },
    { value: '1M', label: '1M' },
    { value: '3M', label: '3M' },
    { value: '6M', label: '6M' },
    { value: '1Y', label: '1Y' },
    { value: 'All', label: 'All' }
  ]

  const bgColor = transparentBg ? 'transparent' : '#1A1B1E'
  const infoPanelData = hoverData || (chartData.length > 0 ? chartData[chartData.length - 1] : null)

  return (
    <Card shadow="sm" p={0} style={{ height: isFullscreen ? '100vh' : height, backgroundColor: bgColor, position: 'relative' }}>
      <InteractionHints />
      <Stack spacing={0} h="100%">
        {/* Header / Controls */}
        {showControls && (
          <Group position="apart" p="xs" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <Group spacing="xs">
              <Text size="sm" weight={600} color="white" mr="xs">
                {item?.name || 'Loading...'}
              </Text>
              <PriceChangeIndicator chartData={chartData} />
              {left !== 'dataMin' && (
                <Button
                  leftIcon={<IconZoomOut size={12} />}
                  size="xs"
                  variant="light"
                  color="orange"
                  compact
                  onClick={zoomOut}
                >
                  Reset
                </Button>
              )}
            </Group>

            <Group spacing={4}>
              {rangeOptions.map((opt) => (
                <Button
                  key={opt.value}
                  size="xs"
                  variant={range === opt.value ? 'filled' : 'subtle'}
                  color={range === opt.value ? 'blue' : 'gray'}
                  compact
                  onClick={() => setRange(opt.value)}
                  styles={{ root: { padding: '0 8px', height: 32 } }}
                >
                  {opt.label}
                </Button>
              ))}

              <Divider orientation="vertical" h={20} mx={4} />

              {renderControls()}

              {/* Three.js toggle */}
              <Button
                size="xs"
                variant={isThreeJsChartEnabled() ? 'filled' : 'subtle'}
                color={isThreeJsChartEnabled() ? 'violet' : 'gray'}
                compact
                leftIcon={<IconSparkles size={14} />}
                onClick={toggleThreeJsChart}
              >
                {isThreeJsChartEnabled() ? 'Classic' : 'Futuristic'}
              </Button>

              <Menu shadow="md" width={150} position="bottom-end">
                <Menu.Target>
                  <ActionIcon size="sm" variant="subtle" color="gray">
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

        {/* Persistent Legend */}
        {showControls && (
          <Box px="xs" py={4} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
            <ChartLegend seriesVisibility={seriesVisibility} onToggle={handleLegendToggle} />
          </Box>
        )}

        {/* Charts Area with Side Panel */}
        <Flex style={{ flex: 1, minHeight: 0 }}>
          {/* Charts Column */}
          <Stack spacing={0} style={{ flex: 1, minHeight: 0, minWidth: 0 }}>
            {/* Price Chart (Top) */}
            <div
              style={{ flex: 3, width: '100%', minHeight: 0, padding: '10px 0 0 0', touchAction: 'none' }}
              onWheel={handleWheel}
            >
              {isLoading ? (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Text size="xs" color="dimmed">Loading data...</Text>
                </div>
              ) : fetchError ? (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Text size="xs" color="red">Failed to load chart data</Text>
                  <Text size="xs" color="dimmed">{fetchError.message || 'Unknown error'}</Text>
                  <Button size="xs" variant="light" color="blue" compact onClick={() => refetch()}>
                    Retry
                  </Button>
                </div>
              ) : historyData.length === 0 ? (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Text size="xs" color="dimmed">No data available</Text>
                </div>
              ) : (
                renderMainChart()
              )}
            </div>

            {/* Events Area */}
            {seriesVisibility.updates && (
              <div style={{ height: 40, width: '100%', marginTop: -1, backgroundColor: transparentBg ? 'rgba(26, 27, 30, 0.6)' : 'rgba(26, 27, 30, 0.8)', position: 'relative', zIndex: 10 }}>
                <ComposedChart
                  {...commonChartProps}
                  width={800}
                  height={40}
                  margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
                  data={updatesData.map(u => ({ timestamp: u.timestamp, y: 50, updateData: u.updateData }))}
                >
                  <XAxis
                    dataKey="timestamp"
                    type="number"
                    domain={[left, right]}
                    tick={false}
                    axisLine={false}
                    tickLine={false}
                    allowDataOverflow
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={false}
                    axisLine={false}
                    tickLine={false}
                  />

                  {activeTimestamp && (
                    <ReferenceLine x={activeTimestamp} stroke={COLORS.crosshair} strokeWidth={1} strokeDasharray="2 2" />
                  )}

                  {updatesData.length > 0 && (
                    <Scatter
                      dataKey="y"
                      fill="none"
                      shape={(props) => {
                        const { cx, cy, payload } = props
                        if (!cx || !cy || !payload || !payload.updateData) return null

                        const gracePeriod = 3 * 24 * 60 * 60
                        const timeDiff = activeTimestamp ? Math.abs(activeTimestamp - payload.timestamp) : Infinity
                        const isHovered = activeTimestamp && timeDiff <= gracePeriod
                        const dotColor = payload.updateData.type === 'blog' ? '#3b82f6' : '#f59e0b'

                        return (
                          <g>
                            <circle cx={cx} cy={cy} r={isHovered ? 12 : 8} fill={dotColor} opacity={isHovered ? 0.5 : 0.3} />
                            <circle cx={cx} cy={cy} r={isHovered ? 7 : 5} fill={dotColor} opacity={isHovered ? 0.8 : 0.6} />
                            <circle cx={cx} cy={cy} r={isHovered ? 4 : 3} fill={dotColor} stroke="white" strokeWidth={isHovered ? 2 : 1} style={{ cursor: 'pointer' }} opacity={1} />
                          </g>
                        )
                      }}
                      onMouseEnter={(e) => {
                        if (e.payload && e.payload.updateData) {
                          const targetTimestamp = activeTimestamp || e.payload.timestamp
                          let closestPriceData = null
                          let minDiff = Infinity

                          chartData.forEach(dataPoint => {
                            const diff = Math.abs(dataPoint.timestamp - targetTimestamp)
                            if (diff < minDiff) {
                              minDiff = diff
                              closestPriceData = dataPoint
                            }
                          })

                          setHoverData({
                            ...closestPriceData,
                            updateData: e.payload.updateData,
                            eventTimestamp: e.payload.timestamp,
                            isEventHover: true
                          })
                          setActiveTimestamp(targetTimestamp)
                        }
                      }}
                      isAnimationActive={false}
                    />
                  )}
                </ComposedChart>
              </div>
            )}

            {/* Volume Chart (Butterfly) */}
            <div style={{ flex: 1, width: '100%', minHeight: 0, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              {isLoading ? null : renderVolumeChart()}
            </div>
          </Stack>

          {/* Side Info Panel — desktop only */}
          {!isMobile && (
            <Box w={200} style={{ flexShrink: 0, backgroundColor: 'rgba(0,0,0,0.2)' }}>
              <InfoPanel data={infoPanelData} />
            </Box>
          )}
        </Flex>

        {/* Mobile Info Drawer */}
        {isMobile && (
          <MobileInfoDrawer
            data={infoPanelData}
            seriesVisibility={seriesVisibility}
            COLORS={COLORS}
          />
        )}
      </Stack>

      <Modal
        opened={annotationModalOpen}
        onClose={() => setAnnotationModalOpen(false)}
        title="Add Annotation"
        size="sm"
        zIndex={200}
      >
        <Stack spacing="sm">
          <TextInput
            label="Title"
            placeholder="Annotation title"
            value={selectedAnnotation?.title ?? ''}
            onChange={(e) => setSelectedAnnotation({ ...selectedAnnotation, title: e.target.value })}
          />
          <Textarea
            label="Description"
            placeholder="Details..."
            value={selectedAnnotation?.description ?? ''}
            onChange={(e) => setSelectedAnnotation({ ...selectedAnnotation, description: e.target.value })}
          />
          <ColorPicker
            value={selectedAnnotation?.color ?? '#339af0'}
            onChange={(color) => setSelectedAnnotation({ ...selectedAnnotation, color })}
          />
          <Group position="right">
            <Button variant="default" onClick={() => setAnnotationModalOpen(false)}>Cancel</Button>
            <Button onClick={() => setAnnotationModalOpen(false)}>Save</Button>
          </Group>
        </Stack>
      </Modal>
    </Card>
  )
}

export default AdvancedChart
