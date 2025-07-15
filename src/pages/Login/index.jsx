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
import authService from '../../services/authService'
import bg from '../../assets/gehd.png'
import { useAuth } from '../../hooks/useAuth'

const Login = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { isLoadingUser, userError } = useAuth()

  if (isLoadingUser) {
    return <Center style={{ minHeight: '100vh' }}><Loader size="lg" /></Center>
  }
  if (userError) {
    return <Center style={{ minHeight: '100vh' }}><Alert color="red">{userError.message || 'Authentication error. Please try again later.'}</Alert></Center>
  }

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

  const handleLogin = async (values) => {
    setLoading(true)
    setError('')

    try {
      const data = await authService.login(values.identifier, values.password)

      notifications.show({
        title: 'Welcome back!',
        message: `Hello ${data.user.name || data.user.username}, you've successfully logged in.`,
        color: 'green',
        icon: <IconCheck size={16} />
      })

      navigate('/')
    } catch (error) {
      setError(error.message)
      notifications.show({
        title: 'Login Failed',
        message: error.message,
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
                placeholder="your@email.com or username"
                icon={<IconMail size={18} />}
                size="md"
                radius="md"
                {...form.getInputProps('identifier')}
                autoFocus
                required
              />
              <PasswordInput
                label="Password"
                placeholder="Your password"
                icon={<IconLock size={18} />}
                size="md"
                radius="md"
                {...form.getInputProps('password')}
                required
                rightSection={
                  <ActionIcon onClick={() => setShowPassword((v) => !v)} tabIndex={-1}>
                    {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                  </ActionIcon>
                }
                type={showPassword ? 'text' : 'password'}
              />
              <Group position="apart" mt="xs">
                <Checkbox
                  label="Remember me"
                  {...form.getInputProps('rememberMe', { type: 'checkbox' })}
                />
                <UnstyledButton component={Link} to="/signup" style={{ color: '#228be6', fontWeight: 500 }}>
                  Sign up
                </UnstyledButton>
              </Group>
              <Button
                type="submit"
                size="md"
                radius="md"
                fullWidth
                loading={loading}
                leftIcon={<IconLogin size={18} />}
                style={{ marginTop: 8 }}
              >
                Sign in
              </Button>
              <Divider label="or" labelPosition="center" my="sm" />
              <Button
                variant="outline"
                size="md"
                radius="md"
                fullWidth
                leftIcon={<IconBrandGoogle size={18} />}
                onClick={handleGoogleLogin}
                style={{ borderColor: '#ddd', color: '#333', background: '#fafafa' }}
              >
                Sign in with Google
              </Button>
            </Stack>
          </form>
        </Paper>
        <Text size="sm" color="dimmed" align="center" mt="md">
          Already have an account?{' '}
          <UnstyledButton component={Link} to="/signup" style={{ color: '#228be6', fontWeight: 500 }}>
            Sign up
          </UnstyledButton>
        </Text>
      </Box>
    </Box>
  )
}

export default Login
