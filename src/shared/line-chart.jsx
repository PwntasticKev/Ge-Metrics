import React, { useEffect, useState, useRef } from 'react'
import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  BarElement,
  Title,
  Tooltip
} from 'chart.js'
import annotationPlugin from 'chartjs-plugin-annotation'
import { Line } from 'react-chartjs-2'
import { getItemHistoryById } from '../api/rs-wiki-api.jsx'
import { getItemById, getRelativeTime } from '../utils/utils.jsx'
import { Badge, Group, Text, Loader, Center } from '@mantine/core'
import { IconClock, IconRefresh } from '@tabler/icons-react'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  annotationPlugin
)

export default function LineChart ({ id }) {
  const [item, setItem] = useState(null)
  const [timeframe, setTimeframe] = useState('24h')
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date())
  const [currentTime, setCurrentTime] = useState(new Date())
  const [historyData, setHistoryData] = useState([])
  const [historyStatus, setHistoryStatus] = useState('loading')
  const [isFetching, setIsFetching] = useState(false)
  const chartRef = useRef(null)

  useEffect(() => {
    setItem(getItemById(Number(id)))
  }, [id])

  useEffect(() => {
    if (!id) return

    const fetchData = async () => {
      setIsFetching(true)
      setHistoryStatus('loading')
      try {
        const result = await getItemHistoryById(timeframe, id)
        setHistoryData(result?.data?.data || [])
        setHistoryStatus('success')
        setLastUpdateTime(new Date())
      } catch (error) {
        console.error('Error fetching history data:', error)
        setHistoryStatus('error')
      } finally {
        setIsFetching(false)
      }
    }

    fetchData()
  }, [id, timeframe])

  useEffect(() => {
    const chart = chartRef.current

    return () => {
      if (chart) {
        chart.destroy()
      }
    }
  }, [])

  // Update current time every 30 seconds to refresh relative time
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 30000)
    return () => clearInterval(interval)
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
      annotation: {
        annotations: {
          updateLine: {
            type: 'line',
            xMin: historyData?.length ? historyData.length - 1 : 0,
            xMax: historyData?.length ? historyData.length - 1 : 0,
            borderColor: '#ffd43b',
            borderWidth: 2,
            borderDash: [5, 5],
            label: {
              display: true,
              content: 'Latest Update',
              position: 'start',
              backgroundColor: '#ffd43b',
              color: '#1a1b1e'
            }
          }
        }
      }
    },
    scales: {
      x: {
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

  if (historyStatus === 'loading') {
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

  const chartData = {
    labels: historyData.map(d => new Date(d.timestamp * 1000).toLocaleDateString()),
    datasets: [
      {
        type: 'line',
        label: 'High Price',
        data: historyData.map(d => d.avgHighPrice),
        borderColor: '#47d6ab',
        backgroundColor: 'rgba(71, 214, 171, 0.1)',
        fill: true,
        yAxisID: 'y'
      },
      {
        type: 'line',
        label: 'Low Price',
        data: historyData.map(d => d.avgLowPrice),
        borderColor: '#f76e6e',
        backgroundColor: 'rgba(247, 110, 110, 0.1)',
        fill: true,
        yAxisID: 'y'
      },
      {
        type: 'bar',
        label: 'Volume',
        data: historyData.map(d => d.highPriceVolume + d.lowPriceVolume),
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
              <Line ref={chartRef} options={options} data={chartData} />
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
