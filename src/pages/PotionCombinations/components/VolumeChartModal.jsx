import React, { useState, useEffect } from 'react'
import { Modal, Center, Loader, Text } from '@mantine/core'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
} from 'chart.js'
import 'chartjs-adapter-date-fns'
import { getItemHistoryById } from '../../../api/rs-wiki-api'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
)

const VolumeChart = ({ items }) => {
  const [chartData, setChartData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null)
        console.log('🔍 Chart Debug - Items passed to chart:', items)

        const requests = []
        const itemsToFetch = []

        if (items.item1 && items.item1.id) {
          requests.push(getItemHistoryById('24h', items.item1.id))
          itemsToFetch.push({ item: items.item1, color: '#4BC0C0', dose: '(1)' })
        }
        if (items.item2 && items.item2.id) {
          requests.push(getItemHistoryById('24h', items.item2.id))
          itemsToFetch.push({ item: items.item2, color: '#FF6384', dose: '(2)' })
        }
        if (items.item3 && items.item3.id) {
          requests.push(getItemHistoryById('24h', items.item3.id))
          itemsToFetch.push({ item: items.item3, color: '#36A2EB', dose: '(3)' })
        }

        console.log('📊 Making API requests for items:', itemsToFetch.map(i => `${i.item.name} (ID: ${i.item.id})`))

        const responses = await Promise.all(requests)

        const datasets = []
        responses.forEach((response, index) => {
          const itemInfo = itemsToFetch[index]
          console.log(`📈 Processing response for ${itemInfo.item.name}:`, response.data)

          if (response && response.data && response.data.data) {
            const data = response.data.data.map(d => ({
              x: d.timestamp * 1000,
              y: (d.highPriceVolume || 0) + (d.lowPriceVolume || 0) // Total trading volume
            })).filter(d => d.y > 0) // Only include non-zero volume points

            console.log(`📊 Processed ${data.length} data points for ${itemInfo.item.name}`)

            if (data.length > 0) {
              datasets.push({
                label: `${itemInfo.item.name} ${itemInfo.dose} Volume`,
                data,
                borderColor: itemInfo.color,
                backgroundColor: `${itemInfo.color}30`,
                tension: 0.1,
                fill: false
              })
            }
          }
        })

        console.log('📊 Final datasets:', datasets)
        setChartData({ datasets })

        if (datasets.length === 0) {
          setError('No volume data available for any ingredients in the last 24 hours.')
        }
      } catch (error) {
        console.error('Failed to fetch volume history:', error)
        setError(`Failed to load chart data: ${error.message}`)
      } finally {
        setLoading(false)
      }
    }

    if (items && (items.item1 || items.item2 || items.item3)) {
      fetchData()
    } else {
      console.log('⚠️ No valid items provided to chart')
      setLoading(false)
      setError('No ingredient data available')
    }
  }, [items])

  if (loading) {
    return <Center style={{ height: 300 }}><Loader /></Center>
  }

  if (error) {
    return <Center style={{ height: 300 }}><Text color="red">{error}</Text></Center>
  }

  if (!chartData || chartData.datasets.length === 0) {
    return <Center style={{ height: 300 }}><Text>No volume data available for the last 24 hours.</Text></Center>
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20
        }
      },
      title: {
        display: true,
        text: 'Ingredient Trading Volume (Last 24 Hours)',
        font: { size: 16 }
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'hour',
          displayFormats: {
            hour: 'HH:mm'
          }
        },
        title: { display: true, text: 'Time' }
      },
      y: {
        title: { display: true, text: 'Trading Volume' },
        beginAtZero: true,
        ticks: {
          callback: function (value) {
            return value.toLocaleString()
          }
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    }
  }

  return (
    <div style={{ height: '400px' }}>
      <Line options={options} data={chartData} />
    </div>
  )
}

export const VolumeChartModal = ({ opened, onClose, recipe }) => {
  // Use the full item objects passed in the recipe
  const potionItems = {
    item1: recipe.item1,
    item2: recipe.item2,
    item3: recipe.item3
  }

  return (
    <Modal opened={opened} onClose={onClose} title={`${recipe.name} - Ingredient Volume`} size="xl">
      <VolumeChart items={potionItems} />
    </Modal>
  )
}
