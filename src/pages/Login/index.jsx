import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Button,
  TextInput,
  PasswordInput,
  Paper,
  Title,
  Text,
  Container,
  Alert,
  Loader,
  Group,
  Checkbox,
  Divider,
  Stack,
  Box,
  BackgroundImage,
  Center,
  useMantineTheme
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import {
  IconLogin,
  IconBrandGoogle,
  IconMail,
  IconLock,
  IconAlertCircle,
  IconCheck
} from '@tabler/icons-react'
import bg from '../../assets/gehd.png'
import { useAuth } from '../../hooks/useAuth'
import PasswordRecoveryModal from '../../components/auth/PasswordRecoveryModal'
import { trpc } from '../../utils/trpc.jsx'

const Login = () => {
  const navigate = useNavigate()
  const theme = useMantineTheme()
  const [error, setError] = useState('')
  const [recoveryModalOpened, setRecoveryModalOpened] = useState(false)
  const { isLoadingUser, userError, login, isLoggingIn } = useAuth()

  const form = useForm({
    initialValues: {
      identifier: '',
      password: '',
      rememberMe: false
    },
    validate: {
      identifier: (value) => (!value ? 'Email or username is required' : null),
      password: (value) => (!value ? 'Password is required' : null)
    }
  })

  useEffect(() => {
    // Redirect if already logged in
    if (localStorage.getItem('auth_token')) {
      navigate('/')
    }
  }, [navigate])

  if (isLoadingUser) {
    return <Center style={{ minHeight: '100vh' }}><Loader size="lg" /></Center>
  }

  if (userError) {
    return <Center style={{ minHeight: '100vh' }}><Alert color="red">{userError.message || 'Authentication error.'}</Alert></Center>
  }

  const handleLogin = (values) => {
    login({
      email: values.identifier,
      password: values.password
    }, {
      onSuccess: () => {
        setError('')
        notifications.show({
          title: 'Login Successful',
          message: 'Welcome back!',
          color: 'green',
          icon: <IconCheck size={18} />
        })
        navigate('/')
      },
      onError: (error) => {
        setError(error.message || 'Login failed')
      }
    })
  }

  const handleGoogleLogin = () => {
    notifications.show({
      title: 'Coming Soon',
      message: 'Google authentication will be available soon!',
      color: 'blue'
    })
  }

  return (
    <Box style={{
      minHeight: '100vh',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <BackgroundImage
        src={bg}
        radius="sm"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1
        }}
      />
      <Box style={{
        position: 'relative',
        zIndex: 2,
        width: '100%',
        maxWidth: 420
      }}>
        <Paper
          p="xl"
          shadow="xl"
          radius="lg"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}
        >
          <Title order={2} align="center" mb="xs" color="white">
            Login
          </Title>
          <Text align="center" color="gray.4" mb="lg">
            Welcome back to GE-Metrics
          </Text>

          {error && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md" variant="filled">
              {error}
            </Alert>
          )}

          <form onSubmit={form.onSubmit(handleLogin)}>
            <Stack>
              <TextInput
                placeholder="Enter your email"
                required
                size="md"
                icon={<IconMail size={16} />}
                {...form.getInputProps('identifier')}
                styles={{
                  input: {
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.3)'
                  },
                  label: { color: 'white' }
                }}
              />
              <PasswordInput
                placeholder="Enter your password"
                required
                size="md"
                icon={<IconLock size={16} />}
                {...form.getInputProps('password')}
                styles={{
                  input: {
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.3)'
                  },
                  label: { color: 'white' }
                }}
              />
              <Group position="apart">
                <Checkbox
                  label="Remember me"
                  {...form.getInputProps('rememberMe', { type: 'checkbox' })}
                  styles={{ label: { color: 'white' } }}
                />
                <Text
                  component="button"
                  type="button"
                  onClick={() => setRecoveryModalOpened(true)}
                  size="sm"
                  style={{ color: theme.colors.blue[3], background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Forgot password?
                </Text>
              </Group>
              <Button
                type="submit"
                fullWidth
                size="md"
                loading={isLoggingIn}
                variant="gradient"
                gradient={{ from: 'blue', to: 'cyan' }}
              >
                Log In
              </Button>
            </Stack>
          </form>

          <Divider my="lg" label="or" labelPosition="center"
            styles={{ label: { color: 'gray.5' } }}
          />

          <Button
            fullWidth
            size="md"
            variant="default"
            leftIcon={<IconBrandGoogle size={18} />}
            onClick={handleGoogleLogin}
          >
            Continue with Google
          </Button>

          <Text align="center" mt="md" color="gray.4">
            Don't have an account?{' '}
            <Link to="/signup" style={{ color: theme.colors.blue[3], fontWeight: 500 }}>
              Register
            </Link>
          </Text>
        </Paper>
      </Box>

      <PasswordRecoveryModal
        opened={recoveryModalOpened}
        onClose={() => setRecoveryModalOpened(false)}
      />
    </Box>
  )
}

export default Login
