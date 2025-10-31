import { Box, Container, Modal } from '@mantine/core'
import LineChart from '../../shared/line-chart.jsx'

export default function GraphModal ({ opened, setOpened, onClose, item, id, items }) {
  const handleClose = () => {
    console.log('GraphModal: Attempting to close modal')
    if (setOpened) {
      setOpened(false)
    }
    if (onClose) {
      onClose()
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      centered
      size="95%"
      closeOnEscape={true}
      closeOnClickOutside={true}
      withCloseButton={true}
      trapFocus={false}
      lockScroll={false}
      overlayProps={{
        blur: 3
      }}
      transitionProps={{
        transition: 'pop',
        duration: 200
      }}
      title={`Price History: ${item?.name || 'Loading...'}`}
    >
      <Box style={{ padding: '1rem', minHeight: '70vh' }}>
        <Container px={0}>
          <LineChart id={id || item?.id} items={items || item?.items} />
        </Container>
      </Box>
    </Modal>
  )
}
