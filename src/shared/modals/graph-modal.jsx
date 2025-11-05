import { Box, Container, Modal, Group, Avatar, Title } from '@mantine/core'
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

  const imageUrl = item?.icon ? `https://oldschool.runescape.wiki/images/${item.icon}`.replace(/ /g, '_') : undefined
  const titleText = item?.name || 'Price History'

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      centered
      size="95%"
      closeOnEscape={true}
      closeOnClickOutside={false}
      withCloseButton={true}
      trapFocus={true}
      keepMounted
      lockScroll={false}
      overlayProps={{
        blur: 3
      }}
      transitionProps={{
        transition: 'pop',
        duration: 200
      }}
      title={null}
    >
      <Box style={{ padding: '1rem', minHeight: '70vh' }}>
        <Group mb="md" spacing="sm">
          {imageUrl && <Avatar src={imageUrl} alt={titleText} radius="sm" size={36} />}
          <Title order={2}>{titleText}</Title>
        </Group>
        <Container px={0}>
          <LineChart id={id || item?.id} items={items || item?.items} />
        </Container>
      </Box>
    </Modal>
  )
}
