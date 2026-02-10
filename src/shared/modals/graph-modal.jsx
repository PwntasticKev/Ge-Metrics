import React, { lazy, Suspense, useState } from 'react'
import { Box, Modal } from '@mantine/core'
import AdvancedChart from '../../components/charts/AdvancedChart.jsx'
import ThreeJsErrorBoundary from '../../components/charts/threejs/ThreeJsErrorBoundary.jsx'
import { isThreeJsChartEnabled } from '../../config/featureFlags.js'

const FuturisticBackground = lazy(() =>
  import('../../components/charts/threejs/FuturisticBackground.jsx')
)

export default function GraphModal ({ opened, setOpened, onClose, item, id, items }) {
  const mounted = opened
  const useThreeJs = isThreeJsChartEnabled()
  const [threeChartData, setThreeChartData] = useState([])

  const handleClose = () => {
    if (setOpened) setOpened(false)
    if (onClose) onClose()
  }

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
      overlayProps={{ blur: 3 }}
      transitionProps={{ transition: 'pop', duration: 200 }}
      title={null}
      styles={{
        body: { height: '80vh', overflow: 'hidden', padding: 0 },
        root: { padding: 0 }
      }}
    >
      <Box style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: '#1A1B1E' }}>
        {mounted && chartId ? (
          <>
            {useThreeJs && (
              <ThreeJsErrorBoundary>
                <Suspense fallback={null}>
                  <FuturisticBackground chartData={threeChartData} />
                </Suspense>
              </ThreeJsErrorBoundary>
            )}
            <div style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%' }}>
              <AdvancedChart
                itemId={chartId}
                item={item}
                items={items}
                height="100%"
                transparentBg={useThreeJs}
                onChartDataReady={setThreeChartData}
              />
            </div>
          </>
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div>Loading chart...</div>
          </div>
        )}
      </Box>
    </Modal>
  )
}
