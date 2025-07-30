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
  Transition,
  ThemeIcon,
  UnstyledButton,
  Tooltip,
  Avatar,
  ActionIcon
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import {
  IconLogin,
  IconBrandGoogle,
  IconEye,
  IconEyeOff,
  IconMail,
  IconLock,
  IconShield,
  IconSparkles,
  IconTrendingUp,
  IconUsers,
  IconChartBar,
  IconAlertCircle,
  IconCheck
} from '@tabler/icons-react'
import securityService from '../../services/securityService'
import bg from '../../assets/gehd.png'
import { useAuth } from '../../hooks/useAuth'
import PasswordRecoveryModal from '../../components/auth/PasswordRecoveryModal'
import { trpc } from '../../utils/trpc.jsx'

const Login = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [recoveryModalOpened, setRecoveryModalOpened] = useState(false)
  const { isLoadingUser, userError } = useAuth()

  const form = useForm({
    initialValues: {
      identifier: '',
      password: '',
      rememberMe: false
    },
    validate: {
      identifier: (value) => {
        if (!value) return 'Email or username is required'
        return null
      },
      password: (value) => {
        if (!value) return 'Password is required'
        if (value.length < 6) return 'Password must be at least 6 characters'
        return null
      }
    }
  })

  useEffect(() => {
    setMounted(true)
    // Check if user is already logged in
    const session = localStorage.getItem('auth_session')
    if (session) {
      try {
        const sessionData = JSON.parse(session)
        if (sessionData.token && sessionData.expiresAt > Date.now()) {
          navigate('/')
        }
      } catch (error) {
        localStorage.removeItem('auth_session')
      }
    }
  }, [navigate])

  if (isLoadingUser) {
    return <Center style={{ minHeight: '100vh' }}><Loader size="lg" /></Center>
  }
  if (userError) {
    return <Center style={{ minHeight: '100vh' }}><Alert color="red">{userError.message || 'Authentication error. Please try again later.'}</Alert></Center>
  }

  const handleLogin = async (values) => {
    setLoading(true)
    setError('')

    try {
      // Use tRPC client for login
      const result = await trpc.auth.login.mutate({
        email: values.identifier,
        password: values.password
      })

      // Store authentication data
      localStorage.setItem('auth_token', result.accessToken)
      localStorage.setItem('refresh_token', result.refreshToken)
      localStorage.setItem('auth_session', JSON.stringify({
        user: result.user,
        token: result.accessToken,
        expiresAt: Date.now() + (60 * 60 * 1000) // 1 hour
      }))

      notifications.show({
        title: 'Welcome back!',
        message: `Hello ${result.user.name}, you've successfully logged in.`,
        color: 'green',
        icon: <IconCheck size={16} />
      })

      navigate('/')
    } catch (error) {
      setError(error.message || 'Login failed')
      notifications.show({
        title: 'Login Failed',
        message: error.message || 'Login failed',
        color: 'red',
        icon: <IconAlertCircle size={16} />
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    notifications.show({
      title: 'Coming Soon',
      message: 'Google authentication will be available soon!',
      color: 'blue'
    })
  }

  const features = [
    { icon: IconTrendingUp, text: 'Real-time OSRS Market Data' },
    { icon: IconChartBar, text: 'Advanced Trading Charts' },
    { icon: IconUsers, text: 'Community Insights' },
    { icon: IconSparkles, text: 'Premium Analytics' }
  ]

  return (
    <Box style={{ minHeight: '100vh', background: '#f7f8fa', display: 'flex', alignItems: 'stretch' }}>
      {/* Left: Branding/Features */}
      <Box style={{ flex: 1, background: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '4rem 2rem', borderTopLeftRadius: 24, borderBottomLeftRadius: 24 }}>
        <Title order={1} size="2.5rem" weight={900} mb="md" style={{ letterSpacing: '-1px' }}>
          Ge-Metrics
        </Title>
        <Text size="lg" color="dimmed" mb="xl">
          The Ultimate OSRS Grand Exchange Analytics Platform
        </Text>
        <Stack spacing="md" mb="xl">
          <Group spacing="sm">
            <ThemeIcon size="lg" radius="xl" variant="gradient" gradient={{ from: 'orange', to: 'yellow' }}>
              <IconTrendingUp size={20} />
            </ThemeIcon>
            <Text size="md">Real-time OSRS Market Data</Text>
          </Group>
          <Group spacing="sm">
            <ThemeIcon size="lg" radius="xl" variant="gradient" gradient={{ from: 'orange', to: 'yellow' }}>
              <IconChartBar size={20} />
            </ThemeIcon>
            <Text size="md">Advanced Trading Charts</Text>
          </Group>
          <Group spacing="sm">
            <ThemeIcon size="lg" radius="xl" variant="gradient" gradient={{ from: 'orange', to: 'yellow' }}>
              <IconUsers size={20} />
            </ThemeIcon>
            <Text size="md">Community Insights</Text>
          </Group>
          <Group spacing="sm">
            <ThemeIcon size="lg" radius="xl" variant="gradient" gradient={{ from: 'orange', to: 'yellow' }}>
              <IconSparkles size={20} />
            </ThemeIcon>
            <Text size="md">Premium Analytics</Text>
          </Group>
        </Stack>
        <Box mt="auto" pt="xl">
          <Group spacing="xs">
            <Avatar src="/src/assets/jmod.png" radius="xl" size={36} />
            <Avatar src="/src/assets/runescapehd.jpg" radius="xl" size={36} />
            <Avatar src="/src/assets/highalch.png" radius="xl" size={36} />
            <Text size="sm" color="dimmed">Join with 20k+ OSRS traders!</Text>
          </Group>
        </Box>
      </Box>
      {/* Right: Login Form */}
      <Box style={{ flex: 1, background: '#f7f8fa', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '4rem 2rem', borderTopRightRadius: 24, borderBottomRightRadius: 24 }}>
        <Paper shadow="md" radius="lg" p="xl" style={{ width: '100%', maxWidth: 400, background: '#fff' }}>
          <Title order={2} size="1.8rem" weight={700} align="center" mb="xs">
            Welcome to Ge-Metrics
          </Title>
          <Text size="md" color="dimmed" align="center" mb="lg">
            Sign in to your account
          </Text>
          {error && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md">
              {error}
            </Alert>
          )}

          <form onSubmit={form.onSubmit(handleLogin)}>
            <Stack spacing="md">
              <TextInput
                label="Email or Username"
                placeholder="Enter your email or username"
                leftIcon={<IconMail size={16} />}
                required
                {...form.getInputProps('identifier')}
              />

              <PasswordInput
                label="Password"
                placeholder="Enter your password"
                leftIcon={<IconLock size={16} />}
                required
                {...form.getInputProps('password')}
              />

              <Group position="apart">
                <Checkbox
                  label="Remember me"
                  {...form.getInputProps('rememberMe', { type: 'checkbox' })}
                />
                <UnstyledButton
                  component="button"
                  type="button"
                  onClick={() => setRecoveryModalOpened(true)}
                  style={{ fontSize: '14px', color: '#228be6', textDecoration: 'none' }}
                >
                  Forgot password?
                </UnstyledButton>
              </Group>

              <Button
                type="submit"
                fullWidth
                size="md"
                loading={loading}
                leftIcon={<IconLogin size={16} />}
              >
                Sign In
              </Button>

              <Divider label="or" labelPosition="center" />

              <Button
                variant="outline"
                fullWidth
                size="md"
                leftIcon={<IconBrandGoogle size={16} />}
                onClick={handleGoogleLogin}
              >
                Continue with Google
              </Button>

              <Text align="center" size="sm" color="dimmed">
                Don't have an account?{' '}
                <Link to="/signup" style={{ color: '#228be6', textDecoration: 'none' }}>
                  Sign up
                </Link>
              </Text>
            </Stack>
          </form>
        </Paper>
      </Box>

      {/* Password Recovery Modal */}
      <PasswordRecoveryModal
        opened={recoveryModalOpened}
        onClose={() => setRecoveryModalOpened(false)}
      />
    </Box>
  )
}

export default Login
