import { Box, Container, Modal } from '@mantine/core'
import LineChart from '../../shared/line-chart.jsx'
import Draggable from 'react-draggable'
import { useRef } from 'react'

export default function GraphModal ({ opened, setOpened, id }) {
  const nodeRef = useRef(null)
  return (
        <Draggable handle=".mantine-Modal-header" nodeRef={nodeRef}>
            <div ref={nodeRef}>
            <Modal
                opened={opened}
                onClose={() => setOpened(false)}
                centered
                size="90%"
                withinPortal={false}
                closeOnEscape={true}
                trapFocus={false}
                overlayProps={{
                  blur: 3
                }}
                transitionProps={{
                  transition: 'pop',
                  duration: 200
                }}
                styles={{
                  header: { cursor: 'move' }
                }}
            >
                <Box style={{ resize: 'both', overflow: 'auto', padding: '1rem' }}>
                    <Container px={0}>
                        <LineChart id={id}/>
                    </Container>
                </Box>
            </Modal>
            </div>
        </Draggable>
  )
}
