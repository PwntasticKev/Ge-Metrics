import React, { useEffect, useState } from 'react'
import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip
} from 'chart.js'
import annotationPlugin from 'chartjs-plugin-annotation'
import { Line } from 'react-chartjs-2'
import { useQuery } from 'react-query'
import { getItemHistoryById } from '../api/rs-wiki-api.jsx'
import { getItemById, getRelativeTime } from '../utils/utils.jsx'
import { Badge, Group, Text } from '@mantine/core'
import { IconClock, IconRefresh } from '@tabler/icons-react'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  annotationPlugin
)

export default function LineChart ({ id }) {
  const [item, setItem] = useState(null)
  const [timeframe, setTimeframe] = useState('1h')
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date())
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    setItem(getItemById(Number(id)))
  }, [id])

  const { data, status: historyStatus, refetch, isFetching } = useQuery({
    queryKey: ['historyData', timeframe, id],
    queryFn: async () => {
      console.log(`Fetching data for timeframe: ${timeframe}, item: ${id}`)
      const result = await getItemHistoryById(timeframe, id)
      console.log(`Received ${result?.data?.data?.length || 0} data points for ${timeframe}`)
      setLastUpdateTime(new Date())
      return result
    },
    enabled: !!id,
    staleTime: 30000, // 30 seconds - data becomes stale quickly
    cacheTime: 60000, // 1 minute - keep in cache for 1 minute
    refetchOnWindowFocus: false,
    onError: (error) => {
      console.error('Error fetching history data:', error)
    }
  })

  // Force refetch when timeframe changes
  useEffect(() => {
    if (id) {
      refetch()
    }
  }, [timeframe, refetch, id])

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
            xMin: data?.data?.data?.length ? data.data.data.length - 1 : 0,
            xMax: data?.data?.data?.length ? data.data.data.length - 1 : 0,
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
      }
    }
  }

  let chartData = null

  if (historyStatus === 'success' && data && data.data && data.data.data) {
    // Sort the data based on timestamp and filter out invalid entries
    const sortedData = data.data.data
      .filter(item => item.timestamp && (item.avgHighPrice !== null || item.avgLowPrice !== null))
      .sort((a, b) => a.timestamp - b.timestamp)

    console.log(`Processing ${sortedData.length} valid data points for ${timeframe}`)

    if (sortedData.length > 0) {
      // Add update markers for recent data points
      const updatePoints = sortedData.slice(-3).map((_, index) => ({
        pointBackgroundColor: index === 2 ? '#ffd43b' : 'rgba(255, 212, 59, 0.6)',
        pointBorderColor: '#ffd43b',
        pointRadius: index === 2 ? 6 : 4
      }))

      chartData = {
        labels: sortedData.map(item => {
          const date = new Date(item.timestamp * 1000)
          // Format based on timeframe
          if (timeframe === '5m') {
            return date.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            })
          } else if (timeframe === '1h') {
            return date.toLocaleTimeString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              hour12: false
            })
          } else if (timeframe === '6h') {
            return date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit'
            })
          } else { // 24h
            return date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric'
            })
          }
        }),
        datasets: [
          {
            label: 'Average High Price',
            data: sortedData.map(item => item.avgHighPrice),
            borderColor: '#e879f9',
            backgroundColor: 'rgba(232, 121, 249, 0.1)',
            fill: false,
            spanGaps: true,
            tension: 0.1,
            pointBackgroundColor: sortedData.map((_, index) =>
              index >= sortedData.length - 3 ? '#e879f9' : 'rgba(232, 121, 249, 0.5)'
            ),
            pointRadius: sortedData.map((_, index) =>
              index === sortedData.length - 1 ? 6 : index >= sortedData.length - 3 ? 4 : 2
            )
          },
          {
            label: 'Average Low Price',
            data: sortedData.map(item => item.avgLowPrice),
            borderColor: '#60a5fa',
            backgroundColor: 'rgba(96, 165, 250, 0.1)',
            fill: false,
            spanGaps: true,
            tension: 0.1,
            pointBackgroundColor: sortedData.map((_, index) =>
              index >= sortedData.length - 3 ? '#60a5fa' : 'rgba(96, 165, 250, 0.5)'
            ),
            pointRadius: sortedData.map((_, index) =>
              index === sortedData.length - 1 ? 6 : index >= sortedData.length - 3 ? 4 : 2
            )
          }
        ]
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

      {historyStatus === 'error' && (
        <div style={{ color: '#fa5252', textAlign: 'center', padding: '20px' }}>
          Error fetching data. Please try again.
        </div>
      )}

      {(historyStatus === 'loading' || isFetching) && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '300px',
          color: '#C1C2C5'
        }}>
          Loading {timeframe} data...
        </div>
      )}

      {historyStatus === 'success' && (
        <>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            {timeframeButtons.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => {
                  console.log(`Switching to timeframe: ${value}`)
                  setTimeframe(value)
                }}
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

          <div style={{ marginBottom: '10px', fontSize: '12px', color: '#868E96' }}>
            Current timeframe: {timeframe} | Data points: {data?.data?.data?.length || 0} |
            Valid points: {chartData?.labels?.length || 0} |
            <span style={{ color: '#ffd43b' }}> ● Recent updates highlighted</span>
          </div>

          {chartData
            ? (
            <div style={{ height: '400px' }}>
              <Line options={options} data={chartData} />
            </div>
              )
            : (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: '#C1C2C5'
            }}>
              No data available for this timeframe
            </div>
              )}
        </>
      )}
    </div>
  )
}
