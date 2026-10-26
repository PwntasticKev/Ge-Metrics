import { memo } from 'react'
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg'
import type { ChartGeometry, Extreme } from '../../lib/chartGeometry'
import { gpShort } from '../../lib/format'
import type { UpdateMarker } from '../../lib/gameUpdates'
import type { Palette } from '../../theme/tokens'

export const STRIP_HEIGHT = 20
const LABEL_EDGE = 36
const LABEL_SIZE = 10

export interface PlacedMarker extends UpdateMarker {
  x: number
}

function ExtremeLabel ({ extreme, width, above, color }: { extreme: Extreme; width: number; above: boolean; color: string }) {
  const anchor = extreme.x < LABEL_EDGE ? 'start' : extreme.x > width - LABEL_EDGE ? 'end' : 'middle'
  return (
    <SvgText x={extreme.x} y={above ? extreme.y - 4 : extreme.y + LABEL_SIZE + 2} fontSize={LABEL_SIZE} fontWeight="600" fill={color} textAnchor={anchor}>
      {gpShort(extreme.value)}
    </SvgText>
  )
}

interface Props {
  chart: ChartGeometry
  markers: readonly PlacedMarker[]
  selected: number
  palette: Palette
}

// Everything that doesn't move while scrubbing: lines, volume, min/max and
// update markers. Memoised so dragging only redraws the crosshair.
export const ChartDrawing = memo(function ChartDrawing ({ chart, markers, selected, palette }: Props) {
  const { width, priceHeight, volumeHeight } = chart
  const stripY = priceHeight + volumeHeight + STRIP_HEIGHT / 2
  return (
    <Svg width={width} height={priceHeight + volumeHeight + STRIP_HEIGHT}>
      {markers.map((m, i) => (m.mentionsItem || i === selected) ? (
        <Line key={`l${m.title}`} x1={m.x} x2={m.x} y1={0} y2={priceHeight + volumeHeight} stroke={m.mentionsItem ? palette.brand : palette.muted} strokeOpacity={i === selected ? 0.9 : 0.45} strokeWidth={1} strokeDasharray="2 3" />
      ) : null)}
      <Line x1={0} x2={width} y1={priceHeight} y2={priceHeight} stroke={palette.rule} strokeWidth={1} />
      <Path d={chart.lowVolumePath} fill={palette.buyLine} fillOpacity={0.45} />
      <Path d={chart.highVolumePath} fill={palette.brand} fillOpacity={0.45} />
      <Path d={chart.lowPath} stroke={palette.buyLine} strokeWidth={1.6} fill="none" strokeLinejoin="round" />
      <Path d={chart.highPath} stroke={palette.brand} strokeWidth={1.8} fill="none" strokeLinejoin="round" />
      <Circle cx={chart.max.x} cy={chart.max.y} r={2.5} fill={palette.ink} />
      <Circle cx={chart.min.x} cy={chart.min.y} r={2.5} fill={palette.ink} />
      <ExtremeLabel extreme={chart.max} width={width} above color={palette.ink} />
      <ExtremeLabel extreme={chart.min} width={width} above={false} color={palette.ink} />
      {markers.map((m, i) => m.mentionsItem ? null : (
        <Circle key={`d${m.title}`} cx={m.x} cy={stripY} r={i === selected ? 4.5 : 2.5} fill={i === selected ? palette.ink : palette.muted} fillOpacity={i === selected ? 1 : 0.7} />
      ))}
      {markers.map((m, i) => m.mentionsItem ? (
        <Circle key={`e${m.title}`} cx={m.x} cy={stripY} r={i === selected ? 6 : 4.5} fill={palette.brand} stroke={palette.bg} strokeWidth={1.5} />
      ) : null)}
    </Svg>
  )
})
