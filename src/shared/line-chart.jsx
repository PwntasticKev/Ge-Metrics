import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react'
// @ts-ignore - lightweight-charts uses CommonJS
import { createChart, ColorType } from 'lightweight-charts'
import { getItemHistoryById } from '../api/rs-wiki-api.jsx'
import { getItemById, getRelativeTime } from '../utils/utils.jsx'
import { transformToLine } from '../utils/chartDataTransform.js'
import { calculateSMA, calculateEMA } from '../utils/indicators.js'
import { Badge, Group, Text, Loader, Center, Button, Checkbox, Stack, ActionIcon, Tooltip, Box } from '@mantine/core'
import { IconRefresh, IconDownload, IconInfoCircle } from '@tabler/icons-react'
import { useGameEvents } from '../hooks/useGameEvents.js'
import {
  DEFAULT_MARKER_FILTER,
  MARKER_GROUPS,
  rangeConfig,
  rangeCutoff,
  normalizeTimeseries,
  sliceWindow,
  readout,
  rangeStats,
  stackedVolumeBars,
  toMarkers,
  filterMarkers,
  groupMarkersByTime,
  formatCompact
} from '../domain/priceChart/index.js'
import PriceReadout from '../components/charts/detail/PriceReadout.jsx'
import MarkerFilterChips from '../components/charts/detail/MarkerFilterChips.jsx'
import MarkerPopover from '../components/charts/detail/MarkerPopover.jsx'
import RangeStatsBar from '../components/charts/detail/RangeStatsBar.jsx'
import NewsHoverCard from '../components/charts/detail/NewsHoverCard.jsx'
import EventDotsOverlay from '../components/charts/detail/EventDotsOverlay.jsx'
import useBrushZoom from '../components/charts/detail/useBrushZoom.js'
import { CHART_COLORS } from '../components/charts/detail/chartTheme.js'

// Timeframe buttons -> shared chart ranges (timestep + cutoff)
const TIMEFRAME_RANGE = { day: '1D', week: '1W', month: '1M', quarter: '3M', year: '1Y', alltime: 'All' }
const ALL_GROUPS = MARKER_GROUPS.map(group => group.key)
const MAX_EVENT_DOTS = 60
const READOUT_WIDTH = 230

