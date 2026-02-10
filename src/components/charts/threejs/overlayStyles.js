export const glassCard = {
  background: 'rgba(26, 27, 30, 0.85)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: 16,
  padding: 48,
  textAlign: 'center',
  maxWidth: 480
}

export const fullViewport = {
  position: 'relative',
  width: '100vw',
  height: '100vh',
  overflow: 'hidden',
  backgroundColor: '#1A1B1E'
}

export const canvasOverlay = {
  position: 'absolute',
  inset: 0,
  zIndex: 0,
  pointerEvents: 'none'
}

export const contentOverlay = {
  position: 'relative',
  zIndex: 1,
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}
