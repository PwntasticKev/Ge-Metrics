import { useState } from 'react'
import {
  Box,
  Card,
  Text,
  Button,
  Group,
  Alert,
  Stack,
  Center,
  Title
} from '@mantine/core'
import { IconLock, IconMail, IconClock, IconInfoCircle } from '@tabler/icons-react'

export default function AccessDenied () {
  const [emailSent, setEmailSent] = useState(false)

  // Mock user data - this would come from your auth context
  const currentUser = {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    access: false,
    created_at: new Date()
  }

  const handleRequestAccess = async () => {
    try {
      // This would send an email to administrators
      // await sendAccessRequest(currentUser.id)

      console.log('Access request sent for user:', currentUser.id)
      setEmailSent(true)

      // Clear the success message after 5 seconds
      setTimeout(() => setEmailSent(false), 5000)
    } catch (error) {
      console.error('Error sending access request:', error)
    }
  }

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '2rem'
    }}>
      <Card
        withBorder
        shadow="xl"
        p="xl"
        sx={{
          maxWidth: 500,
          width: '100%',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)'
        }}
      >
        <Stack spacing="lg" align="center">
          <Center>
            <IconLock size={64} color="#e03131" />
          </Center>

          <div style={{ textAlign: 'center' }}>
            <Title order={2} color="#e03131" mb="xs">
              Access Pending Approval
            </Title>
            <Text size="lg" color="dimmed">
              Your account is waiting for administrator approval
            </Text>
          </div>

          <Alert
            icon={<IconInfoCircle size={16} />}
            color="blue"
            variant="light"
            sx={{ width: '100%' }}
          >
            <Text size="sm">
              <strong>Hello {currentUser.name}!</strong><br />
              Your account was created successfully, but requires approval before you can access GE Metrics.
              This helps us maintain a secure and quality community.
            </Text>
          </Alert>

          <Card withBorder p="md" sx={{ width: '100%', backgroundColor: '#f8f9fa' }}>
            <Stack spacing="xs">
              <Group>
                <IconMail size={16} />
                <Text size="sm" weight={500}>Email:</Text>
                <Text size="sm">{currentUser.email}</Text>
              </Group>
              <Group>
                <IconClock size={16} />
                <Text size="sm" weight={500}>Registered:</Text>
                <Text size="sm">{currentUser.created_at.toLocaleDateString()}</Text>
              </Group>
            </Stack>
          </Card>

          {emailSent && (
            <Alert
              icon={<IconMail size={16} />}
              color="green"
              variant="light"
              sx={{ width: '100%' }}
            >
              <Text size="sm">
                ✅ Access request sent! Administrators have been notified.
              </Text>
            </Alert>
          )}

          <Stack spacing="sm" sx={{ width: '100%' }}>
            <Button
              onClick={handleRequestAccess}
              disabled={emailSent}
              leftIcon={<IconMail size={16} />}
              size="md"
              fullWidth
            >
              {emailSent ? 'Request Sent' : 'Request Access'}
            </Button>

            <Text size="xs" color="dimmed" align="center">
              You will receive an email notification once your account is approved.
              This usually takes 24-48 hours.
            </Text>
          </Stack>

          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <Text size="xs" color="dimmed">
              Need help? Contact us at{' '}
              <Text component="a" href="mailto:admin@ge-metrics.com" color="blue" size="xs">
                admin@ge-metrics.com
              </Text>
            </Text>
          </div>
        </Stack>
      </Card>
    </Box>
  )
}
