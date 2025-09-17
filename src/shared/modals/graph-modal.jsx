import { Box, Container, Modal } from '@mantine/core'
import LineChart from '../../shared/line-chart.jsx'

export default function GraphModal ({ opened, setOpened, id }) {
  return (
        <>
            <Modal opened={opened} onClose={() => setOpened(false)} centered size="xl" withinPortal={false}>

                <Box>
                    <Container px={0}>
                        <LineChart id={id}/>
                    </Container>
                </Box>
            </Modal>
        </>
  )
}
