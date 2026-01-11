import { Box, Container, Modal, Group, Avatar, Title } from '@mantine/core'
import { useEffect, useState } from 'react'
import AdvancedChart from '../../components/charts/AdvancedChart.jsx'

export default function GraphModal ({ opened, setOpened, onClose, item, id, items }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (opened) {
      // Small delay to ensure modal is fully rendered before mounting chart
      const timer = setTimeout(() => setMounted(true), 100)
      return () => clearTimeout(timer)
    } else {
      setMounted(false)
    }
  }, [opened])

  const handleClose = () => {
    console.log('GraphModal: Attempting to close modal')
    if (setOpened) {
      setOpened(false)
    }
    if (onClose) {
      onClose()
    }
  }

  const imageUrl = item?.icon ? `https://oldschool.runescape.wiki/images/${item.icon}`.replace(/ /g, '_') : undefined
  const titleText = item?.name || 'Price History'
  const chartId = id || item?.id

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      centered
      size="90%"
      closeOnEscape={true}
      closeOnClickOutside={false}
      withCloseButton={true}
      trapFocus={true}
      keepMounted={false}
      lockScroll={false}
      overlayProps={{
        blur: 3
      }}
      transitionProps={{
        transition: 'pop',
        duration: 200
      }}
      title={null}
      styles={{
        body: {
          height: '80vh',
          overflow: 'hidden',
          padding: 0
        },
        root: {
            padding: 0
        }
      }}
    >
      <Box style={{ width: '100%', height: '100%', backgroundColor: '#1A1B1E' }}>
          {mounted && chartId ? (
            <div style={{ width: '100%', height: '100%' }}>
              <AdvancedChart itemId={chartId} item={item} items={items} height="100%" />
            </div>
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div>Loading chart...</div>
            </div>
          )}
      </Box>
    </Modal>
  )
}
