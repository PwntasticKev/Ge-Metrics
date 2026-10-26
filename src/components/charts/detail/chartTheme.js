// Colors shared by the chart overlays. Both charts draw on a fixed dark
// canvas (#1A1B1E) in either site theme, so overlays use fixed dark styles.

export const CHART_COLORS = Object.freeze({
  sell: '#f59e0b',
  buy: '#3b82f6',
  text: '#C1C2C5',
  dimmed: '#909296',
  strong: '#FFFFFF',
  canvas: '#1A1B1E',
  brush: '#3B82F6'
})

export const overlayCardStyle = Object.freeze({
  background: 'rgba(26,27,30,0.96)',
  border: '1px solid rgba(59, 130, 246, 0.4)',
  borderRadius: 8,
  padding: '8px 10px',
  boxShadow: '0 8px 25px rgba(0,0,0,0.4)',
  color: CHART_COLORS.text
})
