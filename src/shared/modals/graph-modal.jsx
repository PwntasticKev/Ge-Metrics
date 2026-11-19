import { lazy, Suspense } from 'react'
import { Box, Modal } from '@mantine/core'

// The chart pulls in recharts (~370 KB). Load it only when a chart is opened,
// not with every table page that can open one.
const AdvancedChart = lazy(() => import('../../components/charts/AdvancedChart.jsx'))

const chartFallback = (
  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div>Loading chart...</div>
  </div>
)

export default function GraphModal ({ opened, setOpened, onClose, item, id, items }) {
  // Remove delay - mount chart immediately when modal opens
  const mounted = opened

  const handleClose = () => {
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
              <Suspense fallback={chartFallback}>
                <AdvancedChart itemId={chartId} item={item} items={items} height="100%" />
              </Suspense>
            </div>
          ) : chartFallback}
      </Box>
    </Modal>
  )
}
