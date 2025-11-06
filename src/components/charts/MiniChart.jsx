import React, { useEffect, useState } from 'react'
import Chart from 'react-apexcharts'
import { getItemHistoryById } from '../../api/rs-wiki-api.jsx'

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
            const seriesData = validData.map(item => [
              item.timestamp * 1000,
              item.avgHighPrice || item.avgLowPrice
            ])

            setChartData({
              series: [{
                name: '',
                data: seriesData
              }],
              options: {
                chart: {
                  type: 'line',
                  width: width,
                  height: height,
                  sparkline: {
                    enabled: true
                  },
                  toolbar: {
                    show: false
                  },
                  zoom: {
                    enabled: false
                  }
                },
                stroke: {
                  curve: 'smooth',
                  width: 1.6,
                  colors: ['#a78bfa']
                },
                fill: {
                  type: 'gradient',
                  gradient: {
                    shadeIntensity: 1,
                    opacityFrom: 0.35,
                    opacityTo: 0.05,
                    stops: [0, 100],
                    colorStops: [
                      { offset: 0, color: '#a78bfa', opacity: 0.2 },
                      { offset: 100, color: '#a78bfa', opacity: 0.05 }
                    ]
                  }
                },
                tooltip: {
                  theme: 'dark',
                  style: { fontSize: '11px' },
                  marker: { show: false },
                  y: {
                    title: { formatter: () => '' },
                    formatter: (value) => new Intl.NumberFormat().format(Math.round(value))
                  },
                  x: { format: 'MMM dd HH:mm' }
                },
                grid: { show: false },
                xaxis: {
                  type: 'datetime',
                  labels: { show: false },
                  axisBorder: { show: false },
                  axisTicks: { show: false }
                },
                yaxis: { labels: { show: false } }
              }
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
      <Chart
        options={chartData.options}
        series={chartData.series}
        type="line"
        width={width}
        height={height}
      />
    </div>
  )
}

export default MiniChart
