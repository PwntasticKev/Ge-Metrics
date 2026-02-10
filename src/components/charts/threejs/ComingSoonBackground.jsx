import React, { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import TronGrid from './TronGrid.jsx'
import { canvasOverlay } from './overlayStyles.js'

const PARTICLE_COUNT = 40

const OrbitingParticles = () => {
  const pointsRef = useRef()
  const offsetsRef = useRef(null)

  const { positions, colors, sizes } = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3)
    const col = new Float32Array(PARTICLE_COUNT * 3)
    const siz = new Float32Array(PARTICLE_COUNT)
    const offsets = new Float32Array(PARTICLE_COUNT * 3)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const radius = 2 + Math.random() * 5
      const angle = Math.random() * Math.PI * 2
      const height = (Math.random() - 0.5) * 4

      pos[i * 3] = Math.cos(angle) * radius
      pos[i * 3 + 1] = height
      pos[i * 3 + 2] = Math.sin(angle) * radius

      offsets[i * 3] = radius
      offsets[i * 3 + 1] = angle
      offsets[i * 3 + 2] = 0.1 + Math.random() * 0.3

      const t = Math.random()
      col[i * 3] = 0.1 + t * 0.3
      col[i * 3 + 1] = 0.7 + t * 0.3
      col[i * 3 + 2] = 0.8 + t * 0.2

      siz[i] = 2 + Math.random() * 3
    }

    offsetsRef.current = offsets
    return { positions: pos, colors: col, sizes: siz }
  }, [])

  useFrame((state) => {
    if (!pointsRef.current || !offsetsRef.current) return
    const posAttr = pointsRef.current.geometry.attributes.position
    const time = state.clock.elapsedTime
    const offsets = offsetsRef.current

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const radius = offsets[i * 3]
      const baseAngle = offsets[i * 3 + 1]
      const speed = offsets[i * 3 + 2]
      const angle = baseAngle + time * speed

      posAttr.array[i * 3] = Math.cos(angle) * radius
      posAttr.array[i * 3 + 2] = Math.sin(angle) * radius
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
        opacity={0.7}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

const ComingSoonBackground = () => (
  <div style={canvasOverlay}>
    <Canvas
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{ background: 'transparent' }}
    >
      <PerspectiveCamera makeDefault position={[0, 2, 5]} fov={60} />
      <TronGrid />
      <OrbitingParticles />
    </Canvas>
  </div>
)

export default ComingSoonBackground
