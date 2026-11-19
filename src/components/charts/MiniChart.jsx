import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Tooltip } from '@mantine/core'
import { loadSparkline } from './sparklineData.js'

// Row sparkline: last ~20 hourly high prices as a plain SVG line.
// No chart library, and history is only fetched once the row scrolls into view.
const STROKE = '#f59e0b'
const PAD = 2

function useInView (ref) {
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const node = ref.current
    if (!node || inView) return
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) {
        setInView(true)
        observer.disconnect()
      }
    }, { rootMargin: '200px' })
    observer.observe(node)
    return () => observer.disconnect()
  }, [ref, inView])
  return inView
}

export function toSparkPoints (values, width, height) {
  if (values.length < 2) return []
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const stepX = (width - PAD * 2) / (values.length - 1)
  return values.map((v, i) => ({
    x: PAD + i * stepX,
    y: PAD + (height - PAD * 2) * (1 - (v - min) / span),
    value: v
  }))
}

const placeholder = (width, height, text) => (
  <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ fontSize: '8px', color: '#666' }}>{text}</div>
  </div>
)

const MiniChart = ({ itemId, width = 120, height = 40, currentPrice }) => {
  const containerRef = useRef(null)
  const inView = useInView(containerRef)
  const [state, setState] = useState({ status: 'idle', values: [] })
  const [hoverIndex, setHoverIndex] = useState(null)

  useEffect(() => {
    if (!inView || !itemId) return
    let cancelled = false
    setState(s => ({ ...s, status: 'loading' }))
    loadSparkline(itemId)
      .then(values => { if (!cancelled) setState({ status: 'done', values }) })
      .catch(() => { if (!cancelled) setState({ status: 'done', values: [] }) })
    return () => { cancelled = true }
  }, [inView, itemId])

  const points = useMemo(() => toSparkPoints(state.values, width, height), [state.values, width, height])

  if (!itemId) return placeholder(width, height, 'No data')
  if (state.status !== 'done') return <div ref={containerRef}>{placeholder(width, height, '...')}</div>
  if (points.length === 0) return placeholder(width, height, 'No data')

  const hovered = hoverIndex === null ? null : points[hoverIndex]
  const displayPrice = hovered?.value || currentPrice || points[points.length - 1].value

  const handleMove = event => {
    const rect = event.currentTarget.getBoundingClientRect()
    const ratio = (event.clientX - rect.left) / rect.width
    setHoverIndex(Math.max(0, Math.min(points.length - 1, Math.round(ratio * (points.length - 1)))))
  }

  return (
    <Tooltip
      label={displayPrice ? `${displayPrice.toLocaleString()} GP` : 'No price data'}
      withArrow
      position="top"
      openDelay={200}
    >
      <svg
        width={width}
        height={height}
        style={{ display: 'block', cursor: 'crosshair' }}
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
        role="img"
        aria-label="Recent price trend"
      >
        <polyline
          points={points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
          fill="none"
          stroke={STROKE}
          strokeWidth="1"
          strokeLinejoin="round"
        />
        {hovered && <circle cx={hovered.x} cy={hovered.y} r="2" fill={STROKE} />}
      </svg>
    </Tooltip>
  )
}

export default MiniChart
