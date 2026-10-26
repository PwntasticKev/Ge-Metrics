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
  BarChart,
  Bar,
  ComposedChart,
  Area,
  AreaChart,
  ReferenceArea,
  ReferenceDot
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
  TextInput,
  ColorPicker,
  Switch,
  Stack,
  Divider,
  Tooltip as MantineTooltip,
  Modal,
  Textarea,
  Box,
  Flex,
  Checkbox,
  Popover
} from '@mantine/core'
import {
  IconSettings,
  IconTag,
  IconDownload,
  IconMaximize,
  IconRefresh,
  IconZoomIn,
  IconZoomOut,
  IconFilter
} from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { getItemHistoryById } from '../../api/rs-wiki-api.jsx'
import { getItemById } from '../../utils/utils.jsx'
import { calculateSMA, calculateEMA } from '../../utils/indicators.js'
import { useGameEvents } from '../../hooks/useGameEvents.js'
import {
  CHART_RANGES,
  DEFAULT_MARKER_FILTER,
  MARKER_GROUPS,
  rangeConfig,
  rangeCutoff,
  normalizeTimeseries,
  sliceWindow,
  rangeStats,
  toMarkers,
  filterMarkers,
  mentionsLast,
  markersNear,
  formatCompact
} from '../../domain/priceChart/index.js'
import EventsStrip from './detail/EventsStrip.jsx'
import AdvancedChartInfoPanel from './detail/AdvancedChartInfoPanel.jsx'
import MarkerFilterChips from './detail/MarkerFilterChips.jsx'
import MarkerPopover from './detail/MarkerPopover.jsx'
import RangeStatsBar from './detail/RangeStatsBar.jsx'

const ALL_GROUPS = MARKER_GROUPS.map(group => group.key)
const HALF_DAY = 12 * 60 * 60

// Color Constants
const COLORS = {
  sell: '#f59e0b', // Orange (High Price / Sell Volume)
  buy: '#3b82f6',  // Blue (Low Price / Buy Volume)
  sma: '#22d3ee',  // Cyan
  ema: '#a78bfa',  // Purple
  grid: 'rgba(55, 65, 81, 0.1)', 
  crosshair: '#6B7280',
  text: '#C1C2C5',
  blog: '#3b82f6', // Blue for blogs
  update: '#f59e0b' // Orange for updates
}

