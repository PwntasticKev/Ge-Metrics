import React, { useState, useEffect } from 'react'
import { Text, Group, Box } from '@mantine/core'

const STORAGE_KEY = 'ge_metrics_chart_hints_seen'

const InteractionHints = () => {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY)
    if (!seen) {
      setVisible(true)
      const timer = setTimeout(() => {
        dismiss()
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [])

  const dismiss = () => {
    setVisible(false)
    localStorage.setItem(STORAGE_KEY, 'true')
  }

  if (!visible) return null

  return (
    <Box
      onClick={dismiss}
      sx={{
        position: 'absolute',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(2px)',
        cursor: 'pointer',
        animation: 'fadeIn 300ms ease'
      }}
    >
      <Group
        spacing="xl"
        sx={{
          padding: '12px 24px',
          borderRadius: 8,
          backgroundColor: 'rgba(30,30,35,0.9)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        <Text size="sm" color="dimmed">
          <Text span weight={600} color="white">Scroll</Text> to pan
        </Text>
        <Text size="sm" color="dimmed">
          <Text span weight={600} color="white">Ctrl+Scroll</Text> to zoom
        </Text>
        <Text size="sm" color="dimmed">
          <Text span weight={600} color="white">Click+Drag</Text> to select range
        </Text>
      </Group>
    </Box>
  )
}

export default InteractionHints
