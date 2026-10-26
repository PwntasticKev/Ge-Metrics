import { useCallback, useRef, useState } from 'react'

const MIN_DRAG_PX = 6

// Drag-to-zoom for a Lightweight Charts instance: drag across the chart to
// zoom the time axis to the selection. Returns the brush (for drawing) and
// mouse handlers for the chart's wrapper element.
export default function useBrushZoom (chartRef) {
  const [brush, setBrush] = useState(null) // { x0, x1 } in wrapper px
  const brushRef = useRef(null)

  const update = next => {
    brushRef.current = next
    setBrush(next)
  }

  const localX = event => event.clientX - event.currentTarget.getBoundingClientRect().left

  const onMouseDown = useCallback(event => {
    if (event.button !== 0) return
    const x = localX(event)
    // Drags on the price axis rescale prices; only the plot area brushes.
    const plotWidth = chartRef.current?.timeScale().width()
    if (Number.isFinite(plotWidth) && x > plotWidth) return
    update({ x0: x, x1: x })
  }, [chartRef])

  const onMouseMove = useCallback(event => {
    if (!brushRef.current) return
    update({ ...brushRef.current, x1: localX(event) })
  }, [])

  const finish = useCallback(() => {
    const current = brushRef.current
    update(null)
    const timeScale = chartRef.current?.timeScale()
    if (!current || !timeScale || Math.abs(current.x1 - current.x0) < MIN_DRAG_PX) return
    const from = timeScale.coordinateToLogical(Math.min(current.x0, current.x1))
    const to = timeScale.coordinateToLogical(Math.max(current.x0, current.x1))
    if (from == null || to == null) return
    try {
      timeScale.setVisibleLogicalRange({ from, to })
    } catch (error) {
      console.error('useBrushZoom: could not zoom to selection', error)
    }
  }, [chartRef])

  const cancel = useCallback(() => update(null), [])

  return { brush, handlers: { onMouseDown, onMouseMove, onMouseUp: finish, onMouseLeave: cancel } }
}
