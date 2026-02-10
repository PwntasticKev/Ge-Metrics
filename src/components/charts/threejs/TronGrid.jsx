import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const GRID_VERTEX_SHADER = `
  varying vec2 vUv;
  varying float vFogFactor;

  void main() {
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float dist = length(mvPosition.xyz);
    vFogFactor = smoothstep(2.0, 15.0, dist);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const GRID_FRAGMENT_SHADER = `
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uOpacity;

  varying vec2 vUv;
  varying float vFogFactor;

  void main() {
    // Scroll UV for conveyor belt animation
    vec2 uv = vUv;
    uv.y += uTime * 0.02;

    // Grid lines
    float gridX = abs(fract(uv.x * 30.0 - 0.5) - 0.5);
    float gridY = abs(fract(uv.y * 30.0 - 0.5) - 0.5);

    float lineX = 1.0 - smoothstep(0.0, 0.03, gridX);
    float lineY = 1.0 - smoothstep(0.0, 0.03, gridY);
    float grid = max(lineX, lineY);

    // Major grid lines (every 5th line)
    float majorX = abs(fract(uv.x * 6.0 - 0.5) - 0.5);
    float majorY = abs(fract(uv.y * 6.0 - 0.5) - 0.5);
    float majorLineX = 1.0 - smoothstep(0.0, 0.02, majorX);
    float majorLineY = 1.0 - smoothstep(0.0, 0.02, majorY);
    float majorGrid = max(majorLineX, majorLineY);

    // Combine: minor grid at base opacity, major grid brighter
    float combined = grid * 0.5 + majorGrid * 0.7;

    // Edge fade (vignette)
    float edgeFade = smoothstep(0.0, 0.15, uv.x) * smoothstep(1.0, 0.85, uv.x);
    edgeFade *= smoothstep(0.0, 0.1, uv.y) * smoothstep(1.0, 0.9, uv.y);

    // Distance fog
    float alpha = combined * uOpacity * edgeFade * (1.0 - vFogFactor * 0.7);

    // Subtle glow pulse on major lines
    float pulse = 1.0 + sin(uTime * 0.5) * 0.1;
    alpha *= mix(1.0, pulse, majorGrid);

    gl_FragColor = vec4(uColor, alpha);
  }
`

const TronGrid = ({ color = '#1e4a7f' }) => {
  const meshRef = useRef()
  const materialRef = useRef()

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(color) },
    uOpacity: { value: 0.28 }
  }), [color])

  useFrame((_, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta
    }
  })

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2.4, 0, 0]} position={[0, -1.5, -2]}>
      <planeGeometry args={[20, 20, 1, 1]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={GRID_VERTEX_SHADER}
        fragmentShader={GRID_FRAGMENT_SHADER}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}

export default TronGrid
