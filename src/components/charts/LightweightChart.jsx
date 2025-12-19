import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
// @ts-ignore - lightweight-charts uses CommonJS
import { createChart, ColorType } from 'lightweight-charts'
import { Box } from '@mantine/core'
import { transformToCandlestick, transformToLine, transformToVolume, toChartTime } from '../../utils/chartDataTransform.js'

/**
 * LightweightChart - Base wrapper component for TradingView Lightweight Charts
 * 
 * @param {Object} props
 * @param {Array} props.data - OSRS API data format: [{ timestamp, avgHighPrice, avgLowPrice, highPriceVolume, lowPriceVolume }]
 * @param {string} props.chartType - 'line', 'candlestick', or 'area'
 * @param {Object} props.options - Chart options (width, height, layout, etc.)
 * @param {boolean} props.showVolume - Whether to show volume bars
 * @param {string} props.volumeType - 'buy', 'sell', or 'total'
 * @param {Function} props.onCrosshairMove - Callback when crosshair moves
 * @param {Function} props.onVisibleRangeChange - Callback when visible range changes
 * @param {string} props.priceLineColor - Color for price lines
 * @param {number} props.priceLineValue - Value for price line
 */
const LightweightChart = forwardRef(({
  data = [],
  chartType = 'line',
  options = {},
  showVolume = false,
  volumeType = 'total',
  onCrosshairMove,
  onVisibleRangeChange,
  priceLineColor,
  priceLineValue,
  ...rest
}, ref) => {
  const chartContainerRef = useRef(null)
  const chartRef = useRef(null)
  const seriesRef = useRef(null)
  const volumeSeriesRef = useRef(null)
  const priceLineRef = useRef(null)

  // Default chart options with dark theme
  const defaultOptions = {
    width: options.width || chartContainerRef.current?.clientWidth || 800,
    height: options.height || 400,
    layout: {
      background: { type: ColorType.Solid, color: '#1A1B1E' },
      textColor: '#C1C2C5',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      fontSize: 12
    },
    grid: {
      vertLines: {
        color: '#373A40',
        style: 1, // Dotted
        visible: true
      },
      horzLines: {
        color: '#373A40',
        style: 1, // Dotted
        visible: true
      }
    },
    crosshair: {
      mode: 0, // Normal
      vertLine: {
        color: '#339af0',
        width: 1,
        style: 1, // Dotted
        labelBackgroundColor: '#1A1B1E'
      },
      horzLine: {
        color: '#339af0',
        width: 1,
        style: 1, // Dotted
        labelBackgroundColor: '#1A1B1E'
      }
    },
    rightPriceScale: {
      borderColor: '#373A40',
      scaleMargins: {
        top: 0.1,
        bottom: showVolume ? 0.4 : 0.1
      }
    },
    timeScale: {
      borderColor: '#373A40',
      timeVisible: true,
      secondsVisible: false,
      rightOffset: 12,
      barSpacing: 3,
      fixLeftEdge: false,
      lockVisibleTimeRangeOnResize: true
    },
    ...options
  }

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return

    // Create chart instance
    const chart = createChart(chartContainerRef.current, defaultOptions)
    chartRef.current = chart

    // Create series based on chart type
    let series
    if (chartType === 'candlestick') {
      series = chart.addCandlestickSeries({
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderVisible: false,
        wickUpColor: '#22c55e',
        wickDownColor: '#ef4444',
        priceFormat: {
          type: 'price',
          precision: 0,
          minMove: 1
        }
      })
    } else if (chartType === 'area') {
      series = chart.addAreaSeries({
        lineColor: '#339af0',
        topColor: '#339af040',
        bottomColor: '#339af000',
        lineWidth: 2,
        priceFormat: {
          type: 'price',
          precision: 0,
          minMove: 1
        }
      })
    } else {
      // Default to line
      series = chart.addLineSeries({
        color: '#339af0',
        lineWidth: 2,
        priceFormat: {
          type: 'price',
          precision: 0,
          minMove: 1
        }
      })
    }
    seriesRef.current = series

    // Add volume series if needed
    if (showVolume) {
      const volumeSeries = chart.addHistogramSeries({
        priceFormat: {
          type: 'volume'
        },
        priceScaleId: 'volume',
        scaleMargins: {
          top: 0.8,
          bottom: 0
        }
      })
      volumeSeriesRef.current = volumeSeries

      // Configure volume price scale
      chart.priceScale('volume').applyOptions({
        scaleMargins: {
          top: 0.8,
          bottom: 0
        }
      })
    }

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth
        })
      }
    }

    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
      }
    }
  }, [chartType, showVolume])

  // Update data when it changes
  useEffect(() => {
    if (!seriesRef.current || !data || data.length === 0) return

    let chartData
    if (chartType === 'candlestick') {
      chartData = transformToCandlestick(data)
    } else {
      chartData = transformToLine(data, 'high')
    }

    if (chartData && chartData.length > 0) {
      seriesRef.current.setData(chartData)
    }

    // Update volume data if needed
    if (showVolume && volumeSeriesRef.current) {
      const volumeData = transformToVolume(data, volumeType)
      if (volumeData && volumeData.length > 0) {
        volumeSeriesRef.current.setData(volumeData)
      }
    }
  }, [data, chartType, showVolume, volumeType])

  // Handle crosshair move
  useEffect(() => {
    if (!chartRef.current || !onCrosshairMove) return

    chartRef.current.subscribeCrosshairMove((param) => {
      if (onCrosshairMove) {
        onCrosshairMove(param)
      }
    })
  }, [onCrosshairMove])

  // Handle visible range change
  useEffect(() => {
    if (!chartRef.current || !onVisibleRangeChange) return

    chartRef.current.timeScale().subscribeVisibleTimeRangeChange((timeRange) => {
      if (onVisibleRangeChange) {
        onVisibleRangeChange(timeRange)
      }
    })
  }, [onVisibleRangeChange])

  // Add/update price line
  useEffect(() => {
    if (!seriesRef.current || priceLineValue == null) return

    // Remove existing price line
    if (priceLineRef.current) {
      seriesRef.current.removePriceLine(priceLineRef.current)
      priceLineRef.current = null
    }

    // Add new price line
    if (priceLineValue != null) {
      priceLineRef.current = seriesRef.current.createPriceLine({
        price: priceLineValue,
        color: priceLineColor || '#ffd700',
        lineWidth: 2,
        lineStyle: 2, // Dashed
        axisLabelVisible: true,
        title: ''
      })
    }
  }, [priceLineValue, priceLineColor])

  // Expose chart methods via ref
  useImperativeHandle(ref, () => ({
    chart: chartRef.current,
    series: seriesRef.current,
    volumeSeries: volumeSeriesRef.current,
    timeScale: () => chartRef.current?.timeScale(),
    priceScale: () => chartRef.current?.priceScale(),
    setVisibleRange: (range) => {
      if (chartRef.current) {
        chartRef.current.timeScale().setVisibleRange(range)
      }
    },
    resetData: () => {
      if (seriesRef.current) {
        seriesRef.current.setData([])
      }
      if (volumeSeriesRef.current) {
        volumeSeriesRef.current.setData([])
      }
    },
    download: (filename) => {
      if (chartRef.current) {
        // Lightweight Charts doesn't have built-in download, so we'll need to implement this
        // For now, return the chart container's HTML
        return chartContainerRef.current
      }
    }
  }))

  return (
    <Box
      ref={chartContainerRef}
      style={{
        width: '100%',
        height: options.height || 400,
        position: 'relative'
      }}
      {...rest}
    />
  )
})

LightweightChart.displayName = 'LightweightChart'

export default LightweightChart

