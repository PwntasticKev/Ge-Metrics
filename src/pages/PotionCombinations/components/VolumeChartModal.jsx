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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [history1, history2, history3] = await Promise.all([
          items.item1 ? getItemHistoryById('1h', items.item1.id) : Promise.resolve(null),
          items.item2 ? getItemHistoryById('1h', items.item2.id) : Promise.resolve(null),
          items.item3 ? getItemHistoryById('1h', items.item3.id) : Promise.resolve(null)
        ])

        const datasets = []
        const processHistory = (history, label, color) => {
          if (history && history.data.data) {
            const data = history.data.data.map(d => ({
              x: d.timestamp * 1000,
              y: d.tradingVolume
            }))
            datasets.push({
              label: `${label} Volume`,
              data,
              borderColor: color,
              backgroundColor: `${color}80`,
              tension: 0.1
            })
          }
        }

        processHistory(history1, items.item1.name, '#4BC0C0')
        processHistory(history2, items.item2.name, '#FF6384')
        processHistory(history3, items.item3.name, '#36A2EB')

        setChartData({ datasets })
      } catch (error) {
        console.error('Failed to fetch volume history', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [items])

  if (loading) {
    return <Center style={{ height: 300 }}><Loader /></Center>
  }

  if (!chartData || chartData.datasets.length === 0) {
    return <Center style={{ height: 300 }}><Text>No volume data available for the last 24 hours.</Text></Center>
  }

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Ingredient Trading Volume (Last 24 Hours)' }
    },
    scales: {
      x: {
        type: 'time',
        time: { unit: 'hour' },
        title: { display: true, text: 'Time' }
      },
      y: {
        title: { display: true, text: 'Volume' },
        beginAtZero: true
      }
    }
  }

  return <Line options={options} data={chartData} />
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
