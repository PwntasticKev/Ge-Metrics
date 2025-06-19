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
  Tooltip
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

const Login = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showMasterLogin, setShowMasterLogin] = useState(false)
  const [mounted, setMounted] = useState(false)

  const form = useForm({
    initialValues: {
      email: '',
      password: '',
      rememberMe: false
    },
    validate: {
      email: (value) => {
        if (!value) return 'Email is required'
        const validation = securityService.validateInput(value, 'email')
        return validation.valid ? null : validation.error
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
      const data = await authService.login(values.email, values.password)

      notifications.show({
        title: 'Welcome back!',
        message: `Hello ${data.user.name}, you've successfully logged in.`,
        color: 'green',
        icon: <IconCheck size={16} />
      })

      // Navigate to dashboard
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

  const handleMasterLogin = () => {
    form.setValues({
      email: 'admin@test.com',
      password: 'admin123'
    })
    setShowMasterLogin(false)
    notifications.show({
      title: 'Master Credentials Loaded',
      message: 'You can now click Login to access the admin account',
      color: 'blue',
      icon: <IconShield size={16} />
    })
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
    <BackgroundImage src={bg} style={{ minHeight: '100vh' }}>
      <Box
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.7) 100%)',
          backdropFilter: 'blur(10px)'
        }}
      >
        <Container size="lg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>

            {/* Left Side - Branding & Features */}
            <Transition mounted={mounted} transition="slide-right" duration={800}>
              {(styles) => (
                <Box style={styles}>
                  <Stack spacing="xl">
                    <Box>
                      <Title
                        order={1}
                        size="3.5rem"
                        weight={900}
                        style={{
                          background: 'linear-gradient(45deg, #FFD700, #FFA500, #FF6B35)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          marginBottom: '1rem'
                        }}
                      >
                        Ge-Metrics
                      </Title>
                      <Text size="xl" color="dimmed" weight={500}>
                        The Ultimate OSRS Grand Exchange Analytics Platform
                      </Text>
                    </Box>

                    <Stack spacing="md">
                      {features.map((feature, index) => (
                        <Transition key={index} mounted={mounted} transition="slide-up" duration={600} timingFunction="ease" delay={200 + index * 100}>
                          {(styles) => (
                            <Group style={styles} spacing="md">
                              <ThemeIcon
                                size="lg"
                                radius="xl"
                                variant="gradient"
                                gradient={{ from: 'orange', to: 'yellow' }}
                              >
                                <feature.icon size={20} />
                              </ThemeIcon>
                              <Text size="lg" weight={500} color="white">
                                {feature.text}
                              </Text>
                            </Group>
                          )}
                        </Transition>
                      ))}
                    </Stack>

                    <Box
                      p="md"
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        backdropFilter: 'blur(10px)'
                      }}
                    >
                      <Text size="sm" color="dimmed" align="center">
                        Join thousands of OSRS traders making smarter decisions
                      </Text>
                    </Box>
                  </Stack>
                </Box>
              )}
            </Transition>

            {/* Right Side - Login Form */}
            <Transition mounted={mounted} transition="slide-left" duration={800}>
              {(styles) => (
                <Paper
                  style={{
                    ...styles,
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '20px',
                    padding: '3rem',
                    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)'
                  }}
                >
                  <Stack spacing="xl">
                    <Box ta="center">
                      <Title order={2} size="2rem" weight={700} color="dark">
                        Welcome Back
                      </Title>
                      <Text size="md" color="dimmed" mt="xs">
                        Sign in to your account to continue
                      </Text>
                    </Box>

                    {error && (
                      <Alert
                        icon={<IconAlertCircle size={16} />}
                        color="red"
                        variant="light"
                        style={{ borderRadius: '12px' }}
                      >
                        {error}
                      </Alert>
                    )}

                    <form onSubmit={form.onSubmit(handleLogin)}>
                      <Stack spacing="lg">
                        <TextInput
                          label="Email Address"
                          placeholder="your@email.com"
                          icon={<IconMail size={16} />}
                          size="md"
                          radius="md"
                          styles={{
                            input: {
                              border: '2px solid #e9ecef',
                              '&:focus': {
                                borderColor: '#FF6B35'
                              }
                            }
                          }}
                          {...form.getInputProps('email')}
                        />

                        <PasswordInput
                          label="Password"
                          placeholder="Your password"
                          icon={<IconLock size={16} />}
                          size="md"
                          radius="md"
                          styles={{
                            input: {
                              border: '2px solid #e9ecef',
                              '&:focus': {
                                borderColor: '#FF6B35'
                              }
                            }
                          }}
                          {...form.getInputProps('password')}
                        />

                        <Group position="apart">
                          <Checkbox
                            label="Remember me"
                            size="sm"
                            {...form.getInputProps('rememberMe', { type: 'checkbox' })}
                          />
                          <Text size="sm" color="dimmed" style={{ cursor: 'pointer' }}>
                            Forgot password?
                          </Text>
                        </Group>

                        <Button
                          type="submit"
                          size="md"
                          radius="md"
                          fullWidth
                          loading={loading}
                          leftIcon={<IconLogin size={16} />}
                          style={{
                            background: 'linear-gradient(45deg, #FF6B35, #FFA500)',
                            border: 'none',
                            height: '48px',
                            fontSize: '16px',
                            fontWeight: 600
                          }}
                        >
                          {loading ? 'Signing In...' : 'Sign In'}
                        </Button>
                      </Stack>
                    </form>

                    <Divider label="or continue with" labelPosition="center" />

                    <Button
                      variant="outline"
                      size="md"
                      radius="md"
                      fullWidth
                      leftIcon={<IconBrandGoogle size={16} />}
                      onClick={handleGoogleLogin}
                      style={{
                        borderColor: '#DB4437',
                        color: '#DB4437',
                        height: '48px'
                      }}
                    >
                      Sign in with Google
                    </Button>

                    {/* Master Login Button */}
                    <Center>
                      <Tooltip label="Load test credentials for demo">
                        <UnstyledButton
                          onClick={handleMasterLogin}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '20px',
                            background: 'linear-gradient(45deg, #667eea, #764ba2)',
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: 500
                          }}
                        >
                          <Group spacing={4}>
                            <IconShield size={14} />
                            <Text size="xs">Load Test Account</Text>
                          </Group>
                        </UnstyledButton>
                      </Tooltip>
                    </Center>

                    <Text align="center" size="sm" color="dimmed">
                      Don't have an account?{' '}
                      <Text
                        component={Link}
                        to="/signup"
                        weight={600}
                        style={{ color: '#FF6B35', textDecoration: 'none' }}
                      >
                        Sign up here
                      </Text>
                    </Text>
                  </Stack>
                </Paper>
              )}
            </Transition>
          </div>
        </Container>
      </Box>
    </BackgroundImage>
  )
}

export default Login
