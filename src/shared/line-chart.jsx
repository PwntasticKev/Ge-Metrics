import React, { useEffect, useState, useMemo, useRef } from 'react'
import Chart from 'react-apexcharts'
import { getItemHistoryById } from '../api/rs-wiki-api.jsx'
import { getItemById, getRelativeTime } from '../utils/utils.jsx'
import { Badge, Group, Text, Loader, Center, Button, Checkbox, Stack } from '@mantine/core'
import { IconClock, IconRefresh, IconDownload } from '@tabler/icons-react'
import { trpc } from '../utils/trpc.jsx'
import logoImage from '../assets/highalch.png'

export default function LineChart ({ id, items }) {
  const [timeframe, setTimeframe] = useState('5m')
  const [historyData, setHistoryData] = useState(null)
  const [historyStatus, setHistoryStatus] = useState('idle')
  const [isFetching, setIsFetching] = useState(false)
  const [lastUpdateTime, setLastUpdateTime] = useState(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [zoomLevel, setZoomLevel] = useState({ xaxis: { min: undefined, max: undefined } })
  const chartRef = useRef(null)
  
  // Series visibility toggles - volumes dimmed by default
  const [seriesVisibility, setSeriesVisibility] = useState({
    highPrice: true,
    lowPrice: true,
    buyVolume: false, // Dimmed by default (visible but dimmed)
    sellVolume: false, // Dimmed by default (visible but dimmed)
    sma20: false,
    ema20: false
  })

  const item = useMemo(() => getItemById(id, items) || {}, [id, items])
  
  // Fetch blogs for the chart's date range
  const blogsQuery = trpc.blogs.getByDateRange.useQuery({
    startDate: historyData && historyData.length > 0 
      ? new Date(Math.min(...historyData.map(d => d.timestamp * 1000)))
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Default to last 7 days
    endDate: historyData && historyData.length > 0
      ? new Date(Math.max(...historyData.map(d => d.timestamp * 1000)))
      : new Date()
  }, {
    enabled: historyStatus === 'success' && !!historyData && historyData.length > 0
  })
  
  const blogs = blogsQuery.data?.data || []

  const fetchData = async () => {
    if (!id) {
      console.warn('LineChart: No ID provided')
      setHistoryStatus('error')
      return
    }
    
    console.log('LineChart: Fetching data for ID:', id, 'timeframe:', timeframe)
    setIsFetching(true)
    setHistoryStatus('loading')
    
    try {
      // Compute a start window to limit payload
      const nowMs = Date.now()
      const startWindowMs = {
        '5m': 3 * 24 * 60 * 60 * 1000,
        '1h': 90 * 24 * 60 * 60 * 1000,
        '6h': 365 * 24 * 60 * 60 * 1000,
        '24h': 3 * 365 * 24 * 60 * 60 * 1000
      }[timeframe] || (90 * 24 * 60 * 60 * 1000)
      const startUnix = Math.floor((nowMs - startWindowMs) / 1000)

      // First try: with start parameter
      let result = await getItemHistoryById(timeframe, id, startUnix)

      // Fallback: retry without start if the API rejected the first call or returned empty
      if (!result?.success || !result?.data) {
        console.warn('LineChart: Retry timeseries without start param due to error/empty payload')
        result = await getItemHistoryById(timeframe, id)
      }
      
      if (result && result.success && result.data) {
        const histData = result.data.data || result.data
        
        if (Array.isArray(histData) && histData.length > 0) {
          setHistoryData(histData)
          setHistoryStatus('success')
          setLastUpdateTime(new Date())
        } else {
          console.warn('LineChart: No valid data available. Data type:', typeof histData, 'Length:', histData?.length)
          setHistoryData([])
          setHistoryStatus('error')
        }
      } else {
        console.warn('LineChart: Invalid API response structure:', result)
        setHistoryData([])
        setHistoryStatus('error')
      }
    } catch (error) {
      console.error('LineChart: Error fetching history data (final):', error)
      setHistoryStatus('error')
    } finally {
      setIsFetching(false)
    }
  }

  useEffect(() => {
    fetchData()
    
    const timeout = setTimeout(() => {
      if (historyStatus === 'loading') {
        console.warn('Chart data fetch timed out')
        setHistoryStatus('error')
        setIsFetching(false)
      }
    }, 10000)
    
    return () => clearTimeout(timeout)
  }, [id, timeframe])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const chartOptions = useMemo(() => {
    if (!historyData || historyData.length === 0) return null

    // Last-N-points window per resolution to guarantee visible data
    const pointsPerResolution = {
      '5m': 288,   // ~24h of 5m points
      '1h': 168,   // ~7 days
      '6h': 120,   // ~30 days
      '24h': 365   // ~1 year
    }
    const points = pointsPerResolution[timeframe] ?? 288
    const windowed = historyData.slice(-points)

    const timestamps = windowed.map(d => d.timestamp * 1000)
    const minTime = timestamps.length > 0 ? Math.min(...timestamps) : undefined
    const maxTime = timestamps.length > 0 ? Math.max(...timestamps) : undefined

    // Compute dynamic volume y-axis upper bound (95th percentile) to avoid tiny bars
    const allVolumes = windowed.map(d => (d.lowPriceVolume || 0)).concat(windowed.map(d => (d.highPriceVolume || 0)))
    let volumeMax
    if (allVolumes.length > 0) {
      const sorted = [...allVolumes].sort((a, b) => a - b)
      const idx = Math.max(0, Math.floor(sorted.length * 0.95) - 1)
      volumeMax = Math.max(sorted[idx], sorted[sorted.length - 1] || 0)
      // Guard: ensure max isn't zero
      if (volumeMax === 0) volumeMax = undefined
    }

    // Filter blogs to only show those within the chart's date range
    const filteredBlogs = blogs.filter(blog => {
      const blogDate = new Date(blog.date).getTime()
      return (minTime === undefined || blogDate >= minTime) && (maxTime === undefined || blogDate <= maxTime)
    })

    return {
      chart: {
        id: `chart-${id}-${timeframe}`,
        type: 'line',
        height: 400,
        stacked: false,
        zoom: {
          enabled: true,
          type: 'x',
          autoScaleYaxis: false,
          zoomedArea: {
            fill: { color: '#90CAF9', opacity: 0.4 },
            stroke: { color: '#0D47A1', opacity: 0.4, width: 1 }
          }
        },
        pan: { enabled: true, type: 'x' },
        toolbar: {
          show: true,
          offsetX: 0,
          offsetY: 0,
          tools: { download: true, selection: true, zoom: true, zoomin: true, zoomout: true, pan: true, reset: true },
          export: {
            csv: { filename: `${item?.name || 'chart'}-${timeframe}`, columnDelimiter: ',', headerCategory: 'Time', headerValue: 'Value' },
            svg: { filename: `${item?.name || 'chart'}-${timeframe}` },
            png: { filename: `${item?.name || 'chart'}-${timeframe}` }
          }
        },
        animations: { enabled: false },
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
      },
      dataLabels: { enabled: false },
      stroke: {
        curve: 'smooth',
        width: (() => {
          const widths = []
          if (seriesVisibility.highPrice) widths.push(6)
          if (seriesVisibility.lowPrice) widths.push(5) // Slightly thinner so both lines are visible
          widths.push(0) // Buy Volume
          widths.push(0) // Sell Volume
          return widths
        })(),
        dashArray: (() => {
          const dashes = []
          if (seriesVisibility.highPrice) dashes.push(0) // solid high price
          if (seriesVisibility.lowPrice) dashes.push(6) // dashed low price for separation
          dashes.push(0)
          dashes.push(0)
          return dashes
        })()
      },
      // Dynamic colors and opacity based on visibility
      colors: (() => {
        const colors = []
        if (seriesVisibility.highPrice) colors.push('#22d3ee') // High Price - brighter teal
        if (seriesVisibility.lowPrice) colors.push('#ff6b6b') // Low Price - brighter red for contrast
        colors.push('#f59e0b')
        colors.push('#22c55e')
        return colors
      })(),
      fill: {
        opacity: (() => {
          const opacity = []
          if (seriesVisibility.highPrice) opacity.push(0.95)
          if (seriesVisibility.lowPrice) opacity.push(0.95)
          opacity.push(seriesVisibility.buyVolume ? 0.9 : 0.25)
          opacity.push(seriesVisibility.sellVolume ? 0.9 : 0.25)
          return opacity
        })(),
        type: (() => {
          const types = []
          if (seriesVisibility.highPrice) types.push('gradient')
          if (seriesVisibility.lowPrice) types.push('gradient')
          types.push('solid')
          types.push('solid')
          return types
        })(),
        gradient: { shadeIntensity: 1, opacityFrom: 0.95, opacityTo: 0.6, stops: [0, 100] }
      },
      markers: { size: 0, hover: { size: 5 } },
      grid: {
        borderColor: '#50545a',
        strokeDashArray: 2,
        xaxis: { lines: { show: true, strokeDashArray: 2, opacity: 0.35 } },
        yaxis: { lines: { show: true, strokeDashArray: 2, opacity: 0.35 } }
      },
      xaxis: {
        type: 'datetime',
        min: minTime,
        max: maxTime,
        labels: { style: { colors: '#E6E7E9', fontSize: '12px' }, format: 'MMM dd HH:mm' },
        axisBorder: { color: '#3d4147' },
        axisTicks: { color: '#3d4147' }
      },
      yaxis: [
        {
          title: { text: 'Price (GP)', style: { color: '#E6E7E9', fontSize: '12px' } },
          labels: { style: { colors: '#E6E7E9' }, formatter: (v) => new Intl.NumberFormat().format(Math.round(v)) },
          opposite: false
        },
        {
          title: { text: 'Volume', style: { color: '#B0B4BA', fontSize: '12px' } },
          labels: { style: { colors: '#B0B4BA' }, formatter: (v) => new Intl.NumberFormat().format(Math.round(v)) },
          opposite: true,
          forceNiceScale: true,
          min: 0,
          max: volumeMax
        }
      ],
      tooltip: {
        shared: true,
        intersect: false,
        theme: 'dark',
        style: { fontSize: '12px' },
        x: { format: 'MMM dd, yyyy HH:mm' },
        y: { formatter: (v) => new Intl.NumberFormat().format(Math.round(v)) },
        marker: { show: true },
        custom: function({ series, seriesIndex, dataPointIndex, w }) {
          const dataPoint = w.globals.series[0] && w.globals.series[0][dataPointIndex]
          if (!dataPoint || dataPoint.length < 1) return ''
          const timestamp = dataPoint[0]
          const blogMarkers = blogs.filter(blog => Math.abs(new Date(blog.date).getTime() - timestamp) < 24 * 60 * 60 * 1000)
          let html = '<div style="padding: 10px;">'
          html += '<div>'
          series.forEach((s, i) => {
            const value = s[dataPointIndex]
            if (value !== null && value !== undefined) {
              const seriesName = w.globals.seriesNames[i]
              html += `<div><strong>${seriesName}:</strong> ${new Intl.NumberFormat().format(Math.round(value))}</div>`
            }
          })
          html += '</div>'
          if (blogMarkers.length > 0) {
            html += '<div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #4d5156;">'
            html += '<div style="font-weight: bold; margin-bottom: 5px;">Game Updates:</div>'
            blogMarkers.forEach(blog => {
              const blogDate = new Date(blog.date)
              html += `<div style=\"margin-bottom: 5px;\">`
              html += `<a href=\"${blog.url}\" target=\"_blank\" rel=\"noopener noreferrer\" style=\"color: #339af0; text-decoration: underline;\">`
              html += `${blog.title}`
              html += `</a>`
              html += `<div style=\"font-size: 10px; color: #868E96;\">${blogDate.toLocaleDateString()}</div>`
              html += `</div>`
            })
            html += '</div>'
          }
          html += '</div>'
          return html
        }
      },
      annotations: {
        xaxis: filteredBlogs.map(blog => ({
          x: new Date(blog.date).getTime(),
          borderColor: '#9aa0a6',
          strokeDashArray: 4,
          borderWidth: 2,
          opacity: 0.6,
          label: { borderColor: '#9aa0a6', style: { color: '#111', background: '#9aa0a6', fontSize: '10px' }, text: 'Update', orientation: 'vertical', offsetY: 0, offsetX: 0 }
        }))
      },
      legend: { position: 'top', horizontalAlign: 'right', floating: false, fontSize: '12px', fontFamily: 'Inter, system-ui', fontWeight: 500, offsetX: 0, offsetY: 0, labels: { colors: '#E6E7E9', useSeriesColors: false }, markers: { width: 12, height: 12, strokeWidth: 0, radius: 12 } },
      title: { text: `${item?.name || 'Loading...'}: ${timeframe}`, align: 'left', style: { fontSize: '16px', fontWeight: 600, color: '#E6E7E9', fontFamily: 'Inter, system-ui' } },
      subtitle: { text: isFetching ? 'Updating...' : '', align: 'left', style: { fontSize: '12px', color: '#B0B4BA' } }
    }
  }, [id, timeframe, item?.name, historyData, isFetching, blogs, seriesVisibility])

  const chartSeries = useMemo(() => {
    if (!historyData || historyData.length === 0) return []

    const pointsPerResolution = { '5m': 288, '1h': 168, '6h': 120, '24h': 365 }
    const points = pointsPerResolution[timeframe] ?? 288
    const windowed = historyData.slice(-points)

    // Helper: SMA & EMA based on High Price
    const highValues = windowed.map(d => d.avgHighPrice).filter(v => v !== null && v !== undefined)
    const timestamps = windowed.map(d => d.timestamp * 1000)
    const computeSMA = (values, period) => {
      const out = []
      let sum = 0
      for (let i = 0; i < values.length; i++) {
        sum += values[i]
        if (i >= period) sum -= values[i - period]
        if (i >= period - 1) out.push([timestamps[i], sum / period])
      }
      return out
    }
    const computeEMA = (values, period) => {
      const k = 2 / (period + 1)
      const out = []
      let ema
      for (let i = 0; i < values.length; i++) {
        const v = values[i]
        ema = i === 0 ? v : v * k + ema * (1 - k)
        if (i >= period - 1) out.push([timestamps[i], ema])
      }
      return out
    }

    const series = []
    if (seriesVisibility.highPrice) {
      series.push({ name: 'High Price', type: 'line', data: windowed.map(d => [d.timestamp * 1000, d.avgHighPrice]).filter(d => d[1] !== null) })
    }
    if (seriesVisibility.lowPrice) {
      series.push({ name: 'Low Price', type: 'line', data: windowed.map(d => [d.timestamp * 1000, d.avgLowPrice]).filter(d => d[1] !== null) })
    }
    if (seriesVisibility.sma20 && highValues.length > 0) {
      series.push({ name: 'SMA(20)', type: 'line', data: computeSMA(highValues, 20) })
    }
    if (seriesVisibility.ema20 && highValues.length > 0) {
      series.push({ name: 'EMA(20)', type: 'line', data: computeEMA(highValues, 20) })
    }
    series.push({ name: 'Buy Volume', type: 'column', data: windowed.map(d => [d.timestamp * 1000, d.lowPriceVolume || 0]), yAxisIndex: 1 })
    series.push({ name: 'Sell Volume', type: 'column', data: windowed.map(d => [d.timestamp * 1000, d.highPriceVolume || 0]), yAxisIndex: 1 })
    return series
  }, [historyData, seriesVisibility, timeframe])

  // Update chart options to support mixed chart types
  const updatedChartOptions = useMemo(() => {
    if (!chartOptions) return null
    
    return {
      ...chartOptions,
      chart: {
        ...chartOptions.chart,
        type: 'line' // Base type, but series can override with their own types
      },
      plotOptions: {
        bar: {
          columnWidth: '100%', // Even thicker bars
          borderRadius: 4,
          dataLabels: { position: 'top', enabled: false },
          horizontal: false,
          distributed: false,
          rangeBarOverlap: false,
          rangeBarGroupRows: false
        }
      }
    }
  }, [chartOptions])

  if (historyStatus === 'loading' || historyStatus === 'idle') {
    return (
      <Center style={{ height: 400 }}>
        <Loader />
        <Text ml="md">Loading chart data...</Text>
      </Center>
    )
  }

  if (historyStatus === 'error') {
    return (
      <Center style={{ height: 400 }}>
        <Text color="red">Error loading chart data. Please try again later.</Text>
      </Center>
    )
  }

  if (!historyData || historyData.length === 0) {
    return (
      <Center style={{ height: 400 }}>
        <Text>No historical data available for this item and timeframe.</Text>
      </Center>
    )
  }

  const handleDownload = async () => {
    if (!chartRef.current) return
    
    try {
      const chart = chartRef.current.chart
      if (!chart) return
      
      // Get the chart's SVG as data URI
      const svgDataUri = await chart.dataURI()
      
      // Create a canvas to overlay the logo
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()
      
      // Set canvas size to match chart
      canvas.width = svgDataUri.width || 1200
      canvas.height = svgDataUri.height || 600
      
      // Load the logo image
      img.onload = () => {
        // Fill white background
        ctx.fillStyle = '#1a1b1e'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        
        // Draw the chart image
        const chartImg = new Image()
        chartImg.onload = () => {
          ctx.drawImage(chartImg, 0, 0, canvas.width, canvas.height)
          
          // Draw logo in top left (scaled to ~80px height)
          const logoSize = 80
          const logoPadding = 20
          ctx.drawImage(img, logoPadding, logoPadding, logoSize, logoSize)
          
          // Convert to blob and download
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob)
              const link = document.createElement('a')
              link.href = url
              link.download = `${item?.name || 'chart'}-${timeframe}-${new Date().toISOString().split('T')[0]}.png`
              document.body.appendChild(link)
              link.click()
              document.body.removeChild(link)
              URL.revokeObjectURL(url)
            }
          }, 'image/png')
        }
        chartImg.src = svgDataUri.imgURI
      }
      
      img.src = logoImage
      img.crossOrigin = 'anonymous'
    } catch (error) {
      console.error('Error downloading chart:', error)
      // Fallback: use ApexCharts built-in download
      const chart = chartRef.current.chart
      if (chart) {
        chart.download({
          filename: `${item?.name || 'chart'}-${timeframe}`,
          format: 'png'
        })
      }
    }
  }

  const timeframeButtons = [
    { value: '5m', label: '5m' },
    { value: '1h', label: '1hr' },
    { value: '6h', label: '6hr' },
    { value: '24h', label: '24hr' }
  ]

  return (
    <div style={{ padding: '20px' }}>
      {/* Chart Status Header */}
      <Group position="apart" mb="md">
        <Group>
          <IconClock size={16} />
          <Text size="sm">
            Chart {getRelativeTime(lastUpdateTime)}
          </Text>
        </Group>
        <Group>
          <Button variant="light" size="xs" onClick={() => fetchData()} disabled={isFetching}>
            <IconRefresh size={14} />
          </Button>
          <Button variant="light" size="xs" onClick={handleDownload} disabled={isFetching || !updatedChartOptions}>
            <IconDownload size={14} />
          </Button>
          <Badge color="green" variant="light">
            Live Updates
          </Badge>
          {isFetching && (
            <Badge color="blue" variant="light" leftIcon={<IconRefresh size={12} />}>
              Updating...
            </Badge>
          )}
        </Group>
      </Group>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Timeframe buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {timeframeButtons.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setTimeframe(value)}
              disabled={isFetching}
              style={{
                backgroundColor: timeframe === value ? '#339af0' : '#25262b',
                color: '#C1C2C5',
                border: `1px solid ${timeframe === value ? '#339af0' : '#373A40'}`,
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: isFetching ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                opacity: isFetching ? 0.6 : 1
              }}
            >
              {label}
            </button>
          ))}
        </div>
        
        {/* Series visibility toggles */}
        <div style={{ display: 'flex', gap: '16px', marginLeft: 'auto', alignItems: 'center' }}>
          <Text size="xs" color="dimmed" style={{ marginRight: '8px' }}>Show:</Text>
          <Checkbox
            label="High Price"
            checked={seriesVisibility.highPrice}
            onChange={(e) => setSeriesVisibility({ ...seriesVisibility, highPrice: e.currentTarget.checked })}
            size="xs"
            styles={{ label: { color: '#C1C2C5', fontSize: '12px' } }}
          />
          <Checkbox
            label="Low Price"
            checked={seriesVisibility.lowPrice}
            onChange={(e) => setSeriesVisibility({ ...seriesVisibility, lowPrice: e.currentTarget.checked })}
            size="xs"
            styles={{ label: { color: '#C1C2C5', fontSize: '12px' } }}
          />
          <Checkbox
            label="SMA(20)"
            checked={seriesVisibility.sma20}
            onChange={(e) => setSeriesVisibility({ ...seriesVisibility, sma20: e.currentTarget.checked })}
            size="xs"
            styles={{ label: { color: '#C1C2C5', fontSize: '12px' } }}
          />
          <Checkbox
            label="EMA(20)"
            checked={seriesVisibility.ema20}
            onChange={(e) => setSeriesVisibility({ ...seriesVisibility, ema20: e.currentTarget.checked })}
            size="xs"
            styles={{ label: { color: '#C1C2C5', fontSize: '12px' } }}
          />
          <Checkbox
            label="Buy Volume"
            checked={seriesVisibility.buyVolume}
            onChange={(e) => setSeriesVisibility({ ...seriesVisibility, buyVolume: e.currentTarget.checked })}
            size="xs"
            styles={{ label: { color: '#C1C2C5', fontSize: '12px', opacity: seriesVisibility.buyVolume ? 1 : 0.5 } }}
          />
          <Checkbox
            label="Sell Volume"
            checked={seriesVisibility.sellVolume}
            onChange={(e) => setSeriesVisibility({ ...seriesVisibility, sellVolume: e.currentTarget.checked })}
            size="xs"
            styles={{ label: { color: '#C1C2C5', fontSize: '12px', opacity: seriesVisibility.sellVolume ? 1 : 0.5 } }}
          />
        </div>
      </div>

      {updatedChartOptions && chartSeries.length > 0 && (
        <>
          <Chart
            ref={chartRef}
            options={updatedChartOptions}
            series={chartSeries}
            type="line"
            height={400}
          />
          {/* Brush (range) chart */}
          <div style={{ marginTop: 12 }}>
            <Chart
              options={{
                chart: {
                  id: `brush-${id}-${timeframe}`,
                  brush: { enabled: true, target: `chart-${id}-${timeframe}` },
                  selection: { enabled: true, xaxis: { min: chartOptions?.xaxis?.min, max: chartOptions?.xaxis?.max } },
                  animations: { enabled: false }
                },
                xaxis: { type: 'datetime' },
                yaxis: { labels: { show: false } },
                grid: { show: false },
                colors: ['#22d3ee']
              }}
              series={[{
                name: 'High Price',
                data: chartSeries.find(s => s.name === 'High Price')?.data || []
              }]}
              type="area"
              height={80}
            />
          </div>
        </>
      )}
    </div>
  )
}
