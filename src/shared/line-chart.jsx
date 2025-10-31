import React, { useEffect, useState, useRef, useMemo } from 'react'
import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  BarElement,
  BarController,
  Title,
  Tooltip,
  TimeScale,
  Filler
} from 'chart.js'
import 'chartjs-adapter-date-fns'
import annotationPlugin from 'chartjs-plugin-annotation'
import zoomPlugin from 'chartjs-plugin-zoom'
import { Chart } from 'react-chartjs-2'
import { getItemHistoryById } from '../api/rs-wiki-api.jsx'
import { getItemById, getRelativeTime } from '../utils/utils.jsx'
import { Badge, Group, Text, Loader, Center, Button } from '@mantine/core'
import { IconClock, IconRefresh } from '@tabler/icons-react'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  BarController,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  annotationPlugin,
  zoomPlugin,
  Filler
)

export default function LineChart ({ id, items }) {
  const [timeframe, setTimeframe] = useState('5m')
  const [historyData, setHistoryData] = useState(null) // Initialize with null
  const [historyStatus, setHistoryStatus] = useState('idle') // set to idle
  const [isFetching, setIsFetching] = useState(false)
  const [lastUpdateTime, setLastUpdateTime] = useState(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [gameUpdates, setGameUpdates] = useState([])
  const chartRef = useRef(null)

  const item = useMemo(() => getItemById(id, items) || {}, [id, items])

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
        // Check if the data is an object with 'data' property or direct array
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
    
    // Add timeout fallback to prevent infinite loading
    const timeout = setTimeout(() => {
      if (historyStatus === 'loading') {
        console.warn('Chart data fetch timed out')
        setHistoryStatus('error')
        setIsFetching(false)
      }
    }, 10000) // 10 second timeout
    
    return () => clearTimeout(timeout)
  }, [id, timeframe])

  // Update current time every second to refresh relative time
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#C1C2C5'
        }
      },
      title: {
        display: true,
        text: `${item?.name || 'Loading...'}: ${timeframe} ${isFetching ? '(Loading...)' : ''}`,
        color: '#C1C2C5'
      },
      zoom: {
        pan: {
          enabled: true,
          mode: 'x'
        },
        zoom: {
          wheel: {
            enabled: true
          },
          pinch: {
            enabled: true
          },
          mode: 'x'
        }
      },
      annotation: {
        annotations: {}
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'day'
        },
        grid: {
          color: '#373A40'
        },
        ticks: {
          color: '#C1C2C5',
          maxTicksLimit: 15
        }
      },
      y: {
        grid: {
          color: '#373A40'
        },
        ticks: {
          color: '#C1C2C5',
          callback: function (value) {
            return new Intl.NumberFormat().format(value)
          }
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        grid: {
          drawOnChartArea: false
        },
        ticks: {
          color: '#868E96'
        }
      }
    }
  }

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

  const chartData = {
    datasets: [
      {
        type: 'line',
        label: 'High Price',
        data: historyData.map(d => ({ x: d.timestamp * 1000, y: d.avgHighPrice })),
        borderColor: '#47d6ab',
        backgroundColor: 'rgba(71, 214, 171, 0.1)',
        fill: true,
        yAxisID: 'y'
      },
      {
        type: 'line',
        label: 'Low Price',
        data: historyData.map(d => ({ x: d.timestamp * 1000, y: d.avgLowPrice })),
        borderColor: '#f76e6e',
        backgroundColor: 'rgba(247, 110, 110, 0.1)',
        fill: true,
        yAxisID: 'y'
      },
      {
        type: 'bar',
        label: 'Volume',
        data: historyData.map(d => ({ x: d.timestamp * 1000, y: d.highPriceVolume + d.lowPriceVolume })),
        backgroundColor: 'rgba(134, 142, 150, 0.5)',
        yAxisID: 'y1'
      }
    ]
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

      {historyData && historyData.length > 0
        ? (
          <div style={{ height: '400px' }}>
              <Chart ref={chartRef} type="line" options={options} data={chartData} />
          </div>
          )
        : (
          <Center style={{ height: 400 }}>
              <Text>No historical data available for this timeframe.</Text>
          </Center>
          )}
    </div>
  )
}
