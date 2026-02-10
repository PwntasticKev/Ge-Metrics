import React, { lazy, Suspense } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Title, Text, Button, Group } from '@mantine/core'
import ThreeJsErrorBoundary from '../components/charts/threejs/ThreeJsErrorBoundary.jsx'
import { glassCard, fullViewport, contentOverlay } from '../components/charts/threejs/overlayStyles.js'

const ErrorBackground = lazy(() =>
  import('../components/charts/threejs/ErrorBackground.jsx')
)

export default function ErrorPage () {
  const navigate = useNavigate()

  return (
    <div style={fullViewport}>
      <ThreeJsErrorBoundary>
        <Suspense fallback={null}>
          <ErrorBackground />
        </Suspense>
      </ThreeJsErrorBoundary>

      <div style={contentOverlay}>
        <div style={glassCard}>
          <Title order={1} color="white" mb="sm" style={{ fontSize: 72, lineHeight: 1 }}>
            404
          </Title>
          <Title order={3} color="white" mb="xs">
            Oops!
          </Title>
          <Text color="dimmed" size="lg" mb="xl">
            Sorry, an unexpected error has occurred.
          </Text>
          <Group position="center" spacing="md">
            <Button component={Link} to="/login" variant="filled" color="blue" size="md">
              Go Home
            </Button>
            <Button variant="light" color="gray" size="md" onClick={() => navigate(-1)}>
              Go Back
            </Button>
          </Group>
        </div>
      </div>
    </div>
  )
}
