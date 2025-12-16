import React, { useState, useContext, useEffect } from 'react'
import {
  TextInput,
  PasswordInput,
  Button,
  Title,
  Text,
  Group,
  Anchor,
  Checkbox,
  Box,
  Progress,
  Stack,
  Alert,
  Container
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../../contexts/AuthContext'
import securityService from '../../services/securityService'
import { IconX, IconCheck, IconCoins, IconTrendingUp, IconShield, IconMail } from '@tabler/icons-react'
import bgImage from '../../assets/gehd.png'

function PasswordRequirement ({ meets, label }) {
  return (
    <Text
      color={meets ? 'teal' : 'red'}
      sx={{ display: 'flex', alignItems: 'center' }}
      mt={7}
      size="sm"
      style={{
        color: meets ? '#51cf66' : '#fa5252'
      }}
    >
      {meets ? <IconCheck size={14} /> : <IconX size={14} />} <Box ml={10}>{label}</Box>
    </Text>
  )
}

const requirements = [
  { re: /[0-9]/, label: 'Includes number' },
  { re: /[a-z]/, label: 'Includes lowercase letter' },
  { re: /[A-Z]/, label: 'Includes uppercase letter' },
  { re: /[$&+,:;=?@#|'<>.^*()%!-]/, label: 'Includes special symbol' }
]

function getStrength (password) {
  let multiplier = password.length > 7 ? 0 : 1

  requirements.forEach(requirement => {
    if (!requirement.re.test(password)) {
      multiplier += 1
    }
  })

  return Math.max(100 - (100 / (requirements.length + 1)) * multiplier, 10)
}

const SignupFlow = () => {
  const navigate = useNavigate()
  const { register } = useContext(AuthContext)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)

  const form = useForm({
    initialValues: {
      email: '',
      password: '',
      runescapeName: '',
      acceptTerms: false,
      marketingEmails: false
    },
    validate: {
      email: (value) => {
        if (!value) return 'Email is required'
        if (!/^\S+@\S+\.\S+$/.test(value)) return 'Invalid email format'
        return null
      },
      password: (value) => {
        if (getStrength(value) !== 100) return 'Password does not meet all requirements'
        return null
      },
      runescapeName: (value) => {
        if (!value) return 'RuneScape username is required'
        if (value.length < 3 || value.length > 32) return 'Username must be between 3 and 32 characters'
        if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Username can only contain letters, numbers, and underscores'
        return null
      },
      acceptTerms: (value) => (value ? null : 'You must accept the terms and policy')
    },
    validateInputOnBlur: false,
    validateInputOnChange: false
  })

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

  const strength = getStrength(form.values.password)
  const checks = requirements.map((requirement, index) => (
    <PasswordRequirement key={index} label={requirement.label} meets={requirement.re.test(form.values.password)} />
  ))
  const bars = Array(4)
    .fill(0)
    .map((_, index) => (
      <Progress
        styles={{ bar: { transitionDuration: '0ms' } }}
        value={
          form.values.password.length > 0 && index === 0
            ? 100
            : strength >= ((index + 1) / 4) * 100 ? 100 : 0
        }
        color={strength > 80 ? 'teal' : strength > 50 ? 'yellow' : 'red'}
        key={index}
        size={4}
      />
    ))

  const handleSignup = async () => {
    setHasAttemptedSubmit(true)
    
    // Validate form - this will show errors if validation fails
    const validation = form.validate()
    if (validation.hasErrors) {
      // Show validation errors - they'll be displayed on individual fields
      setError('Please fix the errors below')
      return
    }

    setLoading(true)
    setError(null)

    const { email, password, runescapeName, marketingEmails } = form.values

    register({
      email,
      password,
      username: runescapeName
    }, {
      onSuccess: (data) => {
        console.log(data.message)
        setLoading(false)
        navigate(`/login?email=${encodeURIComponent(email)}`)
      },
      onError: (err) => {
        setError(err.message || 'An unexpected error occurred. Please try again.')
        setLoading(false)
      }
    })
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
            Join the Grand Exchange Trading Platform
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
            Start tracking your flips, analyzing market trends, and maximizing your GP profits with real-time Grand Exchange data
          </Text>

          <Stack spacing="md" align="center">
            <Group spacing="lg">
              <Box style={{ textAlign: 'center' }}>
                <IconTrendingUp size={32} color="#51cf66" style={{ marginBottom: '8px', filter: 'drop-shadow(0 2px 4px rgba(81, 207, 102, 0.5))' }} />
                <Text size="sm" weight={500} color="white">14-Day Free Trial</Text>
              </Box>
              <Box style={{ textAlign: 'center' }}>
                <IconCoins size={32} color="#ffd700" style={{ marginBottom: '8px', filter: 'drop-shadow(0 2px 4px rgba(255, 215, 0, 0.5))' }} />
                <Text size="sm" weight={500} color="white">Real-time Data</Text>
              </Box>
              <Box style={{ textAlign: 'center' }}>
                <IconShield size={32} color="#228be6" style={{ marginBottom: '8px', filter: 'drop-shadow(0 2px 4px rgba(34, 139, 230, 0.5))' }} />
                <Text size="sm" weight={500} color="white">Profit Tracking</Text>
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
              Create Your Account
            </Title>
            <Text size="sm" color="#C1C2C5">
              Start your 14-day free trial and begin trading
            </Text>
          </Box>

          <form onSubmit={(e) => { e.preventDefault(); handleSignup() }}>
            <Stack spacing="lg">
              <TextInput
                label="Email"
                placeholder="your.email@example.com"
                required
                autoComplete="email"
                size="lg"
                icon={<IconMail size={20} />}
                {...form.getInputProps('email', { withError: false })}
                error={form.errors.email && hasAttemptedSubmit ? form.errors.email : null}
                styles={{
                  input: {
                    border: form.errors.email && hasAttemptedSubmit ? '3px solid #fa5252' : '3px solid #373A40',
                    borderRadius: '12px',
                    backgroundColor: '#25262b',
                    color: '#ffffff',
                    fontSize: '16px',
                    height: '52px',
                    paddingLeft: '48px',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease, background-color 0.2s ease',
                    '&:focus': {
                      borderColor: form.errors.email && hasAttemptedSubmit ? '#fa5252' : '#ffd700',
                      boxShadow: form.errors.email && hasAttemptedSubmit ? '0 0 0 4px rgba(250, 82, 82, 0.2)' : '0 0 0 4px rgba(255, 215, 0, 0.2)',
                      transform: 'scale(1.02)',
                      backgroundColor: '#2C2E33'
                    },
                    '&:hover': {
                      borderColor: form.errors.email && hasAttemptedSubmit ? '#fa5252' : '#228be6',
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
                    color: form.errors.email && hasAttemptedSubmit ? '#fa5252' : '#909296'
                  },
                  error: {
                    color: '#fa5252',
                    fontSize: '13px',
                    marginTop: '4px'
                  }
                }}
              />
              
              <TextInput
                label="RuneScape Username"
                placeholder="Your RuneScape username"
                required
                autoComplete="username"
                description="3-32 characters, letters, numbers, and underscores only"
                size="lg"
                {...form.getInputProps('runescapeName', { withError: false })}
                error={form.errors.runescapeName && hasAttemptedSubmit ? form.errors.runescapeName : null}
                styles={{
                  input: {
                    border: form.errors.runescapeName && hasAttemptedSubmit ? '3px solid #fa5252' : '3px solid #373A40',
                    borderRadius: '12px',
                    backgroundColor: '#25262b',
                    color: '#ffffff',
                    fontSize: '16px',
                    height: '52px',
                    transition: 'all 0.3s ease',
                    '&:focus': {
                      borderColor: form.errors.runescapeName && hasAttemptedSubmit ? '#fa5252' : '#ffd700',
                      boxShadow: form.errors.runescapeName && hasAttemptedSubmit ? '0 0 0 4px rgba(250, 82, 82, 0.2)' : '0 0 0 4px rgba(255, 215, 0, 0.2)',
                      transform: 'scale(1.02)',
                      backgroundColor: '#2C2E33'
                    },
                    '&:hover': {
                      borderColor: form.errors.runescapeName && hasAttemptedSubmit ? '#fa5252' : '#228be6',
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
                  description: {
                    color: '#909296',
                    fontSize: '12px',
                    marginTop: '4px'
                  },
                  icon: {
                    color: form.errors.runescapeName && hasAttemptedSubmit ? '#fa5252' : '#909296'
                  },
                  error: {
                    color: '#fa5252',
                    fontSize: '13px',
                    marginTop: '4px'
                  }
                }}
              />
              
              <PasswordInput
                label="Password"
                placeholder="Create a strong password"
                required
                autoComplete="new-password"
                size="lg"
                icon={<IconShield size={20} />}
                {...form.getInputProps('password', { withError: false })}
                error={form.errors.password && hasAttemptedSubmit ? form.errors.password : null}
                styles={{
                  input: {
                    border: form.errors.password && hasAttemptedSubmit ? '3px solid #fa5252' : '3px solid #373A40',
                    borderRadius: '12px',
                    backgroundColor: '#25262b',
                    color: '#ffffff',
                    fontSize: '16px',
                    height: '52px',
                    paddingLeft: '48px',
                    transition: 'all 0.3s ease',
                    '&:focus': {
                      borderColor: form.errors.password && hasAttemptedSubmit ? '#fa5252' : '#ffd700',
                      boxShadow: form.errors.password && hasAttemptedSubmit ? '0 0 0 4px rgba(250, 82, 82, 0.2)' : '0 0 0 4px rgba(255, 215, 0, 0.2)',
                      transform: 'scale(1.02)',
                      backgroundColor: '#2C2E33'
                    },
                    '&:hover': {
                      borderColor: form.errors.password && hasAttemptedSubmit ? '#fa5252' : '#228be6',
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
                    color: form.errors.password && hasAttemptedSubmit ? '#fa5252' : '#909296'
                  },
                  error: {
                    color: '#fa5252',
                    fontSize: '13px',
                    marginTop: '4px'
                  }
                }}
              />

              {hasAttemptedSubmit && (
                <>
                  <Group spacing={5} grow>
                    {bars}
                  </Group>
                  {checks}
                </>
              )}

              <Box>
                <Checkbox
                  label="I accept the terms of service and privacy policy"
                  required
                  {...form.getInputProps('acceptTerms', { type: 'checkbox', withError: false })}
                  styles={{
                    label: {
                      color: '#C1C2C5',
                      fontSize: '14px',
                      fontWeight: 500
                    },
                    input: {
                      backgroundColor: '#25262b',
                      borderColor: form.errors.acceptTerms && hasAttemptedSubmit ? '#fa5252' : '#373A40'
                    }
                  }}
                />
                {form.errors.acceptTerms && hasAttemptedSubmit && (
                  <Text size="xs" color="#fa5252" mt={4} ml={28}>
                    {form.errors.acceptTerms}
                  </Text>
                )}
              </Box>
              <Checkbox
                label="Send me marketing emails about new features and updates"
                {...form.getInputProps('marketingEmails', { type: 'checkbox' })}
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

              {error && !form.errors.email && !form.errors.password && !form.errors.runescapeName && !form.errors.acceptTerms && hasAttemptedSubmit && (
                <Alert 
                  color="red" 
                  icon={<IconX size={16} />}
                  variant="filled"
                  style={{
                    borderRadius: '8px',
                    background: 'rgba(250, 82, 82, 0.2)',
                    border: '2px solid #fa5252'
                  }}
                >
                  <Text size="sm" color="white">{error}</Text>
                </Alert>
              )}

              <Button 
                fullWidth 
                type="submit" 
                loading={loading}
                size="lg"
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
                Start Trading
              </Button>
            </Stack>
          </form>

          <Text align="center" mt="xl" size="sm" color="#909296">
            Already have an account?{' '}
            <Anchor 
              component="button" 
              onClick={() => navigate('/login')}
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
              Log in
            </Anchor>
          </Text>
        </Box>
      </Box>
    </Box>
  )
}

export default SignupFlow
