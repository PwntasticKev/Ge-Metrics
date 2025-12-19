import React from 'react'
import { Group, Button, Tooltip, Divider } from '@mantine/core'
import {
  IconTrendingUp,
  IconMinus,
  IconSquare,
  IconX,
  IconZoomIn,
  IconZoomOut,
  IconRefresh,
  IconDownload
} from '@tabler/icons-react'

/**
 * ChartToolbar - Toolbar component for chart drawing tools and controls
 * 
 * @param {Object} props
 * @param {string} props.activeTool - Currently active drawing tool ('trend', 'horizontal', 'rectangle', null)
 * @param {Function} props.onToolSelect - Callback when a tool is selected
 * @param {Function} props.onZoomIn - Callback for zoom in
 * @param {Function} props.onZoomOut - Callback for zoom out
 * @param {Function} props.onReset - Callback for reset zoom
 * @param {Function} props.onDownload - Callback for download
 * @param {boolean} props.showDrawingTools - Whether to show drawing tools section
 */
export default function ChartToolbar({
  activeTool = null,
  onToolSelect,
  onZoomIn,
  onZoomOut,
  onReset,
  onDownload,
  showDrawingTools = true
}) {
  const tools = [
    { id: 'trend', icon: IconTrendingUp, label: 'Trend Line' },
    { id: 'horizontal', icon: IconMinus, label: 'Horizontal Line' },
    { id: 'rectangle', icon: IconSquare, label: 'Rectangle' }
  ]

  return (
    <Group spacing="xs" p="xs" style={{ borderBottom: '1px solid #373A40' }}>
      {showDrawingTools && (
        <>
          <Group spacing="xs">
            {tools.map(tool => {
              const Icon = tool.icon
              const isActive = activeTool === tool.id
              
              return (
                <Tooltip key={tool.id} label={tool.label} withArrow>
                  <Button
                    variant={isActive ? 'filled' : 'subtle'}
                    color={isActive ? 'blue' : 'gray'}
                    size="xs"
                    onClick={() => onToolSelect?.(isActive ? null : tool.id)}
                    leftIcon={<Icon size={16} />}
                    styles={{
                      root: {
                        backgroundColor: isActive ? '#339af0' : 'transparent',
                        '&:hover': {
                          backgroundColor: isActive ? '#228be6' : '#25262b'
                        }
                      }
                    }}
                  />
                </Tooltip>
              )
            })}
          </Group>
          <Divider orientation="vertical" />
        </>
      )}

      <Group spacing="xs">
        <Tooltip label="Zoom In" withArrow>
          <Button
            variant="subtle"
            size="xs"
            onClick={onZoomIn}
            leftIcon={<IconZoomIn size={16} />}
          />
        </Tooltip>
        <Tooltip label="Zoom Out" withArrow>
          <Button
            variant="subtle"
            size="xs"
            onClick={onZoomOut}
            leftIcon={<IconZoomOut size={16} />}
          />
        </Tooltip>
        <Tooltip label="Reset Zoom" withArrow>
          <Button
            variant="subtle"
            size="xs"
            onClick={onReset}
            leftIcon={<IconRefresh size={16} />}
          />
        </Tooltip>
        <Divider orientation="vertical" />
        <Tooltip label="Download Chart" withArrow>
          <Button
            variant="subtle"
            size="xs"
            onClick={onDownload}
            leftIcon={<IconDownload size={16} />}
          />
        </Tooltip>
      </Group>
    </Group>
  )
}