export default function LineChart ({ id, items, height = 600 }) {
  // Default chart to month
  const [timeframe, setTimeframe] = useState('month')
  const [historyData, setHistoryData] = useState([])
  const [historyStatus, setHistoryStatus] = useState('idle') // 'idle' | 'loading' | 'success' | 'error'
  const [lastUpdateTime, setLastUpdateTime] = useState(null)
  const [hoveredEvents, setHoveredEvents] = useState(null) // { x, y, items: Array<{ title, kind, date }> } | null
  const [hoveredPrices, setHoveredPrices] = useState(null) // { x, y, time } | null
  const [visibleWindow, setVisibleWindow] = useState(null) // { from, to } unix seconds
  const [markerFilter, setMarkerFilter] = useState(DEFAULT_MARKER_FILTER)
  const [selectedEvent, setSelectedEvent] = useState(null) // { time, markers, x, y } | null
  
  const chartContainerRef = useRef(null)
  const chartRef = useRef(null)
  const highPriceSeriesRef = useRef(null)
  const lowPriceSeriesRef = useRef(null)
  const smaSeriesRef = useRef(null)
  const emaSeriesRef = useRef(null)
  const buyVolumeSeriesRef = useRef(null)
  const sellVolumeSeriesRef = useRef(null)
  const eventsByTimeRef = useRef(new Map()) // Map<time, markers[]>
  const pointByTimeRef = useRef(new Map()) // Map<time, normalized point>
  const { brush, handlers: brushHandlers } = useBrushZoom(chartRef)

  const [seriesVisibility, setSeriesVisibility] = useState({
    highPrice: true,
    lowPrice: true,
    // Default volumes ON
    buyVolume: true,
    sellVolume: true,
    sma20: false,
    ema20: false
  })

  const [indicators, setIndicators] = useState({
    sma: { enabled: false, period: 20 },
    ema: { enabled: false, period: 20 }
  })

  const currentItem = useMemo(() => getItemById(id, items) || {}, [id, items])

  const getApiTimestep = (tf) => rangeConfig(TIMEFRAME_RANGE[tf]).timestep
  const getCutoffTimestamp = (tf) => rangeCutoff(TIMEFRAME_RANGE[tf])

  // Fetch data from API
  const fetchData = async () => {
    if (!id) {
      console.warn('LineChart: No item ID provided')
      return
    }

    setHistoryStatus('loading')

    try {
      const apiTimestep = getApiTimestep(timeframe)
      console.log(`LineChart: Fetching data for ID: ${id}, timeframe: ${timeframe}, apiTimestep: ${apiTimestep}`)
      
      // Fetch WITHOUT start parameter - API doesn't support it reliably
      const result = await getItemHistoryById(apiTimestep, id)

      if (!result || !result.success) {
        throw new Error(result?.error?.message || 'Failed to fetch data')
      }

      // Handle different response structures
      let dataArray = null
      
      if (Array.isArray(result.data)) {
        dataArray = result.data
      } else if (result.data?.data && Array.isArray(result.data.data)) {
        dataArray = result.data.data
      } else if (result.data?.timeseries && Array.isArray(result.data.timeseries)) {
        dataArray = result.data.timeseries
      }

      if (!dataArray || dataArray.length === 0) {
        console.warn('LineChart: No data received from API', result)
        setHistoryData([])
        setHistoryStatus('error')
        return
      }

      // Validate data structure
      const validData = dataArray.filter(point => {
        if (!point || typeof point !== 'object') return false
        if (typeof point.timestamp !== 'number') return false
        if (point.avgHighPrice === null && point.avgLowPrice === null) return false
        return true
      })

      if (validData.length === 0) {
        console.warn('LineChart: No valid data points after filtering')
        setHistoryData([])
        setHistoryStatus('error')
        return
      }

      // Sort by timestamp
      validData.sort((a, b) => a.timestamp - b.timestamp)

      // Filter data based on timeframe cutoff
      const cutoffTimestamp = getCutoffTimestamp(timeframe)
      const filteredData = cutoffTimestamp > 0 
        ? validData.filter(point => point.timestamp >= cutoffTimestamp)
        : validData

      console.log(`LineChart: Fetched ${validData.length} data points, filtered to ${filteredData.length} for timeframe ${timeframe}`)
      setHistoryData(filteredData)
      setHistoryStatus('success')
      setLastUpdateTime(new Date())
    } catch (error) {
      console.error('LineChart: Error fetching data:', error)
      setHistoryData([])
      setHistoryStatus('error')
    }
  }

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return

    console.log('LineChart: Initializing chart')

    try {
      const getContainerWidth = () => {
        const width = chartContainerRef.current?.clientWidth ?? 0
        // In modals during transitions the width can briefly be 0; provide a safe fallback.
        return width > 0 ? width : 800
      }

      const chart = createChart(chartContainerRef.current, {
        width: getContainerWidth(),
        height,
        layout: {
          background: { type: ColorType.Solid, color: '#1A1B1E' },
          textColor: '#C1C2C5',
          fontFamily: 'Inter, system-ui, sans-serif',
          // Remove TradingView attribution logo overlay
          attributionLogo: false
        },
        grid: {
          vertLines: { color: '#373A40' },
          horzLines: { color: '#373A40' }
        },
        crosshair: {
          mode: 1,              // Normal crosshair mode
          vertLine: {
            color: '#758694',
            width: 1,
            style: 0,           // Solid line
            visible: true,
          },
          horzLine: {
            color: '#758694',
            width: 1,
            style: 0,           // Solid line
            visible: true,
          },
        },
        rightPriceScale: {
          borderColor: '#373A40',
          visible: true,
          entireTextOnly: false,
        },
        // Dragging draws a zoom selection (useBrushZoom); the wheel still pans/zooms.
        handleScroll: { mouseWheel: true, pressedMouseMove: false, horzTouchDrag: true, vertTouchDrag: false },
        handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true },
        timeScale: {
          borderColor: '#373A40',
          timeVisible: true,
          secondsVisible: false,
          rightOffset: 10,        // Add some padding on the right
          barSpacing: 8,          // Better spacing between bars
        },
        localization: {
          priceFormatter: (price) => price.toLocaleString('en-US')
        }
      })

      chartRef.current = chart

        // Hover tooltip for both prices and game events
      chart.subscribeCrosshairMove((param) => {
        if (!param || !param.time || !param.point) {
          setHoveredEvents(null)
          setHoveredPrices(null)
          return
        }

        // Lightweight Charts time for our series is a unix timestamp (seconds)
        const t = typeof param.time === 'number' ? param.time : null
        if (!t) {
          setHoveredEvents(null)
          setHoveredPrices(null)
          return
        }

        // Price readout (values come from the point map, incl. volume)
        if (pointByTimeRef.current.has(t)) {
          setHoveredPrices({ x: param.point.x, y: param.point.y, time: t })
        } else {
          setHoveredPrices(null)
        }

        // Handle game events tooltip
        const items = eventsByTimeRef.current.get(t)
        if (items && items.length > 0) {
          setHoveredEvents({
            x: param.point.x,
            y: param.point.y,
            items
          })
        } else {
          setHoveredEvents(null)
        }
      })

      // Create series with app color scheme
      highPriceSeriesRef.current = chart.addLineSeries({
        color: '#f59e0b',         // App's warning/orange color for sell price
        lineWidth: 2,
        title: 'Sell Price',
        priceFormat: { type: 'price', precision: 0, minMove: 1 },
        crosshairMarkerVisible: false // Disable built-in crosshair price marker
      })

      lowPriceSeriesRef.current = chart.addLineSeries({
        color: '#3b82f6',         // App's info/blue color for buy price
        lineWidth: 2,
        lineStyle: 0,             // Solid line instead of dashed
        title: 'Buy Price',
        priceFormat: { type: 'price', precision: 0, minMove: 1 },
        crosshairMarkerVisible: false // Disable built-in crosshair price marker
      })

      smaSeriesRef.current = chart.addLineSeries({
        color: '#60a5fa',
        lineWidth: 2,
        lineStyle: 1,
        title: 'SMA(20)',
        priceFormat: { type: 'price', precision: 0, minMove: 1 }
      })

      emaSeriesRef.current = chart.addLineSeries({
        color: '#a78bfa',
        lineWidth: 2,
        title: 'EMA(20)',
        priceFormat: { type: 'price', precision: 0, minMove: 1 }
      })

      // Per-side volume, drawn as a stack: sell bar = buy + sell, buy in front
      sellVolumeSeriesRef.current = chart.addHistogramSeries({
        color: 'rgba(245, 158, 11, 0.55)',
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
        lastValueVisible: false,
        priceLineVisible: false,
        title: 'Sell Volume'
      })

      buyVolumeSeriesRef.current = chart.addHistogramSeries({
        color: 'rgba(59, 130, 246, 0.7)',
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
        lastValueVisible: false,
        priceLineVisible: false,
        title: 'Buy Volume'
      })

      // Visible range -> stats bar + overlay dot positions
      chart.timeScale().subscribeVisibleTimeRangeChange((range) => {
        setVisibleWindow(range ? { from: range.from, to: range.to } : null)
      })

      chart.priceScale('volume').applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 }
      })

      // Handle resize
      const handleResize = () => {
        if (chartContainerRef.current && chartRef.current) {
          chartRef.current.applyOptions({
            width: getContainerWidth()
          })
        }
      }

      window.addEventListener('resize', handleResize)

      // Use ResizeObserver for modal support
      const resizeObserver = new ResizeObserver(handleResize)
      if (chartContainerRef.current) {
        resizeObserver.observe(chartContainerRef.current)
      }

      // Kick a resize shortly after mount to handle modal transitions / initial 0-width layout.
      const postMountResizeTimer = setTimeout(handleResize, 150)

      console.log('LineChart: Chart initialized successfully')

      return () => {
        console.log('LineChart: Cleaning up chart')
        clearTimeout(postMountResizeTimer)
        window.removeEventListener('resize', handleResize)
        if (resizeObserver && chartContainerRef.current) {
          resizeObserver.unobserve(chartContainerRef.current)
        }
        if (chartRef.current) {
          try {
            chartRef.current.remove()
          } catch (error) {
            console.error('LineChart: Error removing chart:', error)
          }
          chartRef.current = null
        }
      }
    } catch (error) {
      console.error('LineChart: Error initializing chart:', error)
      setHistoryStatus('error')
    }
  }, [])

  // Fetch blogs for annotations (load in parallel with chart data)
  const eventRange = useMemo(() => {
    if (historyData.length === 0) {
      // Default to 30 days for better coverage
      return { startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), endDate: new Date() }
    }
    const times = historyData.map(d => d.timestamp * 1000)
    return { startDate: new Date(Math.min(...times)), endDate: new Date(Math.max(...times)) }
  }, [historyData])

  const { blogs, updates } = useGameEvents({
    ...eventRange,
    enabled: !!id && (historyStatus === 'loading' || historyStatus === 'success'), // Enable during loading for parallel fetch
    queryOptions: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: true, // Enable mount fetching for immediate loading
      retry: 1 // Allow one retry for better reliability
    }
  })

  const markers = useMemo(() => toMarkers({ blogs, updates }, id), [blogs, updates, id])

  // Normalized per-side series (no back-filled sides) for readout/stats/impact
  const points = useMemo(() => normalizeTimeseries(historyData), [historyData])
  const pointByTime = useMemo(() => new Map(points.map(p => [p.timestamp, p])), [points])
  useEffect(() => { pointByTimeRef.current = pointByTime }, [pointByTime])

  const windowFrom = visibleWindow?.from ?? points[0]?.timestamp
  const windowTo = visibleWindow?.to ?? points[points.length - 1]?.timestamp
  const stats = useMemo(() => rangeStats(sliceWindow(points, windowFrom, windowTo)), [points, windowFrom, windowTo])
  const isZoomed = points.length > 1 && visibleWindow != null &&
    (visibleWindow.from > points[0].timestamp || visibleWindow.to < points[points.length - 1].timestamp)

  const markerCounts = useMemo(() => {
    const inView = filterMarkers(markers, ALL_GROUPS, windowFrom, windowTo)
    return Object.fromEntries(ALL_GROUPS.map(key => [key, inView.filter(m => m.group === key).length]))
  }, [markers, windowFrom, windowTo])

  // Enabled markers snapped onto bars, with the line values to sit on
  const eventGroups = useMemo(() => {
    const times = points.map(p => p.timestamp)
    const lineValue = value => (Number.isFinite(value) ? Math.round(value) : null)
    return groupMarkersByTime(filterMarkers(markers, markerFilter), times, MAX_EVENT_DOTS).map(group => {
      const point = pointByTime.get(group.time)
      return {
        ...group,
        high: seriesVisibility.highPrice ? lineValue(point?.sell ?? point?.buy) : null,
        low: seriesVisibility.lowPrice ? lineValue(point?.buy ?? point?.sell) : null
      }
    })
  }, [markers, markerFilter, points, pointByTime, seriesVisibility.highPrice, seriesVisibility.lowPrice])

  useEffect(() => {
    eventsByTimeRef.current = new Map(eventGroups.map(group => [group.time, group.markers]))
  }, [eventGroups])

  // Update chart data when historyData changes
  useEffect(() => {
    if (!chartRef.current || !historyData || historyData.length === 0) {
      // Clear all series if no data
      if (highPriceSeriesRef.current) highPriceSeriesRef.current.setData([])
      if (lowPriceSeriesRef.current) lowPriceSeriesRef.current.setData([])
      if (smaSeriesRef.current) smaSeriesRef.current.setData([])
      if (emaSeriesRef.current) emaSeriesRef.current.setData([])
      if (buyVolumeSeriesRef.current) buyVolumeSeriesRef.current.setData([])
      if (sellVolumeSeriesRef.current) sellVolumeSeriesRef.current.setData([])
      return
    }

    try {
      // Transform data
      const highPriceData = transformToLine(historyData, 'high')
      const lowPriceData = transformToLine(historyData, 'low')

      if (!Array.isArray(highPriceData) || !Array.isArray(lowPriceData)) {
        console.error('LineChart: Invalid data format from transformToLine')
        return
      }

      if (highPriceData.length === 0 || lowPriceData.length === 0) {
        console.warn('LineChart: No data after transformation')
        return
      }

      console.log(`LineChart: Updating chart with ${highPriceData.length} data points`)

      // Update price series
      if (highPriceSeriesRef.current && seriesVisibility.highPrice) {
        highPriceSeriesRef.current.setData(highPriceData)
      }
      if (lowPriceSeriesRef.current && seriesVisibility.lowPrice) {
        lowPriceSeriesRef.current.setData(lowPriceData)
      }
      if (highPriceSeriesRef.current && !seriesVisibility.highPrice) {
        highPriceSeriesRef.current.setData([])
      }
      if (lowPriceSeriesRef.current && !seriesVisibility.lowPrice) {
        lowPriceSeriesRef.current.setData([])
      }

      // Update indicators if enabled
      if (indicators.sma.enabled && smaSeriesRef.current && seriesVisibility.sma20) {
        const smaData = calculateSMA(highPriceData, indicators.sma.period)
        if (smaData.length > 0) {
          smaSeriesRef.current.setData(smaData)
        }
      }
      if (smaSeriesRef.current && !seriesVisibility.sma20) {
        smaSeriesRef.current.setData([])
      }

      if (indicators.ema.enabled && emaSeriesRef.current && seriesVisibility.ema20) {
        const emaData = calculateEMA(highPriceData, indicators.ema.period)
        if (emaData.length > 0) {
          emaSeriesRef.current.setData(emaData)
        }
      }
      if (emaSeriesRef.current && !seriesVisibility.ema20) {
        emaSeriesRef.current.setData([])
      }

      // Per-side volume (stacked)
      const { buyBars, sellBars } = stackedVolumeBars(normalizeTimeseries(historyData), {
        showBuy: seriesVisibility.buyVolume,
        showSell: seriesVisibility.sellVolume
      })
      buyVolumeSeriesRef.current?.setData(buyBars)
      sellVolumeSeriesRef.current?.setData(sellBars)

      // Auto-fit time scale
      if (chartRef.current && highPriceData.length > 0) {
        chartRef.current.timeScale().fitContent()
      }

      console.log('LineChart: Chart data updated successfully')
    } catch (error) {
      console.error('LineChart: Error updating chart data:', error)
    }
  }, [historyData, seriesVisibility, indicators])

  // Min/max markers for the visible window (highest sell, lowest buy)
  useEffect(() => {
    const high = highPriceSeriesRef.current
    const low = lowPriceSeriesRef.current
    if (!high?.setMarkers || !low?.setMarkers) return
    try {
      high.setMarkers(stats && seriesVisibility.highPrice
        ? [{ time: stats.max.timestamp, position: 'aboveBar', color: CHART_COLORS.sell, shape: 'arrowDown', text: `High ${formatCompact(stats.max.price)}` }]
        : [])
      low.setMarkers(stats && seriesVisibility.lowPrice
        ? [{ time: stats.min.timestamp, position: 'belowBar', color: CHART_COLORS.buy, shape: 'arrowUp', text: `Low ${formatCompact(stats.min.price)}` }]
        : [])
    } catch (error) {
      console.error('LineChart: Error setting min/max markers:', error)
    }
  }, [stats, seriesVisibility.highPrice, seriesVisibility.lowPrice, historyData])

  // Close the marker popover when the data set changes
  useEffect(() => { setSelectedEvent(null) }, [timeframe, id])

  const handleSelectEvent = useCallback((group, x, y) => {
    setSelectedEvent({ time: group.time, markers: group.markers, x, y })
  }, [])

  const handleResetZoom = () => chartRef.current?.timeScale().fitContent()

  // Readout sits right of the crosshair, flipping left near the price axis
  const readoutLeft = (x) => {
    const width = chartContainerRef.current?.clientWidth ?? 800
    return x + 16 + READOUT_WIDTH > width - 80 ? Math.max(8, x - READOUT_WIDTH - 16) : x + 16
  }

  // Fetch data when id or timeframe changes
  useEffect(() => {
    if (id) {
      fetchData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, timeframe])

  const handleRefresh = () => {
    fetchData()
  }

  const handleDownload = () => {
    // TODO: Implement chart download
    console.log('Download chart')
  }

  return (
    <div style={{ width: '100%', padding: '1rem' }}>
      {/* Header */}
      <Group position="apart" mb="md">
        <Group spacing="xs">
          <Text size="xl" weight={700}>Price History</Text>
          {lastUpdateTime && (
            <Badge variant="dot" color="gray">
              Chart pulled {getRelativeTime(lastUpdateTime)} ago
            </Badge>
          )}
        </Group>
        <Group spacing="xs">
          <Button
            variant="subtle"
            size="sm"
            leftIcon={<IconRefresh size={16} />}
            onClick={handleRefresh}
            loading={historyStatus === 'loading'}
          >
            Refresh
          </Button>
          <Button
            variant="subtle"
            size="sm"
            leftIcon={<IconDownload size={16} />}
            onClick={handleDownload}
          >
            Download
          </Button>
        </Group>
      </Group>

      {/* Timeframe Selector */}
      <Group mb="md">
        {['day', 'week', 'month', 'quarter', 'year', 'alltime'].map(tf => (
          <Button
            key={tf}
            variant={timeframe === tf ? 'filled' : 'outline'}
            size="sm"
            onClick={() => setTimeframe(tf)}
          >
            {tf === 'day' ? '1D' : 
             tf === 'week' ? '1W' : 
             tf === 'month' ? '1M' : 
             tf === 'quarter' ? '3M' : 
             tf === 'year' ? '1Y' : 
             'All'}
          </Button>
        ))}
      </Group>

      {/* Item Header - Name, Image, and Brief Stats */}
      {currentItem?.name && (
        <Box
          style={{
            padding: '12px 16px',
            background: 'rgba(26,27,30,0.6)',
            border: '1px solid rgba(55,58,64,0.4)',
            borderRadius: 8,
            marginBottom: '1rem'
          }}
        >
          <Group align="center" spacing="md">
            {/* Item Image */}
            {currentItem?.icon && (
              <img
                src={`https://oldschool.runescape.wiki/images/${currentItem?.icon}`.replace(/ /g, '_')}
                alt={currentItem?.name}
                style={{
                  width: 32,
                  height: 32,
                  imageRendering: 'pixelated'
                }}
              />
            )}
            
            {/* Item Name */}
            <Text size="lg" weight={600} style={{ flex: 1 }}>
              {currentItem?.name}
            </Text>

            {/* Brief Stats */}
            <Group spacing="lg">
              {currentItem?.limit && (
                <Group spacing={4}>
                  <Text size="xs" color="dimmed">Limit:</Text>
                  <Text size="sm" weight={500}>
                    {currentItem?.limit.toLocaleString()}
                  </Text>
                </Group>
              )}
              
              {/* Volume info - using latest data point if available */}
              {historyData.length > 0 && historyData[historyData.length - 1] && (
                <Group spacing="lg">
                  {historyData[historyData.length - 1].highPriceVolume && (
                    <Group spacing={4}>
                      <Text size="xs" color="#f59e0b">Sell Vol:</Text>
                      <Text size="sm" weight={500}>
                        {historyData[historyData.length - 1].highPriceVolume.toLocaleString()}
                      </Text>
                    </Group>
                  )}
                  {historyData[historyData.length - 1].lowPriceVolume && (
                    <Group spacing={4}>
                      <Text size="xs" color="#3b82f6">Buy Vol:</Text>
                      <Text size="sm" weight={500}>
                        {historyData[historyData.length - 1].lowPriceVolume.toLocaleString()}
                      </Text>
                    </Group>
                  )}
                </Group>
              )}
            </Group>
          </Group>
        </Box>
      )}

      {/* Series Visibility Toggles */}
      <Stack spacing="xs" mb="md">
        <Text size="sm" weight={500}>Show:</Text>
        <Group spacing="md">
          <Checkbox
            label="Sell Price"
            checked={seriesVisibility.highPrice}
            onChange={(e) => setSeriesVisibility({ ...seriesVisibility, highPrice: e.currentTarget.checked })}
          />
          <Checkbox
            label="Buy Price"
            checked={seriesVisibility.lowPrice}
            onChange={(e) => setSeriesVisibility({ ...seriesVisibility, lowPrice: e.currentTarget.checked })}
          />
          <Checkbox
            label={(
              <Group spacing={6} noWrap>
                <Text size="sm">SMA(20)</Text>
                <Tooltip
                  label="Simple Moving Average: smooths price over the last N periods."
                  withArrow
                  position="top"
                >
                  <ActionIcon variant="subtle" size="xs" aria-label="About SMA">
                    <IconInfoCircle size={14} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            )}
            checked={seriesVisibility.sma20}
            onChange={(e) => {
              setSeriesVisibility({ ...seriesVisibility, sma20: e.currentTarget.checked })
              setIndicators({ ...indicators, sma: { ...indicators.sma, enabled: e.currentTarget.checked } })
            }}
          />
          <Checkbox
            label={(
              <Group spacing={6} noWrap>
                <Text size="sm">EMA(20)</Text>
                <Tooltip
                  label="Exponential Moving Average: like SMA, but weights recent prices more."
                  withArrow
                  position="top"
                >
                  <ActionIcon variant="subtle" size="xs" aria-label="About EMA">
                    <IconInfoCircle size={14} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            )}
            checked={seriesVisibility.ema20}
            onChange={(e) => {
              setSeriesVisibility({ ...seriesVisibility, ema20: e.currentTarget.checked })
              setIndicators({ ...indicators, ema: { ...indicators.ema, enabled: e.currentTarget.checked } })
            }}
          />
          <Checkbox
            label="Buy Volume"
            checked={seriesVisibility.buyVolume}
            onChange={(e) => setSeriesVisibility({ ...seriesVisibility, buyVolume: e.currentTarget.checked })}
          />
          <Checkbox
            label="Sell Volume"
            checked={seriesVisibility.sellVolume}
            onChange={(e) => setSeriesVisibility({ ...seriesVisibility, sellVolume: e.currentTarget.checked })}
          />
        </Group>
      </Stack>

      {/* News marker filters + visible-range stats */}
      <Group position="apart" spacing="xs" mb="xs">
        <MarkerFilterChips value={markerFilter} onChange={setMarkerFilter} counts={markerCounts} label="News" />
        {historyStatus === 'success' && (
          <RangeStatsBar stats={stats} zoomed={isZoomed} onReset={handleResetZoom} />
        )}
      </Group>

      {/* Chart Container (always mounted so the chart can initialize reliably, incl. inside modals).
          Drag across the chart to zoom into a spike; wheel pans/zooms. */}
      <div
        data-testid="price-chart"
        style={{ position: 'relative', width: '100%', height, cursor: 'crosshair', userSelect: 'none' }}
        {...brushHandlers}
      >
        <div
          ref={chartContainerRef}
          style={{
            width: '100%',
            height: '100%',
            position: 'relative'
          }}
        />

        {/* Drag-to-zoom selection */}
        {brush && Math.abs(brush.x1 - brush.x0) > 2 && (
          <Box
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: Math.min(brush.x0, brush.x1),
              width: Math.abs(brush.x1 - brush.x0),
              background: 'rgba(59, 130, 246, 0.1)',
              borderLeft: '1px solid rgba(59, 130, 246, 0.3)',
              borderRight: '1px solid rgba(59, 130, 246, 0.3)',
              zIndex: 3,
              pointerEvents: 'none'
            }}
          />
        )}

        {/* News marker dots on both lines (click for details); visibleWindow
            state re-renders them when the chart is panned/zoomed. */}
        {historyStatus === 'success' && (
          <EventDotsOverlay
            groups={eventGroups}
            chart={chartRef.current}
            highSeries={highPriceSeriesRef.current}
            lowSeries={lowPriceSeriesRef.current}
            selectedTime={selectedEvent?.time}
            onSelect={handleSelectEvent}
          />
        )}

        {selectedEvent && (
          <MarkerPopover
            markers={selectedEvent.markers}
            x={selectedEvent.x}
            top={Math.max(8, Math.min(selectedEvent.y + 14, height - 230))}
            containerWidth={chartContainerRef.current?.clientWidth}
            itemName={currentItem?.name}
            points={points}
            onClose={() => setSelectedEvent(null)}
          />
        )}

        {/* Crosshair readout: time, buy/sell, margin after tax, volume per side */}
        {hoveredPrices && historyStatus === 'success' && !brush && (
          <PriceReadout
            data={readout(pointByTime.get(hoveredPrices.time), id)}
            style={{
              position: 'absolute',
              left: readoutLeft(hoveredPrices.x),
              top: 8,
              width: READOUT_WIDTH,
              zIndex: 6,
              pointerEvents: 'none'
            }}
          />
        )}

        {/* News posts under the crosshair */}
        {hoveredEvents && historyStatus === 'success' && !selectedEvent && (
          <NewsHoverCard
            markers={hoveredEvents.items}
            itemName={currentItem?.name}
            style={{ position: 'absolute', left: readoutLeft(hoveredPrices?.x ?? hoveredEvents.x), top: 200, width: READOUT_WIDTH, zIndex: 5, pointerEvents: 'none' }}
          />
        )}

        {historyStatus === 'loading' && (
        <Center style={{ position: 'absolute', inset: 0 }}>
            <Loader size="lg" />
          </Center>
        )}

        {historyStatus === 'error' && (
          <Center style={{ position: 'absolute', inset: 0 }}>
            <Stack align="center" spacing="xs">
              <Text color="red">Failed to load chart data</Text>
              <Button onClick={handleRefresh} size="sm">Retry</Button>
            </Stack>
          </Center>
        )}

        {historyStatus === 'idle' && (
          <Center style={{ position: 'absolute', inset: 0 }}>
            <Text color="dimmed">Select an item to view price history</Text>
          </Center>
        )}
      </div>
    </div>
  )
}
