import React, { useEffect, useState, useMemo, useRef } from 'react'
import Chart from 'react-apexcharts'
import { getItemHistoryById } from '../api/rs-wiki-api.jsx'
import { getItemById, getRelativeTime } from '../utils/utils.jsx'
import { Badge, Group, Text, Loader, Center, Button } from '@mantine/core'
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
      const result = await getItemHistoryById(timeframe, id)
      console.log('LineChart: API result:', result)
      
      if (result && result.success && result.data) {
        const histData = result.data.data || result.data
        console.log('LineChart: Processed data:', histData)
        
        if (Array.isArray(histData) && histData.length > 0) {
          setHistoryData(histData)
          setHistoryStatus('success')
          setLastUpdateTime(new Date())
          console.log('LineChart: Data loaded successfully, count:', histData.length)
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
      console.error('LineChart: Error fetching history data:', error)
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

    const timestamps = historyData.map(d => d.timestamp * 1000)
    const minTime = Math.min(...timestamps)
    const maxTime = Math.max(...timestamps)
    
    // Filter blogs to only show those within the chart's date range
    const filteredBlogs = blogs.filter(blog => {
      const blogDate = new Date(blog.date).getTime()
      return blogDate >= minTime && blogDate <= maxTime
    })

    return {
      chart: {
        id: `chart-${id}-${timeframe}`,
        type: 'line',
        height: 400,
        zoom: {
          enabled: true,
          type: 'x',
          autoScaleYaxis: false,
          zoomedArea: {
            fill: {
              color: '#90CAF9',
              opacity: 0.4
            },
            stroke: {
              color: '#0D47A1',
              opacity: 0.4,
              width: 1
            }
          }
        },
        pan: {
          enabled: true,
          type: 'x'
        },
        toolbar: {
          show: true,
          offsetX: 0,
          offsetY: 0,
          tools: {
            download: true,
            selection: true,
            zoom: true,
            zoomin: true,
            zoomout: true,
            pan: true,
            reset: true
          },
          export: {
            csv: {
              filename: `${item?.name || 'chart'}-${timeframe}`,
              columnDelimiter: ',',
              headerCategory: 'Time',
              headerValue: 'Value'
            },
            svg: {
              filename: `${item?.name || 'chart'}-${timeframe}`
            },
            png: {
              filename: `${item?.name || 'chart'}-${timeframe}`
            }
          }
        },
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 800
        },
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        curve: 'smooth',
        width: [3, 3, 0] // Increased line width for better visibility in dark mode
      },
      colors: ['#47d6ab', '#f76e6e', '#a0a0a0'], // Brighter colors for better contrast
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.8,
          opacityTo: 0.4,
          stops: [0, 100]
        }
      },
      markers: {
        size: 0,
        hover: {
          size: 5
        }
      },
      grid: {
        borderColor: '#4d5156',
        strokeDashArray: 3,
        xaxis: {
          lines: {
            show: true,
            strokeDashArray: 3,
            opacity: 0.3
          }
        },
        yaxis: {
          lines: {
            show: true,
            strokeDashArray: 3,
            opacity: 0.3
          }
        }
      },
      xaxis: {
        type: 'datetime',
        labels: {
          style: {
            colors: '#C1C2C5',
            fontSize: '12px'
          },
          format: 'MMM dd HH:mm'
        },
        axisBorder: {
          color: '#373A40'
        },
        axisTicks: {
          color: '#373A40'
        }
      },
      yaxis: [
        {
          title: {
            text: 'Price (GP)',
            style: {
              color: '#C1C2C5',
              fontSize: '12px'
            }
          },
          labels: {
            style: {
              colors: '#C1C2C5'
            },
            formatter: (value) => {
              return new Intl.NumberFormat().format(Math.round(value))
            }
          },
          opposite: false
        },
        {
          title: {
            text: 'Volume',
            style: {
              color: '#868E96',
              fontSize: '12px'
            }
          },
          labels: {
            style: {
              colors: '#868E96'
            },
            formatter: (value) => {
              return new Intl.NumberFormat().format(Math.round(value))
            }
          },
          opposite: true
        }
      ],
      tooltip: {
        shared: true,
        intersect: false,
        theme: 'dark',
        style: {
          fontSize: '12px'
        },
        x: {
          format: 'MMM dd, yyyy HH:mm'
        },
        y: {
          formatter: (value) => {
            return new Intl.NumberFormat().format(Math.round(value))
          }
        },
        marker: {
          show: true
        },
        custom: function({ series, seriesIndex, dataPointIndex, w }) {
          // Get the blog data for this timestamp
          const dataPoint = w.globals.series[0] && w.globals.series[0][dataPointIndex]
          if (!dataPoint || dataPoint.length < 1) return ''
          
          const timestamp = dataPoint[0]
          // Use blogs from closure - they're available in the component scope
          const blogMarkers = blogs.filter(blog => {
            const blogDate = new Date(blog.date).getTime()
            // Check if blog date is within 1 day of this point
            return Math.abs(blogDate - timestamp) < 24 * 60 * 60 * 1000
          })
          
          let html = '<div style="padding: 10px;">'
          
          // Add price/volume info
          html += '<div>'
          series.forEach((s, i) => {
            const value = s[dataPointIndex]
            if (value !== null && value !== undefined) {
              const seriesName = w.globals.seriesNames[i]
              html += `<div><strong>${seriesName}:</strong> ${new Intl.NumberFormat().format(Math.round(value))}</div>`
            }
          })
          html += '</div>'
          
          // Add blog markers if any
          if (blogMarkers.length > 0) {
            html += '<div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #4d5156;">'
            html += '<div style="font-weight: bold; margin-bottom: 5px;">Game Updates:</div>'
            blogMarkers.forEach(blog => {
              const blogDate = new Date(blog.date)
              html += `<div style="margin-bottom: 5px;">`
              html += `<a href="${blog.url}" target="_blank" rel="noopener noreferrer" style="color: #339af0; text-decoration: underline;">`
              html += `${blog.title}`
              html += `</a>`
              html += `<div style="font-size: 10px; color: #868E96;">${blogDate.toLocaleDateString()}</div>`
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
          borderColor: '#868E96',
          strokeDashArray: 4,
          borderWidth: 2,
          opacity: 0.7,
          label: {
            borderColor: '#868E96',
            style: {
              color: '#fff',
              background: '#868E96',
              fontSize: '10px',
              padding: {
                left: 5,
                right: 5,
                top: 2,
                bottom: 2
              }
            },
            text: 'Update',
            orientation: 'vertical',
            offsetY: 0,
            offsetX: 0
          }
        }))
      },
      legend: {
        position: 'top',
        horizontalAlign: 'right',
        floating: false,
        fontSize: '12px',
        fontFamily: 'Inter, system-ui',
        fontWeight: 500,
        offsetX: 0,
        offsetY: 0,
        labels: {
          colors: '#C1C2C5',
          useSeriesColors: false
        },
        markers: {
          width: 12,
          height: 12,
          strokeWidth: 0,
          strokeColor: '#fff',
          radius: 12,
          customHTML: undefined,
          onClick: undefined,
          offsetX: 0,
          offsetY: 0
        }
      },
      title: {
        text: `${item?.name || 'Loading...'}: ${timeframe}`,
        align: 'left',
        style: {
          fontSize: '16px',
          fontWeight: 600,
          color: '#C1C2C5',
          fontFamily: 'Inter, system-ui'
        }
      },
      subtitle: {
        text: isFetching ? 'Updating...' : '',
        align: 'left',
        style: {
          fontSize: '12px',
          color: '#868E96'
        }
      }
    }
  }, [id, timeframe, item?.name, historyData, isFetching, blogs])

  const chartSeries = useMemo(() => {
    if (!historyData || historyData.length === 0) return []

    return [
      {
        name: 'High Price',
        type: 'line',
        data: historyData.map(d => [d.timestamp * 1000, d.avgHighPrice]).filter(d => d[1] !== null)
      },
      {
        name: 'Low Price',
        type: 'line',
        data: historyData.map(d => [d.timestamp * 1000, d.avgLowPrice]).filter(d => d[1] !== null)
      },
      {
        name: 'Volume',
        type: 'column',
        data: historyData.map(d => [d.timestamp * 1000, d.highPriceVolume + d.lowPriceVolume]),
        yAxisIndex: 1
      }
    ]
  }, [historyData])

  // Update chart options to support mixed chart types
  const updatedChartOptions = useMemo(() => {
    if (!chartOptions) return null
    
    return {
      ...chartOptions,
      chart: {
        ...chartOptions.chart,
        type: 'line'
      },
      plotOptions: {
        bar: {
          columnWidth: '60%',
          colors: {
            ranges: [{
              from: 0,
              to: 1000000,
              color: '#a0a0a0'
            }]
          }
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

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
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

      {updatedChartOptions && chartSeries.length > 0 && (
        <Chart
          ref={chartRef}
          options={updatedChartOptions}
          series={chartSeries}
          type="line"
          height={400}
        />
      )}
    </div>
  )
}
