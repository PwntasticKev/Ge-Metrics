import React from 'react'
import { Box, Title, Text, Button, Container } from '@mantine/core'
import { IconArrowLeft } from '@tabler/icons-react'
import { Link } from 'react-router-dom'

const ComingSoon = () => {
  return (
    <Container>
      <Box sx={{ textAlign: 'center', padding: '50px' }}>
        <Title order={1}>Coming Soon!</Title>
        <Text size="lg" color="dimmed" mt="md">
          We're working hard to bring you this feature. Please check back later.
        </Text>
        <Button
          component={Link}
          to="/all-items"
          leftIcon={<IconArrowLeft size={16} />}
          mt="xl"
        >
          Go Back Home
        </Button>
      </Box>
    </Container>
  )
}

export default ComingSoon
