import React, { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import TronGrid from './TronGrid.jsx'
import { canvasOverlay } from './overlayStyles.js'

const PARTICLE_COUNT = 30

const FloatingParticles = () => {
  const pointsRef = useRef()

  const { positions, colors, sizes } = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3)
    const col = new Float32Array(PARTICLE_COUNT * 3)
    const siz = new Float32Array(PARTICLE_COUNT)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 12
      pos[i * 3 + 1] = (Math.random() - 0.5) * 6
      pos[i * 3 + 2] = (Math.random() - 0.5) * 4

      const t = Math.random()
      col[i * 3] = 0.5 + t * 0.5
      col[i * 3 + 1] = 0.1 + t * 0.2
      col[i * 3 + 2] = 0.1

      siz[i] = 2 + Math.random() * 3
    }

    return { positions: pos, colors: col, sizes: siz }
  }, [])

  useFrame((_, delta) => {
    if (!pointsRef.current) return
    const posAttr = pointsRef.current.geometry.attributes.position

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      posAttr.array[i * 3 + 1] += delta * 0.15

      if (posAttr.array[i * 3 + 1] > 4) {
        posAttr.array[i * 3 + 1] = -3
        posAttr.array[i * 3] = (Math.random() - 0.5) * 12
      }
    }

    posAttr.needsUpdate = true
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={PARTICLE_COUNT} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={PARTICLE_COUNT} array={colors} itemSize={3} />
        <bufferAttribute attach="attributes-size" count={PARTICLE_COUNT} array={sizes} itemSize={1} />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        transparent
        opacity={0.6}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

const ErrorBackground = () => (
  <div style={canvasOverlay}>
    <Canvas
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{ background: 'transparent' }}
    >
      <PerspectiveCamera makeDefault position={[0, 2, 5]} fov={60} />
      <TronGrid color="#7f1e1e" />
      <FloatingParticles />
    </Canvas>
  </div>
)

export default ErrorBackground
