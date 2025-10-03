import React, { useEffect, useState } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip
} from 'chart.js'
import { getItemHistoryById } from '../../api/rs-wiki-api.jsx'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip
)

const MiniChart = ({ itemId, width = 150, height = 40 }) => {
  const [chartData, setChartData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const response = await getItemHistoryById('1h', itemId)
        if (response && response.data && response.data.data) {
          const data = response.data.data

          // Filter out null values and sort by timestamp
          const validData = data
            .filter(item => item.avgHighPrice !== null || item.avgLowPrice !== null)
            .sort((a, b) => a.timestamp - b.timestamp)
            .slice(-20) // Only show last 20 data points for mini chart

          if (validData.length > 0) {
            setChartData({
              labels: validData.map(() => ''), // Empty labels for mini chart
              datasets: [
                {
                  data: validData.map(item => item.avgHighPrice || item.avgLowPrice),
                  borderColor: '#e879f9', // Purple/pink color to match the design
                  backgroundColor: 'rgba(232, 121, 249, 0.1)',
                  borderWidth: 2,
                  fill: true,
                  pointRadius: 0,
                  pointHoverRadius: 3,
                  tension: 0.4
                }
              ]
            })
          } else {
            setChartData(null)
          }
        } else {
          setChartData(null)
        }
      } catch (error) {
        console.error('Error fetching mini chart data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (itemId) {
      fetchData()
    }
  }, [itemId])

  const options = {
    responsive: false,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false,
        callbacks: {
          title: () => '',
          label: (context) => {
            return new Intl.NumberFormat().format(context.parsed.y)
          }
        }
      }
    },
    scales: {
      x: {
        display: false
      },
      y: {
        display: false
      }
    },
    elements: {
      point: {
        radius: 0
      }
    },
    interaction: {
      intersect: false
    }
  }

  if (loading) {
    return (
      <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '10px', color: '#666' }}>Loading...</div>
      </div>
    )
  }

  if (!chartData) {
    return (
      <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '10px', color: '#666' }}>No data</div>
      </div>
    )
  }

  return (
    <div style={{ width, height }}>
      <Line data={chartData} options={options} width={width} height={height} />
    </div>
  )
}

export default MiniChart
