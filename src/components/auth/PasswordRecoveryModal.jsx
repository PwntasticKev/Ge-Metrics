import React, { useState } from 'react'
import { Modal, TextInput, PasswordInput, Button, Group, Text, Stack, Alert, Stepper, PinInput, Center, Box, Title, useMantineTheme } from '@mantine/core'
import { IconMail, IconShieldLock, IconCheck, IconAlertCircle, IconLock, IconKey } from '@tabler/icons-react'
import { useForm } from '@mantine/form'
import { useMediaQuery } from '@mantine/hooks'
import { trpc } from '../../utils/trpc'

const PasswordRecoveryModal = ({ opened, onClose }) => {
  const theme = useMantineTheme()
  const isMobile = useMediaQuery('(max-width: 768px)')
  const [activeStep, setActiveStep] = useState(0)
  const [otpCode, setOtpCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpExpiresAt, setOtpExpiresAt] = useState(null)

  const form = useForm({
    initialValues: {
      email: '',
      newPassword: '',
      confirmPassword: ''
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
      newPassword: (value) => (value.length >= 8 ? null : 'Password must be at least 8 characters'),
      confirmPassword: (value, values) =>
        value === values.newPassword ? null : 'Passwords do not match'
    },
    validateInputOnBlur: false,
    validateInputOnChange: false
  })

  const requestOtpMutation = trpc.auth.requestPasswordChangeOtp.useMutation()
  const changePasswordMutation = trpc.auth.changePasswordWithOtp.useMutation()

  const handleRequestOtp = async () => {
    setIsLoading(true)
    setError('')

    try {
      const result = await requestOtpMutation.mutateAsync({
        email: form.values.email
      })

      setOtpSent(true)
      setOtpExpiresAt(result.expiresAt)
      setActiveStep(1)

      // Show OTP in development
      if (result.otpCode) {
        setSuccess(`OTP sent! Code: ${result.otpCode} (Development only)`)
      } else {
        setSuccess('OTP sent to your email!')
      }
    } catch (err) {
      setError(err.message || 'Failed to send OTP')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOtpAndChangePassword = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter a valid 6-digit OTP')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      await changePasswordMutation.mutateAsync({
        email: form.values.email,
        otpCode,
        newPassword: form.values.newPassword
      })

      setSuccess('Password changed successfully! You can now log in with your new password.')
      setActiveStep(2)
    } catch (err) {
      setError(err.message || 'Failed to change password')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    onClose()
    setActiveStep(0)
    setOtpCode('')
    setError('')
    setSuccess('')
    setOtpSent(false)
    setOtpExpiresAt(null)
    form.reset()
  }

  const steps = [
    {
      title: 'Request OTP',
      description: 'Enter your email to receive a verification code',
      icon: <IconMail size={18} />
    },
    {
      title: 'Verify & Change',
      description: 'Enter the OTP and your new password',
      icon: <IconShieldLock size={18} />
    },
    {
      title: 'Complete',
      description: 'Password successfully changed',
      icon: <IconCheck size={18} />
    }
  ]

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={null}
      size={isMobile ? "100%" : "md"}
      fullScreen={isMobile}
      centered={!isMobile}
      overlayProps={{
        backgroundOpacity: 0.7,
        blur: 3
      }}
      styles={{
        content: {
          background: '#1A1B1E',
          border: '2px solid #25262b',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
        },
        header: {
          background: 'transparent',
          borderBottom: 'none',
          padding: '0'
        },
        body: {
          padding: '40px'
        }
      }}
    >
      <style>{`
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
        .modal-content {
          animation: slideUp 0.4s ease-out;
        }
      `}</style>
      
      <Box className="modal-content">
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
            {activeStep === 0 ? 'Reset Password' : activeStep === 1 ? 'Enter Verification Code' : 'Password Reset'}
          </Title>
          <Text size="sm" color="#C1C2C5">
            {activeStep === 0 
              ? 'Enter your email to receive a verification code'
              : activeStep === 1 
              ? 'Enter the code sent to your email and your new password'
              : 'Your password has been successfully reset'}
          </Text>
        </Box>

        {/* Progress Stepper */}
        <Box mb="xl">
          <Stepper 
            active={activeStep} 
            breakpoint="sm"
            color="#667eea"
            styles={{
              stepBody: {
                marginTop: '8px'
              },
              stepDescription: {
                color: '#909296',
                fontSize: '12px'
              },
              stepLabel: {
                color: '#C1C2C5',
                fontWeight: 600
              },
              stepIcon: {
                borderColor: '#373A40',
                backgroundColor: '#25262b',
                color: '#909296'
              },
              separator: {
                backgroundColor: '#373A40'
              }
            }}
          >
            {steps.map((step, index) => (
              <Stepper.Step 
                key={index} 
                label={step.title} 
                description={step.description} 
                icon={step.icon} 
              />
            ))}
          </Stepper>
        </Box>

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
          </Alert>
        )}

        {success && (
          <Alert 
            icon={<IconCheck size={16} />} 
            color="green" 
            mb="md"
            variant="filled"
            style={{
              borderRadius: '8px',
              background: 'rgba(81, 207, 102, 0.2)',
              border: '2px solid #51cf66'
            }}
          >
            <Text size="sm" color="white">{success}</Text>
          </Alert>
        )}

        {/* Step 1: Request OTP */}
        {activeStep === 0 && (
          <form onSubmit={form.onSubmit(handleRequestOtp)}>
            <Stack spacing="lg">
              <TextInput
                label="Email Address"
                placeholder="Enter your email"
                required
                size={isMobile ? "md" : "lg"}
                icon={<IconMail size={isMobile ? 18 : 20} />}
                {...form.getInputProps('email', { withError: false })}
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
                  },
                  error: {
                    color: '#fa5252',
                    fontSize: '12px',
                    marginTop: '4px'
                  }
                }}
              />

              <Group position="right" mt="md">
                <Button 
                  variant="outline" 
                  onClick={handleClose}
                  size={isMobile ? "md" : "lg"}
                  style={{
                    borderColor: '#373A40',
                    color: '#C1C2C5',
                    borderRadius: '12px',
                    height: '48px',
                    fontWeight: 600,
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#909296'
                    e.currentTarget.style.backgroundColor = '#25262b'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#373A40'
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={isLoading}
                  disabled={!form.values.email || !form.isValid()}
                  size={isMobile ? "md" : "lg"}
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
                  Send Verification Code
                </Button>
              </Group>
            </Stack>
          </form>
        )}

        {/* Step 2: Verify OTP and Set New Password */}
        {activeStep === 1 && (
          <form onSubmit={form.onSubmit(handleVerifyOtpAndChangePassword)}>
            <Stack spacing="lg">
              {otpExpiresAt && (
                <Alert 
                  color="blue" 
                  variant="filled"
                  style={{
                    borderRadius: '8px',
                    background: 'rgba(34, 139, 230, 0.2)',
                    border: '2px solid #228be6'
                  }}
                >
                  <Text size="sm" color="white" weight={500}>
                    Code expires at: {new Date(otpExpiresAt).toLocaleTimeString()}
                  </Text>
                </Alert>
              )}

              <Box>
                <Text size="sm" weight={600} color="#C1C2C5" mb="md" style={{ textAlign: 'center' }}>
                  Enter 6-digit verification code
                </Text>
                <Center>
                  <PinInput
                    value={otpCode}
                    onChange={setOtpCode}
                    length={6}
                    size={isMobile ? "md" : "lg"}
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
              </Box>

              <PasswordInput
                label="New Password"
                placeholder="Enter new password"
                required
                size="lg"
                icon={<IconLock size={20} />}
                {...form.getInputProps('newPassword', { withError: false })}
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
                  },
                  error: {
                    color: '#fa5252',
                    fontSize: '12px',
                    marginTop: '4px'
                  }
                }}
              />

              <PasswordInput
                label="Confirm New Password"
                placeholder="Confirm new password"
                required
                size="lg"
                icon={<IconKey size={20} />}
                {...form.getInputProps('confirmPassword', { withError: false })}
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
                  },
                  error: {
                    color: '#fa5252',
                    fontSize: '12px',
                    marginTop: '4px'
                  }
                }}
              />

              <Group position="apart" mt="md">
                <Button 
                  variant="outline" 
                  onClick={() => setActiveStep(0)}
                  size="lg"
                  style={{
                    borderColor: '#373A40',
                    color: '#C1C2C5',
                    borderRadius: '12px',
                    height: '48px',
                    fontWeight: 600,
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#909296'
                    e.currentTarget.style.backgroundColor = '#25262b'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#373A40'
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  Back
                </Button>
                <Group>
                  <Button 
                    variant="outline" 
                    onClick={handleClose}
                    size="lg"
                    style={{
                      borderColor: '#373A40',
                      color: '#C1C2C5',
                      borderRadius: '12px',
                      height: '48px',
                      fontWeight: 600,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#909296'
                      e.currentTarget.style.backgroundColor = '#25262b'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#373A40'
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    loading={isLoading}
                    disabled={!otpCode || otpCode.length !== 6 || !form.isValid()}
                    size="lg"
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
                    Reset Password
                  </Button>
                </Group>
              </Group>
            </Stack>
          </form>
        )}

        {/* Step 3: Success */}
        {activeStep === 2 && (
          <Stack spacing="lg">
            <Center>
              <Box style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #51cf66 0%, #40c057 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '24px',
                boxShadow: '0 8px 24px rgba(81, 207, 102, 0.4)'
              }}>
                <IconCheck size={40} color="white" />
              </Box>
            </Center>
            
            <Alert 
              icon={<IconCheck size={16} />} 
              color="green"
              variant="filled"
              style={{
                borderRadius: '8px',
                background: 'rgba(81, 207, 102, 0.2)',
                border: '2px solid #51cf66'
              }}
            >
              <Text size="sm" color="white" weight={500} mb="xs">Password Reset Successful!</Text>
              <Text size="xs" color="rgba(255, 255, 255, 0.9)">
                Your password has been successfully changed. You can now log in with your new password.
              </Text>
            </Alert>

            <Group position="right" mt="md">
              <Button 
                onClick={handleClose}
                size={isMobile ? "md" : "lg"}
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
                Close
              </Button>
            </Group>
          </Stack>
        )}
      </Box>
    </Modal>
  )
}

export default PasswordRecoveryModal
