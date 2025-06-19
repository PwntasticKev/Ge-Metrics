import { useState } from 'react'
import {
  Modal,
  Stack,
  TextInput,
  PasswordInput,
  Button,
  Group,
  Text,
  Alert,
  Stepper,
  Textarea,
  Badge,
  Divider
} from '@mantine/core'
import {
  IconKey,
  IconShield,
  IconDeviceMobile,
  IconAlertTriangle,
  IconUserSearch,
  IconLock
} from '@tabler/icons-react'
import otpService from '../../services/otpService.js'

export default function MasterAccessModal ({ opened, onClose, targetUser, adminUser }) {
  const [activeStep, setActiveStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [masterPassword, setMasterPassword] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [accessReason, setAccessReason] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleMasterPasswordSubmit = async () => {
    if (!masterPassword.trim()) {
      setError('Master password is required')
      return
    }

    if (!accessReason.trim()) {
      setError('Access reason is required')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await otpService.verifyMasterPassword(
        masterPassword,
        targetUser?.id,
        adminUser?.id,
        accessReason
      )

      if (result.success) {
        setSuccess(result.message)
        setActiveStep(1)
      } else {
        setError(result.error || 'Invalid master password')
      }
    } catch (error) {
      setError('Error verifying master password')
    } finally {
      setLoading(false)
    }
  }

  const handleOTPSubmit = async () => {
    if (!otpCode.trim() || otpCode.length !== 6) {
      setError('Please enter a 6-digit OTP code')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await otpService.completeMasterAccess(
        adminUser?.id,
        targetUser?.id,
        otpCode,
        accessReason,
        window.location.hostname,
        navigator.userAgent
      )

      if (result.success) {
        setSuccess('Master access granted! You can now access the user account.')

        // Store access token temporarily
        sessionStorage.setItem('masterAccessToken', result.accessToken)

        // Close modal and redirect or perform action
        setTimeout(() => {
          onClose()
          // You could redirect to the user's account here
          // window.location.href = `/admin/user/${targetUser.id}/impersonate`
        }, 2000)
      } else {
        setError(result.error || 'Invalid OTP code')
      }
    } catch (error) {
      setError('Error verifying OTP code')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setActiveStep(0)
    setMasterPassword('')
    setOtpCode('')
    setAccessReason('')
    setError('')
    setSuccess('')
    onClose()
  }

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Master Access - Super Admin Authentication"
      size="lg"
      closeOnClickOutside={false}
      closeOnEscape={false}
    >
      <Stack spacing="lg">
        <Alert icon={<IconAlertTriangle size={16} />} color="red">
          <Text size="sm">
            <strong>Warning:</strong> You are about to access another user's account.
            This action will be logged and audited for security purposes.
          </Text>
        </Alert>

        {targetUser && (
          <div style={{
            background: '#f8f9fa',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid #dee2e6'
          }}>
            <Group spacing="sm" mb="xs">
              <IconUserSearch size={16} />
              <Text size="sm" weight={500}>Target User Account</Text>
            </Group>
            <Stack spacing="xs">
              <Group spacing="sm">
                <Text size="sm" weight={500}>Name:</Text>
                <Text size="sm">{targetUser.name}</Text>
              </Group>
              <Group spacing="sm">
                <Text size="sm" weight={500}>Email:</Text>
                <Text size="sm">{targetUser.email}</Text>
              </Group>
              <Group spacing="sm">
                <Text size="sm" weight={500}>User ID:</Text>
                <Badge size="sm" variant="outline">{targetUser.id}</Badge>
              </Group>
            </Stack>
          </div>
        )}

        <Stepper active={activeStep} onStepClick={setActiveStep} allowNextStepsSelect={false}>
          <Stepper.Step
            label="Master Password"
            description="Enter super admin master password"
            icon={<IconKey size={18} />}
          >
            <Stack spacing="md" mt="md">
              <Textarea
                label="Access Reason"
                description="Explain why you need to access this user's account"
                placeholder="e.g., User reported login issues, investigating suspicious activity..."
                value={accessReason}
                onChange={(e) => setAccessReason(e.target.value)}
                required
                minRows={2}
                maxRows={4}
              />

              <PasswordInput
                label="Master Password"
                description="Enter the super admin master password"
                placeholder="Enter master password"
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
                icon={<IconLock size={16} />}
                required
              />

              <Group position="right">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleMasterPasswordSubmit}
                  loading={loading}
                  disabled={!masterPassword.trim() || !accessReason.trim()}
                >
                  Verify Password
                </Button>
              </Group>
            </Stack>
          </Stepper.Step>

          <Stepper.Step
            label="OTP Verification"
            description="Enter code from SMS/Email"
            icon={<IconDeviceMobile size={18} />}
          >
            <Stack spacing="md" mt="md">
              <Alert icon={<IconShield size={16} />} color="blue">
                <Text size="sm">
                  An OTP code has been sent to your registered phone number and email address.
                  Enter the 6-digit code to complete master access authentication.
                </Text>
              </Alert>

              <TextInput
                label="OTP Code"
                description="Enter the 6-digit code from SMS or email"
                placeholder="123456"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                size="lg"
                styles={{
                  input: {
                    fontSize: '18px',
                    letterSpacing: '4px',
                    textAlign: 'center',
                    fontFamily: 'monospace'
                  }
                }}
              />

              <Group position="right">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleOTPSubmit}
                  loading={loading}
                  disabled={otpCode.length !== 6}
                >
                  Grant Access
                </Button>
              </Group>
            </Stack>
          </Stepper.Step>

          <Stepper.Completed>
            <Stack spacing="md" mt="md">
              <Alert icon={<IconShield size={16} />} color="green">
                <Text size="sm">
                  <strong>Access Granted!</strong> Master access has been authenticated and logged.
                </Text>
              </Alert>

              <div style={{
                background: '#f8f9fa',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #dee2e6'
              }}>
                <Text size="sm" weight={500} mb="xs">Access Details:</Text>
                <Stack spacing="xs">
                  <Group spacing="sm">
                    <Text size="sm" weight={500}>Admin:</Text>
                    <Text size="sm">{adminUser?.name} ({adminUser?.email})</Text>
                  </Group>
                  <Group spacing="sm">
                    <Text size="sm" weight={500}>Target User:</Text>
                    <Text size="sm">{targetUser?.name} ({targetUser?.email})</Text>
                  </Group>
                  <Group spacing="sm">
                    <Text size="sm" weight={500}>Reason:</Text>
                    <Text size="sm">{accessReason}</Text>
                  </Group>
                  <Group spacing="sm">
                    <Text size="sm" weight={500}>Session Duration:</Text>
                    <Text size="sm">30 minutes</Text>
                  </Group>
                </Stack>
              </div>

              <Group position="right">
                <Button onClick={handleClose}>
                  Close
                </Button>
              </Group>
            </Stack>
          </Stepper.Completed>
        </Stepper>

        {error && (
          <Alert icon={<IconAlertTriangle size={16} />} color="red">
            {error}
          </Alert>
        )}

        {success && (
          <Alert icon={<IconShield size={16} />} color="green">
            {success}
          </Alert>
        )}
      </Stack>
    </Modal>
  )
}
