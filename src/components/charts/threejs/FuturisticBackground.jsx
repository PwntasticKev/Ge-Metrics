import React, { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import TronGrid from './TronGrid.jsx'
import ParticleField from './ParticleField.jsx'

const FuturisticBackground = ({ chartData = [] }) => {
  // Compute volume data and price extremes for particles
  const { volumeData, priceExtremes } = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return { volumeData: [], priceExtremes: [] }
    }

    const volData = chartData.map(d => ({
      buyVolume: d.buyVolume || 0,
      sellVolume: d.sellVolume || 0
    }))

    // Find price min/max positions
    const extremes = []
    let minPrice = Infinity
    let maxPrice = -Infinity
    let minIdx = 0
    let maxIdx = 0

    chartData.forEach((d, i) => {
      const price = d.high || d.low || 0
      if (price > 0) {
        if (price < minPrice) { minPrice = price; minIdx = i }
        if (price > maxPrice) { maxPrice = price; maxIdx = i }
      }
    })

    const len = Math.max(chartData.length - 1, 1)
    if (minPrice < Infinity) {
      extremes.push({
        x: ((minIdx / len) * 10) - 5,
        isMax: false
      })
    }
    if (maxPrice > -Infinity) {
      extremes.push({
        x: ((maxIdx / len) * 10) - 5,
        isMax: true
      })
    }

    return { volumeData: volData, priceExtremes: extremes }
  }, [chartData])

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none'
      }}
    >
      <Canvas
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance'
        }}
        style={{ background: 'transparent' }}
      >
        <PerspectiveCamera makeDefault position={[0, 2, 5]} fov={60} />
        <TronGrid />
        <ParticleField volumeData={volumeData} priceExtremes={priceExtremes} />
      </Canvas>
    </div>
  )
}

export default FuturisticBackground
