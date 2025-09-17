import { Box, Container, Modal } from '@mantine/core'
import LineChart from '../../shared/line-chart.jsx'

export default function GraphModal ({ opened, setOpened, id }) {
  return (
        <>
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
            >
                <Box style={{ resize: 'both', overflow: 'auto', padding: '1rem' }}>
                    <Container px={0}>
                        <LineChart id={id}/>
                    </Container>
                </Box>
            </Modal>
        </>
  )
}
