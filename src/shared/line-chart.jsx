import React, { useEffect, useState, useMemo, useRef } from 'react'
// @ts-ignore - lightweight-charts uses CommonJS
import { createChart, ColorType } from 'lightweight-charts'
import { getItemHistoryById } from '../api/rs-wiki-api.jsx'
import { getItemById, getRelativeTime } from '../utils/utils.jsx'
import { transformToLine, transformToVolume } from '../utils/chartDataTransform.js'
import { calculateSMA, calculateEMA } from '../utils/indicators.js'
import { Badge, Group, Text, Loader, Center, Button, Checkbox, Stack, ActionIcon, Tooltip, Box } from '@mantine/core'
import { IconRefresh, IconDownload, IconInfoCircle } from '@tabler/icons-react'
import { trpc } from '../utils/trpc.jsx'
import ChartToolbar from '../components/charts/ChartToolbar.jsx'
import IndicatorPanel from '../components/charts/IndicatorPanel.jsx'
import logoImage from '../assets/highalch.png'

export default function LineChart ({ id, items, height = 600 }) {
  // Default chart to month
  const [timeframe, setTimeframe] = useState('month')
  const [historyData, setHistoryData] = useState([])
  const [historyStatus, setHistoryStatus] = useState('idle') // 'idle' | 'loading' | 'success' | 'error'
  const [lastUpdateTime, setLastUpdateTime] = useState(null)
  const [hoveredEvents, setHoveredEvents] = useState(null) // { x, y, items: Array<{ title, kind, date }> } | null
  const [hoveredPrices, setHoveredPrices] = useState(null) // { x, y, time, buyPrice, sellPrice } | null
  const [eventDots, setEventDots] = useState([]) // Array<{ id, time, series, value, title, kind, date }>
  const [hoveredDotId, setHoveredDotId] = useState(null)
  
  const chartContainerRef = useRef(null)
  const chartRef = useRef(null)
  const highPriceSeriesRef = useRef(null)
  const lowPriceSeriesRef = useRef(null)
  const smaSeriesRef = useRef(null)
  const emaSeriesRef = useRef(null)
  const buyVolumeSeriesRef = useRef(null)
  const sellVolumeSeriesRef = useRef(null)
  const eventsByTimeRef = useRef(new Map()) // Map<number, Array<{title, kind, date}>>

  const [seriesVisibility, setSeriesVisibility] = useState({
    highPrice: true,
    lowPrice: true,
    // Default volumes ON
    buyVolume: true,
    sellVolume: true,
    sma20: false,
    ema20: false
  })

  const [activeDrawingTool, setActiveDrawingTool] = useState(null)
  const [indicators, setIndicators] = useState({
    sma: { enabled: false, period: 20 },
    ema: { enabled: false, period: 20 }
  })

  const currentItem = useMemo(() => getItemById(id, items) || {}, [id, items])

  // Convert our timeframe to RS Wiki API timestep
  const getApiTimestep = (timeframe) => {
    switch (timeframe) {
      case 'day':
        return '1h'        // Hourly data for 1 day
      case 'week':
        return '6h'        // 6-hour data for 1 week
      case 'month':
        return '24h'       // Daily data for 1 month
      case 'quarter':
        return '24h'       // Daily data for 3 months
      case 'year':
        return '24h'       // Daily data for 1 year
      case 'alltime':
        return '24h'       // All available daily data
      default:
        return '24h'
    }
  }

  // Get the cutoff timestamp for filtering data based on timeframe
  const getCutoffTimestamp = (timeframe) => {
    const now = Math.floor(Date.now() / 1000) // Current Unix timestamp in seconds
    switch (timeframe) {
      case 'day':
        return now - (24 * 60 * 60)           // 1 day ago
      case 'week':
        return now - (7 * 24 * 60 * 60)       // 1 week ago
      case 'month':
        return now - (30 * 24 * 60 * 60)      // 30 days ago
      case 'quarter':
        return now - (90 * 24 * 60 * 60)      // 90 days ago
      case 'year':
        return now - (365 * 24 * 60 * 60)     // 365 days ago
      case 'alltime':
        return 0                              // No cutoff, show all data
      default:
        return now - (7 * 24 * 60 * 60)       // Default to 1 week
    }
  }

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

        // Handle price tooltip
        const seriesData = param.seriesData
        let buyPrice = null
        let sellPrice = null
        
        if (seriesData) {
          // Get prices from the series data
          if (lowPriceSeriesRef.current && seriesData.has(lowPriceSeriesRef.current)) {
            buyPrice = seriesData.get(lowPriceSeriesRef.current)?.value
          }
          if (highPriceSeriesRef.current && seriesData.has(highPriceSeriesRef.current)) {
            sellPrice = seriesData.get(highPriceSeriesRef.current)?.value
          }
        }

        // Show price tooltip if we have price data
        if (buyPrice !== null || sellPrice !== null) {
          const date = new Date(t * 1000)
          setHoveredPrices({
            x: param.point.x,
            y: param.point.y,
            time: date,
            buyPrice,
            sellPrice
          })
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

      buyVolumeSeriesRef.current = chart.addHistogramSeries({
        color: '#f59e0b',
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
        scaleMargins: { top: 0.8, bottom: 0 },
        title: 'Buy Volume'
      })

      sellVolumeSeriesRef.current = chart.addHistogramSeries({
        color: '#22c55e',
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
        scaleMargins: { top: 0.8, bottom: 0 },
        title: 'Sell Volume'
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
  const blogsQuery = trpc.gameEvents.getByDateRange.useQuery({
    startDate: historyData.length > 0 
      ? new Date(Math.min(...historyData.map(d => d.timestamp * 1000)))
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default to 30 days for better coverage
    endDate: historyData.length > 0
      ? new Date(Math.max(...historyData.map(d => d.timestamp * 1000)))
      : new Date()
  }, {
    enabled: id && (historyStatus === 'loading' || historyStatus === 'success'), // Enable during loading for parallel fetch
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: true, // Enable mount fetching for immediate loading
    retry: 1, // Allow one retry for better reliability
    staleTime: 5 * 60 * 1000 // Cache for 5 minutes
  })

  const blogs = blogsQuery.data?.data?.blogs || []
  const updates = blogsQuery.data?.data?.updates || []
  
  // Debug blog/update data
  console.log('LineChart: Blog/update query status:', blogsQuery.status)
  if (blogsQuery.error) console.log('LineChart: Blog/update query error:', blogsQuery.error)
  console.log('LineChart: Blogs fetched:', blogs.length, 'Updates fetched:', updates.length)

  const normalizedEvents = useMemo(() => {
    const normalizeDateToUnixSec = (value) => {
      if (!value) return null
      const d = value instanceof Date ? value : new Date(value)
      const ts = d.getTime()
      if (!Number.isFinite(ts)) return null
      return Math.floor(ts / 1000)
    }

    const out = []

    for (const b of blogs) {
      const time = normalizeDateToUnixSec(b.date)
      if (!time) continue
      out.push({
        time,
        kind: 'blog',
        title: b.title ?? 'Developer Blog',
        date: b.date
      })
    }

    for (const u of updates) {
      const time = normalizeDateToUnixSec(u.updateDate ?? u.date)
      if (!time) continue
      out.push({
        time,
        kind: 'update',
        title: u.title ?? 'Game Update',
        date: u.updateDate ?? u.date
      })
    }

    // Deduplicate exact (time,title,kind)
    const seen = new Set()
    const deduped = []
    for (const e of out) {
      const key = `${e.time}|${e.kind}|${e.title}`
      if (seen.has(key)) continue
      seen.add(key)
      deduped.push(e)
    }

    return deduped.sort((a, b) => a.time - b.time)
  }, [blogs, updates])

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

      // Update volume series if enabled
      if (seriesVisibility.buyVolume && buyVolumeSeriesRef.current) {
        const buyVolumeData = transformToVolume(historyData, 'buy')
        if (buyVolumeData.length > 0) {
          buyVolumeSeriesRef.current.setData(buyVolumeData)
        }
      }
      if (buyVolumeSeriesRef.current && !seriesVisibility.buyVolume) {
        buyVolumeSeriesRef.current.setData([])
      }

      if (seriesVisibility.sellVolume && sellVolumeSeriesRef.current) {
        const sellVolumeData = transformToVolume(historyData, 'sell')
        if (sellVolumeData.length > 0) {
          sellVolumeSeriesRef.current.setData(sellVolumeData)
        }
      }
      if (sellVolumeSeriesRef.current && !seriesVisibility.sellVolume) {
        sellVolumeSeriesRef.current.setData([])
      }

      // Event markers (blogs + updates) as small circles on both series.
      // We "snap" each event to the nearest available bar time so it aligns with chart data.
      const snapToNearestTime = (data, targetTime) => {
        if (!Array.isArray(data) || data.length === 0) return null
        // data is sorted by time
        let lo = 0
        let hi = data.length - 1
        while (lo <= hi) {
          const mid = Math.floor((lo + hi) / 2)
          const t = data[mid].time
          if (t === targetTime) return t
          if (t < targetTime) lo = mid + 1
          else hi = mid - 1
        }
        const left = Math.max(0, Math.min(data.length - 1, hi))
        const right = Math.max(0, Math.min(data.length - 1, lo))
        const lt = data[left]?.time
        const rt = data[right]?.time
        if (typeof lt !== 'number') return rt ?? null
        if (typeof rt !== 'number') return lt ?? null
        return Math.abs(lt - targetTime) <= Math.abs(rt - targetTime) ? lt : rt
      }

      const markerColor = '#f59e0b'     // Use app's warning color for markers
      const eventMap = new Map()
      const minSeriesTime = highPriceData[0]?.time
      const maxSeriesTime = highPriceData[highPriceData.length - 1]?.time

      // Build lookup maps for value at time
      const highByTime = new Map(highPriceData.map((p) => [p.time, p.value]))
      const lowByTime = new Map(lowPriceData.map((p) => [p.time, p.value]))

      const inRangeEvents = normalizedEvents.filter((ev) => {
        if (typeof minSeriesTime !== 'number' || typeof maxSeriesTime !== 'number') return false
        return ev.time >= minSeriesTime && ev.time <= maxSeriesTime
      })

      // Limit number of markers so dense historical data doesn't overwhelm UI
      const MAX_EVENT_DOTS = 60
      const limitedEvents =
        inRangeEvents.length > MAX_EVENT_DOTS
          ? inRangeEvents.slice(inRangeEvents.length - MAX_EVENT_DOTS)
          : inRangeEvents

      for (const ev of limitedEvents) {
        const snapped = snapToNearestTime(highPriceData, ev.time)
        if (!snapped) continue
        const existing = eventMap.get(snapped) || []
        existing.push({ title: ev.title, kind: ev.kind, date: ev.date })
        eventMap.set(snapped, existing)
      }

      eventsByTimeRef.current = eventMap

      // Lightweight Charts markers with different colors for blogs vs updates
      const markerTimes = Array.from(eventMap.keys()).sort((a, b) => a - b)
      
      // Create separate markers for blogs and updates
      const blogMarkers = []
      const updateMarkers = []
      
      markerTimes.forEach(time => {
        const events = eventMap.get(time) || []
        const hasBlogs = events.some(e => e.kind === 'blog')
        const hasUpdates = events.some(e => e.kind === 'update')
        
        if (hasBlogs) {
          blogMarkers.push({
            time,
            position: 'inBar',
            color: '#3b82f6', // Blue for blogs
            shape: 'circle',
            text: ''
          })
        }
        
        if (hasUpdates) {
          updateMarkers.push({
            time,
            position: 'inBar',
            color: '#f59e0b', // Orange for updates
            shape: 'circle',
            text: ''
          })
        }
      })

      // Apply markers to series
      const allMarkers = [...blogMarkers, ...updateMarkers]
      if (highPriceSeriesRef.current?.setMarkers) highPriceSeriesRef.current.setMarkers(allMarkers)
      if (lowPriceSeriesRef.current?.setMarkers) lowPriceSeriesRef.current.setMarkers(allMarkers)

      // Build overlay dots (two per event time, one for each series)
      const dots = []
      for (const time of markerTimes) {
        const meta = eventMap.get(time) || []
        const highVal = highByTime.get(time)
        const lowVal = lowByTime.get(time)
        if (typeof highVal === 'number') {
          dots.push({
            id: `high-${time}`,
            time,
            series: 'high',
            value: highVal,
            title: meta[0]?.title ?? 'Event',
            kind: meta[0]?.kind ?? 'event',
            date: meta[0]?.date
          })
        }
        if (typeof lowVal === 'number') {
          dots.push({
            id: `low-${time}`,
            time,
            series: 'low',
            value: lowVal,
            title: meta[0]?.title ?? 'Event',
            kind: meta[0]?.kind ?? 'event',
            date: meta[0]?.date
          })
        }
      }
      setEventDots(dots)

      // Auto-fit time scale
      if (chartRef.current && highPriceData.length > 0) {
        chartRef.current.timeScale().fitContent()
      }

      console.log('LineChart: Chart data updated successfully')
    } catch (error) {
      console.error('LineChart: Error updating chart data:', error)
    }
  }, [historyData, seriesVisibility, indicators, normalizedEvents])

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

      {/* Chart Container (always mounted so the chart can initialize reliably, incl. inside modals) */}
      <div style={{ position: 'relative', width: '100%', height }}>
        <div
          ref={chartContainerRef}
          style={{
            width: '100%',
            height: '100%',
            position: 'relative'
          }}
        />

        {/* Event dots overlay (visible circles on both High + Low series). */}
        {historyStatus === 'success' && chartRef.current && eventDots.length > 0 && (
          <Box
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 4,
              pointerEvents: 'none'
            }}
          >
            {eventDots.map((d) => {
              const x = chartRef.current?.timeScale()?.timeToCoordinate?.(d.time)
              const series = d.series === 'high' ? highPriceSeriesRef.current : lowPriceSeriesRef.current
              const y = series?.priceToCoordinate?.(d.value)
              if (typeof x !== 'number' || typeof y !== 'number') return null

              return (
                <Box
                  key={d.id}
                  style={{
                    position: 'absolute',
                    left: x - 4,
                    top: y - 4,
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: d.kind === 'blog' ? '#3b82f6' : '#f59e0b', // Blue for blogs, orange for updates
                    boxShadow: '0 0 0 2px rgba(0,0,0,0.35)',
                    pointerEvents: 'none'
                  }}
                />
              )
            })}
          </Box>
        )}

        {/* Price tooltip */}
        {hoveredPrices && historyStatus === 'success' && (
          <Box
            style={{
              position: 'absolute',
              left: Math.min(Math.max(hoveredPrices.x + 12, 8), 760),
              top: Math.min(Math.max(hoveredPrices.y - (hoveredEvents ? 140 : 60), 8), 520), // Adjust position if event tooltip is also present
              zIndex: 6,
              pointerEvents: 'none',
              maxWidth: 280
            }}
          >
            <Box
              style={{
                background: 'rgba(26,27,30,0.95)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                borderRadius: 8,
                padding: '8px 10px',
                boxShadow: '0 8px 25px rgba(0,0,0,0.4)'
              }}
            >
              <Text size="xs" color="dimmed" mb={4}>
                {hoveredPrices.time.toLocaleDateString()} {hoveredPrices.time.toLocaleTimeString()}
              </Text>
              <Stack spacing={2}>
                {hoveredPrices.buyPrice && (
                  <Group spacing={8}>
                    <Text size="sm" color="#3b82f6" style={{ fontWeight: 500 }}>Buy:</Text>
                    <Text size="sm" style={{ fontWeight: 600 }}>
                      {hoveredPrices.buyPrice.toLocaleString()} gp
                    </Text>
                  </Group>
                )}
                {hoveredPrices.sellPrice && (
                  <Group spacing={8}>
                    <Text size="sm" color="#f59e0b" style={{ fontWeight: 500 }}>Sell:</Text>
                    <Text size="sm" style={{ fontWeight: 600 }}>
                      {hoveredPrices.sellPrice.toLocaleString()} gp
                    </Text>
                  </Group>
                )}
                {hoveredPrices.buyPrice && hoveredPrices.sellPrice && (
                  <Group spacing={8}>
                    <Text size="xs" color="dimmed">Margin:</Text>
                    <Text size="xs" color={hoveredPrices.sellPrice > hoveredPrices.buyPrice ? '#10b981' : '#ef4444'}>
                      {(hoveredPrices.sellPrice - hoveredPrices.buyPrice).toLocaleString()} gp
                    </Text>
                  </Group>
                )}
              </Stack>
            </Box>
          </Box>
        )}

        {/* Game events tooltip */}
        {hoveredEvents && historyStatus === 'success' && (
          <Box
            style={{
              position: 'absolute',
              left: Math.min(Math.max(hoveredEvents.x + 12, 8), 760),
              top: Math.min(Math.max(hoveredEvents.y + 20, 8), 520), // Slight offset down
              zIndex: 5,
              pointerEvents: 'none',
              maxWidth: 320
            }}
          >
            <Box
              style={{
                background: 'rgba(26,27,30,0.92)',
                border: '1px solid rgba(245, 158, 11, 0.35)',    // Use app warning color
                borderRadius: 10,
                padding: '10px 12px',
                boxShadow: '0 12px 30px rgba(0,0,0,0.35)'
              }}
            >
              <Text size="xs" color="dimmed" mb={6}>Game event</Text>
              <Stack spacing={6}>
                {hoveredEvents.items.slice(0, 4).map((e, idx) => (
                  <Group key={`${e.kind}-${idx}`} spacing={8} align="flex-start">
                    <Box
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: e.kind === 'blog' ? '#3b82f6' : '#f59e0b', // Blue for blogs, orange for updates
                        marginTop: 4,
                        flexShrink: 0
                      }}
                    />
                    <Text size="sm" style={{ lineHeight: 1.2, flex: 1 }}>
                      {e.title}
                    </Text>
                  </Group>
                ))}
                {hoveredEvents.items.length > 4 && (
                  <Text size="xs" color="dimmed">+{hoveredEvents.items.length - 4} more</Text>
                )}
              </Stack>
            </Box>
          </Box>
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
