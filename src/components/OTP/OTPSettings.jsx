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
  Center,
  SimpleGrid,
  Divider,
  Modal
} from '@mantine/core'
import {
  IconShield,
  IconCheck,
  IconCopy,
  IconDeviceMobile,
  IconRefresh,
  IconDownload
} from '@tabler/icons-react'
import { trpc } from '../../utils/trpc'
import { notifications } from '@mantine/notifications'

export default function OTPSettings ({ user, onUpdate }) {
  const { data: settings, refetch } = trpc.settings.get.useQuery()
  const setupOtp = trpc.otp.setup.useMutation()
  const verifyOtp = trpc.otp.verifyAndEnable.useMutation()
  const disableOtp = trpc.otp.disable.useMutation()
  const generateBackupCodes = trpc.otp.generateBackupCodes.useMutation()

  const [setupData, setSetupData] = useState(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [backupCodes, setBackupCodes] = useState(null)
  const [showBackupCodesModal, setShowBackupCodesModal] = useState(false)
  const [regeneratingCodes, setRegeneratingCodes] = useState(false)

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
        
        // Show backup codes if provided
        if (result.backupCodes && result.backupCodes.length > 0) {
          setBackupCodes(result.backupCodes)
          setShowBackupCodesModal(true)
        }
        
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

  const handleRegenerateBackupCodes = async () => {
    setRegeneratingCodes(true)
    try {
      const result = await generateBackupCodes.mutateAsync()
      if (result.success && result.backupCodes) {
        setBackupCodes(result.backupCodes)
        setShowBackupCodesModal(true)
        notifications.show({
          title: 'Backup Codes Regenerated',
          message: 'New backup codes have been generated. Save them securely!',
          color: 'green',
          icon: <IconCheck size={18} />
        })
      }
    } catch (error) {
      notifications.show({
        title: 'Failed to Regenerate Codes',
        message: error.message || 'Could not regenerate backup codes.',
        color: 'red'
      })
    } finally {
      setRegeneratingCodes(false)
    }
  }

  const downloadBackupCodes = () => {
    if (!backupCodes) return
    
    const content = `GE-Metrics Backup Codes\n\nSave these codes in a safe place. Each code can only be used once.\n\n${backupCodes.map((code, i) => `${i + 1}. ${code}`).join('\n')}\n\nGenerated: ${new Date().toLocaleString()}\n\nIf you lose access to your authenticator app, you can use these codes to log in.`
    
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gemetrics-backup-codes-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
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
          <Stack spacing="md">
            <Group>
              <Button
                onClick={handleRegenerateBackupCodes}
                loading={regeneratingCodes}
                color="blue"
                variant="outline"
                leftIcon={<IconRefresh size={16} />}
              >
                Regenerate Backup Codes
              </Button>
              <Button
                onClick={handleDisableOTP}
                loading={disableOtp.isLoading}
                color="red"
                variant="outline"
                leftIcon={<IconShield size={16} />}
              >
                Disable 2FA
              </Button>
            </Group>
            
            <Alert color="yellow">
              <Text size="sm">
                Make sure you have backup codes saved. If you lose access to your authenticator app, 
                you'll need backup codes to log in.
              </Text>
            </Alert>
          </Stack>
        )}
      </Stack>

      {/* Backup Codes Modal */}
      <Modal
        opened={showBackupCodesModal}
        onClose={() => setShowBackupCodesModal(false)}
        title="Save Your Backup Codes"
        size="lg"
        centered
      >
        <Stack spacing="md">
          <Alert color="red" icon={<IconShield size={16} />}>
            <Text size="sm" weight={600} mb="xs">Important: Save these codes now!</Text>
            <Text size="sm">
              These codes will only be shown once. Each code can only be used once. 
              Store them in a safe place. If you lose access to your authenticator app, 
              you'll need these codes to log in.
            </Text>
          </Alert>

          {backupCodes && (
            <>
              <SimpleGrid cols={2} spacing="xs">
                {backupCodes.map((code, index) => (
                  <Code key={index} style={{ 
                    padding: '8px', 
                    textAlign: 'center',
                    fontSize: '14px',
                    fontFamily: 'monospace'
                  }}>
                    {code}
                  </Code>
                ))}
              </SimpleGrid>

              <Group position="right">
                <CopyButton value={backupCodes.join('\n')}>
                  {({ copied, copy }) => (
                    <Button
                      variant="outline"
                      leftIcon={<IconCopy size={16} />}
                      onClick={copy}
                    >
                      {copied ? 'Copied!' : 'Copy All'}
                    </Button>
                  )}
                </CopyButton>
                <Button
                  leftIcon={<IconDownload size={16} />}
                  onClick={downloadBackupCodes}
                >
                  Download
                </Button>
                <Button onClick={() => setShowBackupCodesModal(false)}>
                  I've Saved Them
                </Button>
              </Group>
            </>
          )}
        </Stack>
      </Modal>
    </Card>
  )
}
