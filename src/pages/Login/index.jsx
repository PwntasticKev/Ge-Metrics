import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Button,
  TextInput,
  PasswordInput,
  Title,
  Text,
  Alert,
  Loader,
  Group,
  Checkbox,
  Divider,
  Stack,
  Box,
  Center,
  PinInput
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import {
  IconBrandGoogle,
  IconMail,
  IconLock,
  IconAlertCircle,
  IconCheck,
  IconShield,
  IconTrendingUp,
  IconCoins
} from '@tabler/icons-react'
import { useAuth } from '../../hooks/useAuth'
import PasswordRecoveryModal from '../../components/auth/PasswordRecoveryModal'
import { trpc } from '../../utils/trpc'
import bgImage from '../../assets/gehd.png'

const Login = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState('')
  const [recoveryModalOpened, setRecoveryModalOpened] = useState(false)
  const [twoFactorRequired, setTwoFactorRequired] = useState(false)
  const [otp, setOtp] = useState('')
  const [showVerificationAlert, setShowVerificationAlert] = useState(false)
  const { isLoadingUser, userError, login, loginWithOtp, isLoggingIn } = useAuth()
  const resendVerification = trpc.auth.resendVerificationEmail.useMutation()
  
  const verificationEmail = searchParams.get('email')

  const form = useForm({
    initialValues: {
      identifier: verificationEmail || '',
      password: '',
      rememberMe: false
    },
    validate: {
      identifier: (value) => (!value ? 'Email or username is required' : null),
      password: (value) => (!value ? 'Password is required' : null)
    },
    validateInputOnBlur: false,
    validateInputOnChange: false
  })

  useEffect(() => {
    if (verificationEmail) {
      setShowVerificationAlert(true)
    }
  }, [verificationEmail])

  useEffect(() => {
    // Add entrance animations
    const leftPanel = document.querySelector('.left-panel')
    const rightPanel = document.querySelector('.right-panel')
    const formCard = document.querySelector('.form-card')
    
    if (leftPanel) {
      setTimeout(() => {
        leftPanel.style.opacity = '1'
        leftPanel.style.transform = 'translateX(0)'
      }, 100)
    }
    if (rightPanel) {
      setTimeout(() => {
        rightPanel.style.opacity = '1'
        rightPanel.style.transform = 'translateX(0)'
      }, 200)
    }
    if (formCard) {
      setTimeout(() => {
        formCard.style.opacity = '1'
        formCard.style.transform = 'translateY(0)'
      }, 300)
    }
  }, [])

  const handleResendVerification = async () => {
    try {
      await resendVerification.mutateAsync({ email: form.values.identifier })
      notifications.show({
        title: 'Email Sent!',
        message: 'Check your inbox for the verification link.',
        color: 'green',
        icon: <IconCheck size={18} />
      })
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: err.message || 'Failed to resend verification email',
        color: 'red',
        icon: <IconAlertCircle size={18} />
      })
    }
  }

  if (isLoadingUser) {
    return (
      <Center style={{ minHeight: '100vh', background: '#141517' }}>
        <Loader size="lg" color="#667eea" />
      </Center>
    )
  }

  if (userError) {
    return (
      <Center style={{ minHeight: '100vh', background: '#141517' }}>
        <Alert color="red">{userError.message || 'Authentication error.'}</Alert>
      </Center>
    )
  }

  const handleLogin = (values) => {
    login({
      email: values.identifier,
      password: values.password,
    }, {
      onSuccess: (data) => {
        if (data.twoFactorRequired) {
          setTwoFactorRequired(true)
          setError('')
        } else {
          setError('')
          notifications.show({
            title: 'Login Successful',
            message: 'Welcome back to the Grand Exchange!',
            color: 'green',
            icon: <IconCheck size={18} />
          })
          navigate('/all-items')
        }
      },
      onError: (error) => {
        if (error.message?.includes('verify your email')) {
          setShowVerificationAlert(true)
        }
        setError(error.message || 'Login failed')
      }
    })
  }

  const handleVerifyOtp = async () => {
    try {
      await loginWithOtp({
        email: form.values.identifier,
        token: otp
      })
      notifications.show({
        title: 'Login Successful',
        message: 'Welcome back!',
        color: 'green',
        icon: <IconCheck size={18} />
      })
      navigate('/all-items')
    } catch (error) {
      setError(error.message || 'OTP verification failed')
    }
  }

  useEffect(() => {
    // Load Google Identity Services
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    document.head.appendChild(script)

    script.onload = () => {
      if (window.google && import.meta.env.VITE_GOOGLE_CLIENT_ID) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: handleGoogleCallback
        })
      }
    }

    return () => {
      // Cleanup if needed
    }
  }, [])

  const handleGoogleLogin = async () => {
    if (!window.google || !import.meta.env.VITE_GOOGLE_CLIENT_ID) {
      notifications.show({
        title: 'Error',
        message: 'Google sign-in is not configured. Please contact support.',
        color: 'red'
      })
      return
    }

    try {
      window.google.accounts.id.prompt()
    } catch (error) {
      window.google.accounts.id.renderButton(
        document.getElementById('google-signin-button'),
        { 
          theme: 'outline', 
          size: 'large',
          text: 'signin_with',
          width: '100%'
        }
      )
    }
  }

  const handleGoogleCallback = async (response) => {
    try {
      const googleLogin = trpc.auth.googleLogin.useMutation()
      const result = await googleLogin.mutateAsync({ idToken: response.credential })
      
      if (result.accessToken) {
        localStorage.setItem('accessToken', result.accessToken)
        if (result.refreshToken) {
          localStorage.setItem('refreshToken', result.refreshToken)
        }
        notifications.show({
          title: 'Login Successful',
          message: 'Welcome!',
          color: 'green',
          icon: <IconCheck size={18} />
        })
        navigate('/all-items')
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Google login failed',
        color: 'red'
      })
    }
  }

  return (
    <Box style={{
      minHeight: '100vh',
      display: 'flex',
      overflow: 'hidden',
      background: '#141517'
    }}>
      <style>{`
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.05); opacity: 1; }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(102, 126, 234, 0.3); }
          50% { box-shadow: 0 0 30px rgba(102, 126, 234, 0.6); }
        }
        .left-panel {
          animation: slideInLeft 0.8s ease-out;
          opacity: 0;
          transform: translateX(-50px);
        }
        .right-panel {
          animation: slideInRight 0.8s ease-out;
          opacity: 0;
          transform: translateX(50px);
        }
        .form-card {
          animation: slideUp 0.6s ease-out 0.3s both;
          opacity: 0;
          transform: translateY(30px);
        }
        .floating-icon {
          animation: float 3s ease-in-out infinite;
        }
        .shimmer-text {
          background: linear-gradient(90deg, #ffd700 0%, #ffed4e 50%, #ffd700 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 3s linear infinite;
        }
      `}</style>

      {/* Left Side - Image Panel */}
      <Box
        className="left-panel"
        style={{
          width: '50%',
          minHeight: '100vh',
          background: `linear-gradient(135deg, rgba(102, 126, 234, 0.95) 0%, rgba(118, 75, 162, 0.95) 100%), url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Animated overlay */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle, rgba(255, 215, 0, 0.2) 0%, transparent 70%)',
          animation: 'pulse 4s ease-in-out infinite',
          pointerEvents: 'none'
        }} />

        {/* Content overlay */}
        <Box style={{
          position: 'relative',
          zIndex: 2,
          textAlign: 'center',
          padding: '40px',
          color: 'white'
        }}>
          <Group spacing="xs" position="center" mb="xl">
            <IconCoins 
              size={48} 
              color="#ffd700" 
              className="floating-icon"
              style={{ filter: 'drop-shadow(0 4px 8px rgba(255, 215, 0, 0.5))' }} 
            />
            <Title 
              order={1} 
              className="shimmer-text"
              style={{
                fontSize: '48px',
                fontWeight: 700,
                textShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                letterSpacing: '2px'
              }}
            >
              GE Metrics
            </Title>
            <IconCoins 
              size={48} 
              color="#ffd700" 
              className="floating-icon"
              style={{ 
                filter: 'drop-shadow(0 4px 8px rgba(255, 215, 0, 0.5))',
                animationDelay: '0.5s'
              }} 
            />
          </Group>

          <Title 
            order={2} 
            style={{
              fontSize: '36px',
              fontWeight: 600,
              color: 'white',
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
              marginBottom: '16px'
            }}
          >
            Grand Exchange Trading Platform
          </Title>

          <Text 
            size="lg" 
            style={{
              color: 'rgba(255, 255, 255, 0.95)',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
              marginBottom: '32px',
              lineHeight: 1.8,
              maxWidth: '500px',
              margin: '0 auto 32px'
            }}
          >
            Track flips, analyze market trends, and maximize your GP profits with real-time Grand Exchange data
          </Text>

          <Stack spacing="md" align="center">
            <Group spacing="lg">
              <Box style={{ textAlign: 'center' }}>
                <IconTrendingUp size={32} color="#51cf66" style={{ marginBottom: '8px', filter: 'drop-shadow(0 2px 4px rgba(81, 207, 102, 0.5))' }} />
                <Text size="sm" weight={500} color="white">Real-time Data</Text>
              </Box>
              <Box style={{ textAlign: 'center' }}>
                <IconCoins size={32} color="#ffd700" style={{ marginBottom: '8px', filter: 'drop-shadow(0 2px 4px rgba(255, 215, 0, 0.5))' }} />
                <Text size="sm" weight={500} color="white">Profit Tracking</Text>
              </Box>
              <Box style={{ textAlign: 'center' }}>
                <IconShield size={32} color="#228be6" style={{ marginBottom: '8px', filter: 'drop-shadow(0 2px 4px rgba(34, 139, 230, 0.5))' }} />
                <Text size="sm" weight={500} color="white">Whale Alerts</Text>
              </Box>
            </Group>
          </Stack>
        </Box>
      </Box>

      {/* Right Side - Form Panel */}
      <Box
        className="right-panel"
        style={{
          width: '50%',
          minHeight: '100vh',
          background: '#141517',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
          position: 'relative'
        }}
      >
        <Box
          className="form-card"
          style={{
            width: '100%',
            maxWidth: '450px',
            background: '#1A1B1E',
            padding: '40px',
            borderRadius: '16px',
            border: '2px solid #25262b',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            animation: 'glow 3s ease-in-out infinite'
          }}
        >
          {/* Header */}
          <Box style={{
            textAlign: 'center',
            marginBottom: '32px'
          }}>
            <Title order={2} style={{
              fontSize: '28px',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '8px'
            }}>
              {twoFactorRequired ? 'Enter Verification Code' : 'Welcome Back'}
            </Title>
            <Text size="sm" color="#C1C2C5">
              {twoFactorRequired
                ? 'Enter the 6-digit code from your authenticator app.'
                : 'Sign in to continue trading'}
            </Text>
          </Box>

          {showVerificationAlert && verificationEmail && (
            <Alert 
              icon={<IconMail size={16} />} 
              color="blue" 
              mb="md" 
              variant="filled"
              onClose={() => setShowVerificationAlert(false)}
              withCloseButton
              style={{
                borderRadius: '8px',
                background: 'rgba(34, 139, 230, 0.2)',
                border: '2px solid #228be6'
              }}
            >
              <Text size="sm" weight={500} mb="xs" color="white">Email verification required</Text>
              <Text size="xs" color="rgba(255, 255, 255, 0.8)" mb="xs">
                We've sent a verification link to <strong>{verificationEmail}</strong>.
              </Text>
              <Button
                size="xs"
                variant="light"
                onClick={handleResendVerification}
                loading={resendVerification.isLoading}
                style={{ marginTop: '8px', color: 'white' }}
              >
                Resend verification email
              </Button>
            </Alert>
          )}
          
          {error && (
            <Alert 
              icon={<IconAlertCircle size={16} />} 
              color="red" 
              mb="md"
              variant="filled"
              style={{
                borderRadius: '8px',
                background: 'rgba(250, 82, 82, 0.2)',
                border: '2px solid #fa5252'
              }}
            >
              <Text size="sm" color="white">{error}</Text>
              {error.includes('verify your email') && form.values.identifier && (
                <Button
                  size="xs"
                  variant="light"
                  onClick={handleResendVerification}
                  loading={resendVerification.isLoading}
                  style={{ marginTop: '8px', color: 'white' }}
                >
                  Resend verification email
                </Button>
              )}
            </Alert>
          )}

          {twoFactorRequired
            ? (
            <Stack>
              <Center>
                <PinInput
                  value={otp}
                  onChange={setOtp}
                  length={6}
                  size="lg"
                  styles={{
                    input: {
                      border: '3px solid #373A40',
                      borderRadius: '12px',
                      fontSize: '20px',
                      fontWeight: 700,
                      backgroundColor: '#25262b',
                      color: '#ffffff',
                      width: '50px',
                      height: '60px',
                      transition: 'all 0.3s ease'
                    }
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#ffd700'
                    e.target.style.boxShadow = '0 0 0 4px rgba(255, 215, 0, 0.2)'
                    e.target.style.transform = 'scale(1.05)'
                    e.target.style.backgroundColor = '#2C2E33'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#373A40'
                    e.target.style.boxShadow = 'none'
                    e.target.style.transform = 'scale(1)'
                    e.target.style.backgroundColor = '#25262b'
                  }}
                />
              </Center>
              <Button
                onClick={handleVerifyOtp}
                fullWidth
                size="lg"
                loading={isLoggingIn}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '16px',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                  color: '#ffffff',
                  height: '48px',
                  borderRadius: '12px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)'
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.5)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)'
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)'
                }}
              >
                Verify & Log In
              </Button>
            </Stack>
              )
            : (
            <form onSubmit={form.onSubmit(handleLogin)}>
              <Stack spacing="lg">
                <TextInput
                  label="Email or RuneScape username"
                  placeholder="Enter your email or username"
                  required
                  size="lg"
                  icon={<IconMail size={20} />}
                  {...form.getInputProps('identifier', { withError: false })}
                  styles={{
                    input: {
                      border: '3px solid #373A40',
                      borderRadius: '12px',
                      backgroundColor: '#25262b',
                      color: '#ffffff',
                      fontSize: '16px',
                      height: '52px',
                      paddingLeft: '48px',
                      transition: 'border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease, background-color 0.2s ease',
                      '&:focus': {
                        borderColor: '#ffd700',
                        boxShadow: '0 0 0 4px rgba(255, 215, 0, 0.2)',
                        transform: 'scale(1.02)',
                        backgroundColor: '#2C2E33'
                      },
                      '&:hover': {
                        borderColor: '#228be6',
                        backgroundColor: '#2C2E33'
                      },
                      '&::placeholder': {
                        color: '#909296'
                      }
                    },
                    label: {
                      color: '#C1C2C5',
                      fontWeight: 600,
                      marginBottom: '8px',
                      fontSize: '14px'
                    },
                    icon: {
                      color: '#909296'
                    }
                  }}
                />
                <PasswordInput
                  label="Password"
                  placeholder="Enter your password"
                  required
                  size="lg"
                  icon={<IconLock size={20} />}
                  {...form.getInputProps('password', { withError: false })}
                  styles={{
                    input: {
                      border: '3px solid #373A40',
                      borderRadius: '12px',
                      backgroundColor: '#25262b',
                      color: '#ffffff',
                      fontSize: '16px',
                      height: '52px',
                      paddingLeft: '48px',
                      transition: 'border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease, background-color 0.2s ease',
                      '&:focus': {
                        borderColor: '#ffd700',
                        boxShadow: '0 0 0 4px rgba(255, 215, 0, 0.2)',
                        transform: 'scale(1.02)',
                        backgroundColor: '#2C2E33'
                      },
                      '&:hover': {
                        borderColor: '#228be6',
                        backgroundColor: '#2C2E33'
                      },
                      '&::placeholder': {
                        color: '#909296'
                      }
                    },
                    label: {
                      color: '#C1C2C5',
                      fontWeight: '600',
                      marginBottom: '8px',
                      fontSize: '14px'
                    },
                    icon: {
                      color: '#909296'
                    }
                  }}
                />

                <Group position="apart">
                  <Checkbox
                    label="Remember me"
                    {...form.getInputProps('rememberMe', { type: 'checkbox' })}
                    styles={{
                      label: {
                        color: '#C1C2C5',
                        fontSize: '14px',
                        fontWeight: 500
                      },
                      input: {
                        backgroundColor: '#25262b',
                        borderColor: '#373A40'
                      }
                    }}
                  />
                  <Text
                    component="button"
                    type="button"
                    onClick={() => setRecoveryModalOpened(true)}
                    size="sm"
                    style={{ 
                      color: '#667eea', 
                      background: 'none', 
                      border: 'none', 
                      cursor: 'pointer',
                      fontWeight: 600,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#ffd700'
                      e.currentTarget.style.textDecoration = 'underline'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#667eea'
                      e.currentTarget.style.textDecoration = 'none'
                    }}
                  >
                    Forgot password?
                  </Text>
                </Group>
                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  loading={isLoggingIn}
                  leftIcon={<IconCoins size={20} />}
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '16px',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                    color: '#ffffff',
                    height: '56px',
                    borderRadius: '12px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)'
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.6)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)'
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)'
                  }}
                >
                  Log In
                </Button>
              </Stack>
            </form>
              )}

          {!twoFactorRequired && (
            <>
              <Divider 
                my="xl" 
                label="or" 
                labelPosition="center"
                styles={{
                  label: {
                    color: '#909296',
                    backgroundColor: '#1A1B1E'
                  }
                }}
                color="#373A40"
              />

              <Button
                fullWidth
                size="lg"
                variant="outline"
                leftIcon={<IconBrandGoogle size={20} />}
                onClick={handleGoogleLogin}
                style={{
                  border: '3px solid #373A40',
                  color: '#C1C2C5',
                  backgroundColor: '#25262b',
                  fontWeight: 600,
                  fontSize: '16px',
                  height: '52px',
                  borderRadius: '12px',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#667eea'
                  e.currentTarget.style.color = '#ffffff'
                  e.currentTarget.style.backgroundColor = '#2C2E33'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.2)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#373A40'
                  e.currentTarget.style.color = '#C1C2C5'
                  e.currentTarget.style.backgroundColor = '#25262b'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                Continue with Google
              </Button>
              <div id="google-signin-button" style={{ marginTop: '12px' }}></div>

              <Text align="center" mt="xl" size="sm" color="#909296">
                New to GE Metrics?{' '}
                <Link 
                  to="/signup" 
                  style={{ 
                    color: '#667eea', 
                    fontWeight: 700,
                    textDecoration: 'none',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#ffd700'
                    e.currentTarget.style.textDecoration = 'underline'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#667eea'
                    e.currentTarget.style.textDecoration = 'none'
                  }}
                >
                  Create your account
                </Link>
              </Text>
            </>
          )}
        </Box>
      </Box>

      <PasswordRecoveryModal
        opened={recoveryModalOpened}
        onClose={() => setRecoveryModalOpened(false)}
      />
    </Box>
  )
}

export default Login
