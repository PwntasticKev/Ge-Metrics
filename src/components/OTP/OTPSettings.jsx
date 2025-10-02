import { useState } from 'react'
import {
  Card,
  Text,
  Button,
  Group,
  Stack,
  Image,
  Alert,
  Badge,
  CopyButton,
  ActionIcon,
  Tooltip,
  Code,
  Box,
  PinInput,
  Center
} from '@mantine/core'
import {
  IconShield,
  IconCheck,
  IconCopy,
  IconDeviceMobile
} from '@tabler/icons-react'
import { trpc } from '../../utils/trpc'
import { notifications } from '@mantine/notifications'

export default function OTPSettings ({ user, onUpdate }) {
  const { data: settings, refetch } = trpc.settings.get.useQuery()
  const setupOtp = trpc.otp.setup.useMutation()
  const verifyOtp = trpc.otp.verifyAndEnable.useMutation()
  const disableOtp = trpc.otp.disable.useMutation()

  const [setupData, setSetupData] = useState(null)
  const [verificationCode, setVerificationCode] = useState('')

  const otpEnabled = settings?.otpEnabled || false

  const handleSetupOTP = async () => {
    try {
      const result = await setupOtp.mutateAsync()
      setSetupData(result)
    } catch (error) {
      notifications.show({
        title: 'Setup Failed',
        message: error.message || 'Could not start 2FA setup.',
        color: 'red'
      })
    }
  }

  const handleVerifyAndEnable = async () => {
    if (verificationCode.length !== 6) return
    try {
      const result = await verifyOtp.mutateAsync({ token: verificationCode })
      if (result.success) {
        notifications.show({
          title: '2FA Enabled',
          message: 'Two-Factor Authentication has been successfully enabled.',
          color: 'green',
          icon: <IconCheck size={18} />
        })
        setSetupData(null)
        setVerificationCode('')
        refetch()
        onUpdate() // This will refetch user/settings in the parent
      }
    } catch (error) {
      notifications.show({
        title: 'Verification Failed',
        message: error.message || 'Invalid verification code.',
        color: 'red'
      })
    }
  }

  const handleDisableOTP = async () => {
    try {
      const result = await disableOtp.mutateAsync()
      if (result.success) {
        notifications.show({
          title: '2FA Disabled',
          message: 'Two-Factor Authentication has been disabled.',
          color: 'orange'
        })
        refetch()
        onUpdate()
      }
    } catch (error) {
      notifications.show({
        title: 'Failed to Disable 2FA',
        message: error.message,
        color: 'red'
      })
    }
  }

  const handleCancelSetup = () => {
    setSetupData(null)
    setVerificationCode('')
  }

  return (
    <Card withBorder p="lg">
      <Group spacing="sm" mb="md">
        <IconShield size={20} />
        <Text size="lg" weight={600}>Two-Factor Authentication</Text>
        {otpEnabled
          ? <Badge color="green" size="sm">Enabled</Badge>
          : <Badge color="red" size="sm">Disabled</Badge>}
      </Group>

      <Stack spacing="md">
        <Alert color={otpEnabled ? 'green' : 'yellow'}>
          <Text size="sm">
            {otpEnabled
              ? 'Two-factor authentication is active on your account.'
              : 'Add an extra layer of security to your account. We recommend enabling 2FA.'}
          </Text>
        </Alert>

        {!otpEnabled && !setupData && (
          <Button
            onClick={handleSetupOTP}
            loading={setupOtp.isLoading}
            color="green"
            leftIcon={<IconShield size={16} />}
          >
            Enable Two-Factor Authentication
          </Button>
        )}

        {setupData && (
          <Box>
            <Alert color="blue" icon={<IconDeviceMobile size={16} />} mb="md">
              <Text size="sm">
                Scan the QR code with your authenticator app (e.g., Google Authenticator, Authy).
              </Text>
            </Alert>

            <Stack spacing="lg" align="center">
              <Image
                src={setupData.qrCodeDataURL}
                alt="2FA QR Code"
                width={200}
                height={200}
              />

              <div>
                <Text size="sm" weight={500} mb="xs">Or enter this key manually:</Text>
                <Group spacing="xs">
                  <Code style={{ flex: 1, fontSize: '12px' }}>{setupData.secret}</Code>
                  <CopyButton value={setupData.secret}>
                    {({ copied, copy }) => (
                      <Tooltip label={copied ? 'Copied' : 'Copy'}>
                        <ActionIcon color={copied ? 'teal' : 'gray'} onClick={copy}>
                          {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </CopyButton>
                </Group>
              </div>

              <div>
                <Text size="sm" weight={500} mb="xs">Verify Setup:</Text>
                <Text size="xs" color="dimmed" mb="sm">
                  Enter the 6-digit code from your authenticator app.
                </Text>
                <Center>
                  <PinInput
                    value={verificationCode}
                    onChange={setVerificationCode}
                    length={6}
                    size="lg"
                  />
                </Center>
              </div>

              <Group position="right" style={{ width: '100%' }}>
                <Button variant="outline" onClick={handleCancelSetup}>
                  Cancel
                </Button>
                <Button
                  onClick={handleVerifyAndEnable}
                  loading={verifyOtp.isLoading}
                  disabled={verificationCode.length !== 6}
                  color="green"
                >
                  Verify & Enable
                </Button>
              </Group>
            </Stack>
          </Box>
        )}

        {otpEnabled && (
          <Button
            onClick={handleDisableOTP}
            loading={disableOtp.isLoading}
            color="red"
            variant="outline"
            leftIcon={<IconShield size={16} />}
          >
            Disable 2FA
          </Button>
        )}
      </Stack>
    </Card>
  )
}
