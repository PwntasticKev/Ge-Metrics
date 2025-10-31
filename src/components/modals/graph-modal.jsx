import { Box, Container, Modal, CloseButton } from '@mantine/core'
import LineChart from '../../shared/line-chart.jsx'
import Draggable from 'react-draggable'
import { useRef } from 'react'

export default function GraphModal ({ opened, setOpened, id, items }) {
  const nodeRef = useRef(null)
  
  const handleClose = () => {
    if (setOpened) {
      setOpened(false)
    }
  }
  
  return (
    <Draggable handle=".draggable-handle" nodeRef={nodeRef}>
      <div ref={nodeRef}>
        <Modal
          opened={opened}
          onClose={handleClose}
          centered
          size="95%"
          withinPortal={true}
          closeOnEscape={true}
          closeOnClickOutside={true}
          trapFocus={false}
          zIndex={1000}
          withCloseButton={false}
          overlayProps={{
            blur: 3
          }}
          transitionProps={{
            transition: 'pop',
            duration: 200
          }}
          styles={{
            header: { cursor: 'move', userSelect: 'none' },
            body: { position: 'relative' }
          }}
          classNames={{
            header: 'draggable-handle'
          }}
        >
          <CloseButton
            onClick={handleClose}
            style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 1001 }}
          />
          <Box style={{ resize: 'both', overflow: 'auto', padding: '1rem', minHeight: '70vh' }}>
            <Container px={0}>
              <LineChart id={id} items={items} />
            </Container>
          </Box>
        </Modal>
      </div>
    </Draggable>
  )
}