const AdvancedChart = ({ itemId, items, item: itemProp, height = 600, showControls = true }) => {
  const [range, setRange] = useState('1W') // View Range - Default to 1 week
  const timeframe = rangeConfig(range).timestep // wiki /timeseries timestep
  const [markerFilter, setMarkerFilter] = useState(DEFAULT_MARKER_FILTER)
  const [selectedMarkers, setSelectedMarkers] = useState(null) // { markers, x } | null
  const stripRef = useRef(null)
  
  // Visibility State
  const [seriesVisibility, setSeriesVisibility] = useState({
    highPrice: true,
    lowPrice: true,
    buyVolume: true,
    sellVolume: true,
    sma20: false,
    ema20: false,
    updates: true
  })

  // Zoom State
  const [left, setLeft] = useState('dataMin')
  const [right, setRight] = useState('dataMax')
  const [refAreaLeft, setRefAreaLeft] = useState('')
  const [refAreaRight, setRefAreaRight] = useState('')
  const [top, setTop] = useState('auto')
  const [bottom, setBottom] = useState('auto')
  
  // Hover State for Info Panel
  const [hoverData, setHoverData] = useState(null)
  // Synchronized crosshair state
  const [activeTimestamp, setActiveTimestamp] = useState(null)

  const [annotations, setAnnotations] = useState([])
  const [selectedAnnotation, setSelectedAnnotation] = useState(null)
  const [annotationModalOpen, setAnnotationModalOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Resolve item
  const item = useMemo(() => {
    if (itemProp) return itemProp;
    if (itemId && items) return getItemById(Number(itemId), items);
    return { name: 'Unknown Item', id: itemId };
  }, [itemId, items, itemProp]);

  // Fetch History Data
  const { data: historyData, isLoading } = useQuery({
    queryKey: ['advancedChart', itemId, timeframe],
    queryFn: async () => {
      if (!itemId) return []
      const result = await getItemHistoryById(timeframe, itemId)
      return result?.data?.data || []
    },
    enabled: !!itemId,
    refetchInterval: 30000
  })

  // Fetch Game Updates (Blogs/Updates) - Use wider range for events
  const startDate = useMemo(() => {
    if (!historyData?.length) return new Date('2024-01-01')
    
    // Use a wider range for events - go back 6 months from earliest chart data
    const chartStartTime = Math.min(...historyData.map(d => d.timestamp * 1000))
    const chartStart = new Date(chartStartTime)
    const eventStart = new Date(chartStart)
    eventStart.setMonth(chartStart.getMonth() - 6)
    
    return eventStart
  }, [historyData])

  const endDate = useMemo(() => {
    if (!historyData?.length) return new Date('2025-12-31')
    
    // Use a wider range for events - go forward 1 month from latest chart data
    const chartEndTime = Math.max(...historyData.map(d => d.timestamp * 1000))
    const chartEnd = new Date(chartEndTime)
    const eventEnd = new Date(chartEnd)
    eventEnd.setMonth(chartEnd.getMonth() + 1)
    
    return eventEnd
  }, [historyData])

  const { blogs, updates } = useGameEvents({
    startDate,
    endDate,
    enabled: !!historyData && historyData.length > 0 && seriesVisibility.updates
  })

  const chartedItemId = Number(itemId ?? item?.id)

  const markers = useMemo(
    () => toMarkers({ blogs, updates }, chartedItemId),
    [blogs, updates, chartedItemId]
  )

  // Helper for date formatting
  const formatDateForTimeframe = (date, rng) => {
    switch (rng) {
      case '1D': return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      case '1W': return date.toLocaleDateString('en-US', { weekday: 'short', hour: '2-digit' })
      case '1M': case '3M': return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      default: return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    }
  }

  // New range: reset zoom and close any open marker
  useEffect(() => {
    zoomOut()
    setSelectedMarkers(null)
  }, [range])

  // Process data for chart
  const chartData = useMemo(() => {
    if (!historyData || historyData.length === 0) return []

    const cutoff = rangeCutoff(range) * 1000

    // Filter and basic mapping
    let processed = historyData
      .filter(d => {
        const ts = d.timestamp * 1000;
        return ts >= cutoff && (d.avgHighPrice !== null || d.avgLowPrice !== null);
      })
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(d => {
        const date = new Date(d.timestamp * 1000)
        const high = d.avgHighPrice || d.avgLowPrice || 0
        const low = d.avgLowPrice || d.avgHighPrice || 0

        return {
          timestamp: d.timestamp,
          time: d.timestamp, // for indicators
          value: high,       // for indicators (using high price)
          date: date.toISOString(),
          dateObj: date,
          dateFormatted: formatDateForTimeframe(date, range),
          high,
          low,
          sell: d.avgHighPrice ?? null, // raw sides (not back-filled) for the margin
          buy: d.avgLowPrice ?? null,
          buyVolume: d.lowPriceVolume || 0,
          sellVolume: d.highPriceVolume || 0
        }
      })

    // Calculate Indicators (Optimized O(N))
    if (processed.length > 0) {
        const sma20 = calculateSMA(processed, 20)
        const ema20 = calculateEMA(processed, 20)

        // Use Maps for O(1) lookup
        const smaMap = new Map(sma20.map(s => [s.time, s.value]))
        const emaMap = new Map(ema20.map(e => [e.time, e.value]))

        // Merge indicators back
        processed = processed.map(p => ({
            ...p,
            sma20: smaMap.get(p.time) ?? null,
            ema20: emaMap.get(p.time) ?? null
        }))
    }

    return processed
  }, [historyData, range, timeframe])

  // Visible window (seconds) for stats and markers
  const leftBound = left === 'dataMin' ? chartData[0]?.timestamp : left
  const rightBound = right === 'dataMax' ? chartData[chartData.length - 1]?.timestamp : right
  const isZoomed = left !== 'dataMin' || right !== 'dataMax'

  // Raw per-side series for the range (no side back-filled), for stats and post impact
  const seriesPoints = useMemo(
    () => sliceWindow(normalizeTimeseries(historyData), rangeCutoff(range)),
    [historyData, range]
  )
  const stats = useMemo(
    () => rangeStats(sliceWindow(seriesPoints, leftBound, rightBound)),
    [seriesPoints, leftBound, rightBound]
  )

  const markerCounts = useMemo(() => {
    const inView = filterMarkers(markers, ALL_GROUPS, leftBound, rightBound)
    return Object.fromEntries(ALL_GROUPS.map(key => [key, inView.filter(m => m.group === key).length]))
  }, [markers, leftBound, rightBound])

  // Events strip data: only the enabled categories inside the visible window;
  // posts that mention this item are drawn last so they sit on top.
  const updatesData = useMemo(() => {
    if (!chartData.length) return []
    return mentionsLast(filterMarkers(markers, markerFilter, leftBound, rightBound))
      .map(marker => ({ timestamp: marker.time, y: 50, updateData: marker }))
  }, [markers, markerFilter, chartData, leftBound, rightBound])

  // Hover/highlight distance for markers: ~1/80 of the visible span, min 1h
  const markerGrace = Math.max(((rightBound ?? 0) - (leftBound ?? 0)) / 80, 3600)

  const eventsDomain = useMemo(() => [
    left === 'dataMin' ? (chartData[0]?.timestamp ?? 'dataMin') : left,
    right === 'dataMax' ? (chartData[chartData.length - 1]?.timestamp ?? 'dataMax') : right
  ], [left, right, chartData])

  // Update hover data
  useEffect(() => {
    if (chartData.length > 0 && !hoverData) {
      setHoverData(chartData[chartData.length - 1])
    }
  }, [chartData])

  // Zoom Logic
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
        // Calculate new Y domain based on visible lines
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

  // Wheel Zoom/Pan Handler
  const handleWheel = (e) => {
    // Note: e.preventDefault() for wheel is often blocked by passive listeners.
    // We rely on container style touch-action: none if possible.
    
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
        // Zoom
        // e.preventDefault() // Try to prevent page zoom
        const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9
        const newRange = rangeVal * zoomFactor
        
        // Center zoom
        const center = (currentLeft + currentRight) / 2
        let newLeft = center - newRange / 2
        let newRight = center + newRange / 2
        
        // Clamp
        if (newLeft < minTime) newLeft = minTime
        if (newRight > maxTime) newRight = maxTime
        
        // Recalculate Y domain for new window
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
        // Pan
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
        
        // Optionally recalculate Y for pan
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
        
        // Check if there's a nearby event within grace period
        const gracePeriod = markerGrace
        let nearbyEvent = null
        let closestEventDiff = Infinity
        
        // Prefer events that mention this item, then the closest one
        let nearbyMentionsItem = false
        updatesData.forEach(event => {
          const timeDiff = Math.abs(currentTimestamp - event.timestamp)
          if (timeDiff > gracePeriod) return
          const mentions = !!event.updateData.mentionsItem
          const better = mentions !== nearbyMentionsItem ? mentions : timeDiff < closestEventDiff
          if (better) {
            closestEventDiff = timeDiff
            nearbyEvent = event
            nearbyMentionsItem = mentions
          }
        })
        
        // If there's a nearby event, show it in hover data
        if (nearbyEvent) {
          const combinedData = {
            ...payload,
            updateData: nearbyEvent.updateData,
            eventTimestamp: nearbyEvent.timestamp,
            isEventHover: true
          }
          setHoverData(combinedData)
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
                        label={<Text size="sm">News markers</Text>}
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
              <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.sell} stopOpacity={0.1} />
                <stop offset="95%" stopColor={COLORS.sell} stopOpacity={0} />
              </linearGradient>
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
              tick={{ fontSize: 10, fill: COLORS.crosshair }}
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

            {/* High Price (Sell) */}
            {seriesVisibility.highPrice && (
            <Line
              type="monotone"
              dataKey="high"
                    stroke={COLORS.sell}
              strokeWidth={2}
              dot={false}
                    activeDot={{ r: 4, stroke: COLORS.sell, fill: '#1A1B1E' }}
                    isAnimationActive={false}
                    connectNulls
            />
            )}

            {/* Low Price (Buy) */}
            {seriesVisibility.lowPrice && (
            <Line
              type="monotone"
              dataKey="low"
                    stroke={COLORS.buy}
              strokeWidth={2}
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

            

            {/* Visible-range extremes */}
            {stats && seriesVisibility.highPrice && (
              <ReferenceDot
                x={stats.max.timestamp}
                y={stats.max.price}
                r={3}
                fill={COLORS.sell}
                stroke="#1A1B1E"
                ifOverflow="discard"
                label={{ value: `High ${formatCompact(stats.max.price)}`, position: 'top', fill: COLORS.sell, fontSize: 10 }}
              />
            )}
            {stats && seriesVisibility.lowPrice && (
              <ReferenceDot
                x={stats.min.timestamp}
                y={stats.min.price}
                r={3}
                fill={COLORS.buy}
                stroke="#1A1B1E"
                ifOverflow="discard"
                label={{ value: `Low ${formatCompact(stats.min.price)}`, position: 'bottom', fill: COLORS.buy, fontSize: 10 }}
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
            tick={{ fontSize: 10, fill: COLORS.crosshair }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(unix) => formatDateForTimeframe(new Date(unix * 1000), range)}
            allowDataOverflow
            minTickGap={30}
            />
            <YAxis
            orientation="right" 
            tick={{ fontSize: 10, fill: COLORS.crosshair }}
            tickFormatter={(value) => new Intl.NumberFormat('en', { notation: 'compact' }).format(value)}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<></>} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
          
          {/* Synchronized crosshair */}
          {activeTimestamp && (
            <ReferenceLine x={activeTimestamp} stroke={COLORS.crosshair} strokeWidth={1} strokeDasharray="2 2" />
          )}
          
          {seriesVisibility.sellVolume && (
            <Bar dataKey="sellVolume" fill={COLORS.sell} stackId="a" opacity={0.8} />
          )}
          {seriesVisibility.buyVolume && (
            <Bar dataKey="buyVolume" fill={COLORS.buy} stackId="a" opacity={0.8} />
          )}
        </BarChart>
      </ResponsiveContainer>
    )
  }


  const rangeOptions = Object.entries(CHART_RANGES).map(([value, { label }]) => ({ value, label }))

  const handleMarkerHover = (marker, timestamp) => {
    const nearest = chartData.reduce((best, point) => (
      !best || Math.abs(point.timestamp - timestamp) < Math.abs(best.timestamp - timestamp) ? point : best
    ), null)
    setHoverData({ ...nearest, updateData: marker, eventTimestamp: timestamp, isEventHover: true })
    setActiveTimestamp(timestamp)
  }

  const handleMarkerSelect = (marker, x) => {
    const sameDay = markersNear(updatesData.map(u => u.updateData), marker.time, HALF_DAY)
    const ordered = [marker, ...sameDay.filter(m => m.id !== marker.id)]
      .sort((a, b) => (a.id === marker.id ? -1 : b.id === marker.id ? 1 : Number(b.mentionsItem) - Number(a.mentionsItem)))
    setSelectedMarkers({ markers: ordered, x })
  }

  return (
    <Card shadow="sm" p={0} style={{ height: isFullscreen ? '100vh' : height, backgroundColor: '#1A1B1E' }}>
      <Stack spacing={0} h="100%">
        {/* Header / Controls */}
      {showControls && (
            <Group position="apart" p="xs" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <Group spacing="xs">
                <Text size="sm" weight={600} color="white" mr="xs">
                {item?.name || 'Loading...'}
                </Text>
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
                    styles={{ root: { padding: '0 8px', height: 24 } }}
                >
                    {opt.label}
                </Button>
                ))}
                
                <Divider orientation="vertical" h={20} mx={4} />
                
                {renderControls()}

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

        {/* Marker filters + visible-range stats */}
        <Group position="apart" px="xs" py={6} spacing="xs" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          {seriesVisibility.updates ? (
            <MarkerFilterChips value={markerFilter} onChange={setMarkerFilter} counts={markerCounts} dark />
          ) : <span />}
          <RangeStatsBar stats={stats} zoomed={isZoomed} onReset={zoomOut} dark />
        </Group>

        {/* Charts Area with Side Panel */}
        <Flex style={{ flex: 1, minHeight: 0 }}>
            {/* Charts Column */}
            <Stack spacing={0} style={{ flex: 1, minHeight: 0, minWidth: 0, userSelect: 'none' }}>
                {/* Price Chart (Top) */}
                <div 
                    data-testid="advanced-price-chart"
                    style={{ flex: 3, width: '100%', minHeight: 0, padding: '10px 0 0 0', touchAction: 'none' }}
                    onWheel={handleWheel}
                >
                    {isLoading ? (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Text size="xs" color="dimmed">Loading data...</Text>
        </div>
                    ) : !historyData?.length ? (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Text size="xs" color="dimmed">No data available</Text>
          </div>
                    ) : (
                        renderMainChart()
              )}
      </div>

                {/* News markers strip (click a dot for details) */}
                {seriesVisibility.updates && (
                  <div ref={stripRef} style={{ height: 40, width: '100%', marginTop: -1, backgroundColor: 'rgba(26, 27, 30, 0.8)', position: 'relative', zIndex: 10 }}>
                    <EventsStrip
                      data={updatesData}
                      domain={eventsDomain}
                      activeTimestamp={activeTimestamp}
                      grace={markerGrace}
                      selectedId={selectedMarkers?.markers[0]?.id}
                      onSelect={handleMarkerSelect}
                      onHover={handleMarkerHover}
                    />
                    {selectedMarkers && (
                      <MarkerPopover
                        markers={selectedMarkers.markers}
                        x={selectedMarkers.x}
                        bottom={44}
                        containerWidth={stripRef.current?.clientWidth}
                        itemName={item?.name}
                        points={seriesPoints}
                        onClose={() => setSelectedMarkers(null)}
                      />
                    )}
                  </div>
                )}

                {/* Volume Chart */}
                <div style={{ flex: 1, width: '100%', minHeight: 0, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    {isLoading ? null : renderVolumeChart()}
                </div>
            </Stack>

            {/* Side Info Panel (Fixed Width) */}
            <Box w={200} style={{ flexShrink: 0, backgroundColor: 'rgba(0,0,0,0.2)' }}>
                <AdvancedChartInfoPanel
                    data={hoverData || (chartData.length > 0 ? chartData[chartData.length - 1] : null)}
                    seriesVisibility={seriesVisibility}
                    itemName={item?.name}
                    itemId={chartedItemId}
                />
            </Box>
        </Flex>
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