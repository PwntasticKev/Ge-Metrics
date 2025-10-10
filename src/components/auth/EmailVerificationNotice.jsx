import React from 'react'
import {
  Paper,
  Title,
  Text,
  Button,
  Container,
  Stack,
  Alert,
  Group,
  ThemeIcon
} from '@mantine/core'
import { IconMail, IconCheck, IconArrowRight } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import bg from '../../assets/gehd.png'

const EmailVerificationNotice = ({ email }) => {
  const navigate = useNavigate()

  return (
    <div style={{
      minHeight: '100vh',
      backgroundImage: `url(${bg})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <Container size={420} my={40}>
        <Paper withBorder shadow="md" p={40} radius="md">
          <Stack align="center" spacing="lg">
            <ThemeIcon size={80} radius="xl" color="teal">
              <IconMail size={40} />
            </ThemeIcon>
            
            <Title order={2} align="center">
              Check Your Email
            </Title>
            
            <Text align="center" color="dimmed" size="md">
              We've sent a verification email to:
            </Text>
            
            <Text align="center" weight={600} size="lg">
              {email}
            </Text>
            
            <Alert icon={<IconCheck size={16} />} color="teal" variant="light">
              <Text size="sm">
                Please check your email and click the verification link to activate your account.
              </Text>
            </Alert>
            
            <Text align="center" color="dimmed" size="sm">
              Didn't receive the email? Check your spam folder or contact support.
            </Text>
            
            <Group position="center" mt="lg">
              <Button 
                leftIcon={<IconArrowRight size={16} />}
                onClick={() => navigate('/login')}
                size="md"
              >
                Go to Login
              </Button>
            </Group>
          </Stack>
        </Paper>
      </Container>
    </div>
  )
}

export default EmailVerificationNotice