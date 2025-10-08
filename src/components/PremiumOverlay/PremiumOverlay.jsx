import { Box, Button, Card, Center, Group, Stack, Text, ThemeIcon } from '@mantine/core'
import { IconLock } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'

const PremiumOverlay = ({ children }) => {
  const navigate = useNavigate()

  return (
    <Box style={{ position: 'relative' }}>
      {children}
      <Box
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}
      >
        <Card 
          withBorder 
          radius="lg" 
          p="xl" 
          style={{ 
            maxWidth: 400, 
            width: '90%',
            textAlign: 'center'
          }}
        >
          <Stack spacing="lg">
            <ThemeIcon 
              size={60} 
              radius="xl" 
              variant="gradient"
              gradient={{ from: 'blue', to: 'cyan' }}
            >
              <IconLock size={30} />
            </ThemeIcon>
            
            <Stack spacing="sm">
              <Text size="xl" weight={600}>
                Premium Feature
              </Text>
              <Text size="md" color="dimmed">
                Upgrade to Premium to access this feature and unlock all the powerful tools GE-Metrics has to offer.
              </Text>
            </Stack>

            <Group position="center" spacing="md">
              <Button 
                variant="gradient" 
                gradient={{ from: 'blue', to: 'cyan' }}
                size="md"
                onClick={() => navigate('/billing')}
              >
                Upgrade Now
              </Button>
              <Button 
                variant="subtle" 
                size="md"
                onClick={() => navigate('/')}
              >
                Back to All Items
              </Button>
            </Group>
          </Stack>
        </Card>
      </Box>
    </Box>
  )
}

export default PremiumOverlay