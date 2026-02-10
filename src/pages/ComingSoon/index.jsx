import React, { lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { Title, Text, Button } from '@mantine/core'
import ThreeJsErrorBoundary from '../../components/charts/threejs/ThreeJsErrorBoundary.jsx'
import { glassCard, fullViewport, contentOverlay } from '../../components/charts/threejs/overlayStyles.js'

const ComingSoonBackground = lazy(() =>
  import('../../components/charts/threejs/ComingSoonBackground.jsx')
)

const pulseKeyframes = `
@keyframes comingSoonPulse {
  0%, 80%, 100% { opacity: 0.3; }
  40% { opacity: 1; }
}
`

const ComingSoon = () => (
  <div style={fullViewport}>
    <style>{pulseKeyframes}</style>

    <ThreeJsErrorBoundary>
      <Suspense fallback={null}>
        <ComingSoonBackground />
      </Suspense>
    </ThreeJsErrorBoundary>

    <div style={contentOverlay}>
      <div style={glassCard}>
        <Title order={1} color="white" mb="xs">
          Coming Soon
        </Title>
        <Text color="dimmed" size="lg" mb="sm">
          We're building something awesome
        </Text>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
          {[0, 1, 2].map(i => (
            <span
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#22d3ee',
                animation: `comingSoonPulse 1.4s ease-in-out ${i * 0.2}s infinite`
              }}
            />
          ))}
        </div>
        <Button component={Link} to="/all-items" variant="filled" color="blue" size="md">
          Go Back Home
        </Button>
      </div>
    </div>
  </div>
)

export default ComingSoon
