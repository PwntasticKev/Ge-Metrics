import React, { useState } from 'react'
import { Modal, TextInput, Button, Group, Text, Stack, Alert, Code, Stepper } from '@mantine/core'
import { IconMail, IconShieldLock, IconCheck, IconAlertCircle } from '@tabler/icons-react'
import { useForm } from '@mantine/form'
import { trpc } from '../../utils/trpc'

const PasswordRecoveryModal = ({ opened, onClose }) => {
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
    }
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
      title="Password Recovery"
      size="md"
      centered
    >
      <Stack spacing="md">
        <Stepper active={activeStep} breakpoint="sm">
          {steps.map((step, index) => (
            <Stepper.Step key={index} label={step.title} description={step.description} icon={step.icon} />
          ))}
        </Stepper>

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
            {error}
          </Alert>
        )}

        {success && (
          <Alert icon={<IconCheck size={16} />} title="Success" color="green">
            {success}
          </Alert>
        )}

        {/* Step 1: Request OTP */}
        {activeStep === 0 && (
          <form onSubmit={form.onSubmit(handleRequestOtp)}>
            <Stack spacing="md">
              <Text size="sm" color="dimmed">
                Enter your email address and we'll send you a verification code to reset your password.
              </Text>

              <TextInput
                label="Email Address"
                placeholder="your@email.com"
                required
                {...form.getInputProps('email')}
              />

              <Group position="right">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={isLoading}
                  disabled={!form.values.email || !form.isValid()}
                >
                  Send OTP
                </Button>
              </Group>
            </Stack>
          </form>
        )}

        {/* Step 2: Verify OTP and Set New Password */}
        {activeStep === 1 && (
          <form onSubmit={form.onSubmit(handleVerifyOtpAndChangePassword)}>
            <Stack spacing="md">
              <Text size="sm" color="dimmed">
                Enter the 6-digit code sent to your email and your new password.
              </Text>

              {otpExpiresAt && (
                <Alert color="blue" title="OTP Expires">
                  Code expires at: {new Date(otpExpiresAt).toLocaleTimeString()}
                </Alert>
              )}

              <TextInput
                label="OTP Code"
                placeholder="123456"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                maxLength={6}
                required
              />

              <TextInput
                label="New Password"
                type="password"
                placeholder="Enter new password"
                required
                {...form.getInputProps('newPassword')}
              />

              <TextInput
                label="Confirm New Password"
                type="password"
                placeholder="Confirm new password"
                required
                {...form.getInputProps('confirmPassword')}
              />

              <Group position="apart">
                <Button variant="outline" onClick={() => setActiveStep(0)}>
                  Back
                </Button>
                <Group>
                  <Button variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    loading={isLoading}
                    disabled={!otpCode || otpCode.length !== 6 || !form.isValid()}
                  >
                    Change Password
                  </Button>
                </Group>
              </Group>
            </Stack>
          </form>
        )}

        {/* Step 3: Success */}
        {activeStep === 2 && (
          <Stack spacing="md">
            <Alert icon={<IconCheck size={16} />} title="Success!" color="green">
              Your password has been successfully changed. You can now log in with your new password.
            </Alert>

            <Group position="right">
              <Button onClick={handleClose}>
                Close
              </Button>
            </Group>
          </Stack>
        )}
      </Stack>
    </Modal>
  )
}

export default PasswordRecoveryModal
