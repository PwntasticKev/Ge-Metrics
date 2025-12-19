import React, { useEffect, useState, useRef } from 'react'
// @ts-ignore - lightweight-charts uses CommonJS
import { createChart, ColorType } from 'lightweight-charts'
import { getItemHistoryById } from '../../api/rs-wiki-api.jsx'
import { transformToLine } from '../../utils/chartDataTransform.js'
import { Tooltip } from '@mantine/core'

const MiniChart = ({ itemId, width = 120, height = 40, currentPrice }) => {
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)
  const [hoverPrice, setHoverPrice] = useState(null)
  const chartContainerRef = useRef(null)
  const chartRef = useRef(null)
  const seriesRef = useRef(null)

  // Fetch data
  useEffect(() => {
    if (!itemId) {
      setLoading(false)
      return
    }

    const fetchData = async () => {
      setLoading(true)
      try {
        console.log(`MiniChart: Fetching data for item ${itemId}`)
        
        const response = await getItemHistoryById('1h', itemId)

        if (!response || !response.success) {
          console.warn('MiniChart: Failed to fetch data', response?.error)
          setChartData([])
          setLoading(false)
          return
        }

        // Handle different response structures
        let dataArray = null
        
        if (Array.isArray(response.data)) {
          dataArray = response.data
        } else if (response.data?.data && Array.isArray(response.data.data)) {
          dataArray = response.data.data
        } else if (response.data?.timeseries && Array.isArray(response.data.timeseries)) {
          dataArray = response.data.timeseries
        }

        if (!dataArray || dataArray.length === 0) {
          console.warn('MiniChart: No data received')
          setChartData([])
          setLoading(false)
          return
        }

        // Filter and sort data
        const validData = dataArray
          .filter(item => {
            if (!item || typeof item !== 'object') return false
            if (typeof item.timestamp !== 'number') return false
            return item.avgHighPrice !== null || item.avgLowPrice !== null
          })
          .sort((a, b) => a.timestamp - b.timestamp)
          .slice(-20) // Last 20 points

        if (validData.length === 0) {
          console.warn('MiniChart: No valid data after filtering')
          setChartData([])
          setLoading(false)
          return
        }

        // Transform to line data
        const lineData = transformToLine(validData, 'high')
        
        if (lineData.length === 0) {
          console.warn('MiniChart: No data after transformation')
          setChartData([])
          setLoading(false)
          return
        }

        console.log(`MiniChart: Successfully loaded ${lineData.length} data points`)
        setChartData(lineData)
      } catch (error) {
        console.error('MiniChart: Error fetching data:', error)
        setChartData([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [itemId])

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current || loading) return

    if (chartData.length === 0) {
      // Clear chart if no data
      if (seriesRef.current) {
        seriesRef.current.setData([])
      }
      return
    }

    try {
      // Create chart if it doesn't exist
      if (!chartRef.current) {
        const chart = createChart(chartContainerRef.current, {
          width,
          height,
          layout: {
            background: { type: ColorType.Solid, color: 'transparent' },
            textColor: '#C1C2C5',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 10,
            // Remove TradingView attribution logo overlay
            attributionLogo: false
          },
          grid: {
            vertLines: { visible: false },
            horzLines: { visible: false }
          },
          crosshair: {
            mode: 1, // Enable crosshair for hover tooltip
            vertLine: { visible: false },
            horzLine: { visible: false }
          },
          handleScroll: false,
          handleScale: false,
          rightPriceScale: {
            visible: false
          },
          timeScale: {
            visible: false
          },
          localization: {
            priceFormatter: (price) => price.toLocaleString('en-US')
          }
        })

        chartRef.current = chart

        // Create line series
        seriesRef.current = chart.addLineSeries({
          color: '#f59e0b',
          lineWidth: 1,
          priceFormat: { type: 'price', precision: 0, minMove: 1 },
          lastValueVisible: false,
          priceLineVisible: false
        })

        // Subscribe to crosshair move for hover tooltip
        chart.subscribeCrosshairMove((param) => {
          if (!param || param.point === undefined || !param.time || !param.seriesData || param.seriesData.size === 0) {
            setHoverPrice(null)
            return
          }

          const seriesData = param.seriesData.get(seriesRef.current)
          if (seriesData && typeof seriesData.value === 'number') {
            setHoverPrice(seriesData.value)
          } else {
            setHoverPrice(null)
          }
        })

        console.log('MiniChart: Chart initialized')
      }

      // Update data
      if (seriesRef.current && chartData.length > 0) {
        seriesRef.current.setData(chartData)
        
        // Auto-fit time scale
        if (chartRef.current) {
          chartRef.current.timeScale().fitContent()
        }

        console.log(`MiniChart: Updated chart with ${chartData.length} points`)
      }
    } catch (error) {
      console.error('MiniChart: Error updating chart:', error)
    }

    return () => {
      if (chartRef.current) {
        try {
          chartRef.current.remove()
        } catch (error) {
          console.error('MiniChart: Error removing chart:', error)
        }
        chartRef.current = null
        seriesRef.current = null
      }
    }
  }, [chartData, loading, width, height])

  if (loading) {
    return (
      <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '8px', color: '#666' }}>...</div>
      </div>
    )
  }

  if (chartData.length === 0) {
    return (
      <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '8px', color: '#666' }}>No data</div>
      </div>
    )
  }

  const displayPrice = hoverPrice || currentPrice || (chartData.length > 0 ? chartData[chartData.length - 1].value : null)

  return (
    <Tooltip
      label={displayPrice ? `${displayPrice.toLocaleString()} GP` : 'No price data'}
      withArrow
      position="top"
      openDelay={200}
    >
      <div
        style={{
          width,
          height,
          position: 'relative',
          cursor: 'crosshair'
        }}
        onMouseLeave={() => setHoverPrice(null)}
      >
        <div
          ref={chartContainerRef}
          style={{
            width: '100%',
            height: '100%',
            position: 'relative'
          }}
        />
      </div>
    </Tooltip>
  )
}

export default MiniChart
