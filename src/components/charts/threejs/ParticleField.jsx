import React, { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const MAX_PARTICLES = 200
const PARTICLE_LIFETIME = 2.5

const ParticleField = ({ volumeData = [], priceExtremes = [] }) => {
  const pointsRef = useRef()
  const lifetimesRef = useRef(new Float32Array(MAX_PARTICLES).fill(-1))
  const velocitiesRef = useRef(new Float32Array(MAX_PARTICLES * 3).fill(0))
  const spawnIndexRef = useRef(0)

  // Build spawn positions from data events
  const spawnEvents = useMemo(() => {
    const events = []

    // Volume spikes: volume > 2x average
    if (volumeData.length > 0) {
      const avgVol = volumeData.reduce((s, d) => s + (d.buyVolume + d.sellVolume), 0) / volumeData.length
      const threshold = avgVol * 2

      volumeData.forEach((d, i) => {
        const totalVol = d.buyVolume + d.sellVolume
        if (totalVol > threshold) {
          // Map data index to x position (-5 to 5)
          const x = ((i / Math.max(volumeData.length - 1, 1)) * 10) - 5
          const isBuyDominant = d.buyVolume > d.sellVolume
          events.push({
            x,
            color: isBuyDominant ? new THREE.Color('#3b82f6') : new THREE.Color('#f59e0b'),
            count: Math.min(Math.floor(totalVol / avgVol) * 5, 20),
            type: 'volume'
          })
        }
      })
    }

    // Price extremes
    priceExtremes.forEach(ext => {
      events.push({
        x: ext.x,
        color: new THREE.Color(ext.isMax ? '#f59e0b' : '#3b82f6'),
        count: 8,
        type: 'extreme'
      })
    })

    return events
  }, [volumeData, priceExtremes])

  // Initialize geometry
  const { positions, colors, sizes } = useMemo(() => {
    const pos = new Float32Array(MAX_PARTICLES * 3)
    const col = new Float32Array(MAX_PARTICLES * 3)
    const siz = new Float32Array(MAX_PARTICLES)

    for (let i = 0; i < MAX_PARTICLES; i++) {
      pos[i * 3] = 0
      pos[i * 3 + 1] = -10 // hidden below view
      pos[i * 3 + 2] = 0
      col[i * 3] = 0.23
      col[i * 3 + 1] = 0.51
      col[i * 3 + 2] = 0.96
      siz[i] = 0
    }

    return { positions: pos, colors: col, sizes: siz }
  }, [])

  // Spawn particles from events
  useEffect(() => {
    if (spawnEvents.length === 0) return

    const lifetimes = lifetimesRef.current
    const velocities = velocitiesRef.current

    spawnEvents.forEach(event => {
      for (let j = 0; j < event.count; j++) {
        const idx = spawnIndexRef.current % MAX_PARTICLES
        spawnIndexRef.current++

        positions[idx * 3] = event.x + (Math.random() - 0.5) * 1.5
        positions[idx * 3 + 1] = (Math.random() - 0.5) * 0.5
        positions[idx * 3 + 2] = (Math.random() - 0.5) * 2

        colors[idx * 3] = event.color.r
        colors[idx * 3 + 1] = event.color.g
        colors[idx * 3 + 2] = event.color.b

        sizes[idx] = 3 + Math.random() * 3

        velocities[idx * 3] = (Math.random() - 0.5) * 0.3
        velocities[idx * 3 + 1] = 0.3 + Math.random() * 0.5
        velocities[idx * 3 + 2] = (Math.random() - 0.5) * 0.2

        lifetimes[idx] = PARTICLE_LIFETIME
      }
    })

    if (pointsRef.current) {
      pointsRef.current.geometry.attributes.position.needsUpdate = true
      pointsRef.current.geometry.attributes.color.needsUpdate = true
      pointsRef.current.geometry.attributes.size.needsUpdate = true
    }
  }, [spawnEvents, positions, colors, sizes])

  useFrame((_, delta) => {
    if (!pointsRef.current) return

    const lifetimes = lifetimesRef.current
    const velocities = velocitiesRef.current
    const posAttr = pointsRef.current.geometry.attributes.position
    const sizeAttr = pointsRef.current.geometry.attributes.size
    let needsUpdate = false

    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (lifetimes[i] <= 0) continue

      lifetimes[i] -= delta
      needsUpdate = true

      if (lifetimes[i] <= 0) {
        // Hide expired particle
        posAttr.array[i * 3 + 1] = -10
        sizeAttr.array[i] = 0
        continue
      }

      // Update position
      posAttr.array[i * 3] += velocities[i * 3] * delta
      posAttr.array[i * 3 + 1] += velocities[i * 3 + 1] * delta
      posAttr.array[i * 3 + 2] += velocities[i * 3 + 2] * delta

      // Fade out via size
      const lifeFraction = lifetimes[i] / PARTICLE_LIFETIME
      sizeAttr.array[i] = sizes[i] * lifeFraction
    }

    if (needsUpdate) {
      posAttr.needsUpdate = true
      sizeAttr.needsUpdate = true
    }
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={MAX_PARTICLES}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={MAX_PARTICLES}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={MAX_PARTICLES}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

export default ParticleField
