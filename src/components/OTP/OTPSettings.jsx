import { useState } from 'react'
import {
  Card,
  Text,
  Button,
  Group,
  Stack,
  Switch,
  TextInput,
  Image,
  Alert,
  Divider,
  Badge,
  CopyButton,
  ActionIcon,
  Tooltip,
  Grid,
  Code,
  Box
} from '@mantine/core'
import {
  IconShield,
  IconShieldCheck,
  IconShieldX,
  IconQrcode,
  IconCopy,
  IconCheck,
  IconAlertTriangle,
  IconKey,
  IconDeviceMobile,
  IconEye,
  IconEyeOff
} from '@tabler/icons-react'
import otpService from '../../services/otpService.js'

export default function OTPSettings ({ user, onUpdate }) {
  const [otpEnabled, setOtpEnabled] = useState(user?.otp_enabled || false)
  const [setupInProgress, setSetupInProgress] = useState(false)
  const [disableModalOpened, setDisableModalOpened] = useState(false)
  const [loading, setLoading] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [setupData, setSetupData] = useState(null)
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number || '')
  const [qrBlurred, setQrBlurred] = useState(true)

  const handleSetupOTP = async () => {
    try {
      setLoading(true)
      const result = await otpService.setupOTP(user.id, user.email)

      if (result.success) {
        setSetupData(result)
        setSetupInProgress(true)
        setQrBlurred(true) // Reset blur state
      }
    } catch (error) {
      console.error('Error setting up OTP:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyAndEnable = async () => {
    try {
      setLoading(true)
      const result = await otpService.enableOTP(user.id, verificationCode)

      if (result.success) {
        setOtpEnabled(true)
        setSetupInProgress(false)
        setVerificationCode('')
        setSetupData(null)
        onUpdate({ ...user, otp_enabled: true })
      } else {
        alert(result.error || 'Invalid verification code')
      }
    } catch (error) {
      console.error('Error enabling OTP:', error)
      alert('Error enabling OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleDisableOTP = async () => {
    try {
      setLoading(true)
      const result = await otpService.disableOTP(user.id)

      if (result.success) {
        setOtpEnabled(false)
        setDisableModalOpened(false)
        setSetupInProgress(false)
        setSetupData(null)
        onUpdate({ ...user, otp_enabled: false })
      }
    } catch (error) {
      console.error('Error disabling OTP:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelSetup = () => {
    setSetupInProgress(false)
    setSetupData(null)
    setVerificationCode('')
    setQrBlurred(true)
  }

  const toggleQrBlur = () => {
    setQrBlurred(!qrBlurred)
  }

  const handlePhoneUpdate = async () => {
    try {
      // This would update the phone number in the database
      console.log('Updating phone number:', phoneNumber)
      onUpdate({ ...user, phone_number: phoneNumber })
    } catch (error) {
      console.error('Error updating phone number:', error)
    }
  }

  return (
    <>
      <Card withBorder p="lg">
        <Group spacing="sm" mb="md">
          <IconShield size={20} />
          <Text size="lg" weight={600}>Two-Factor Authentication</Text>
          {otpEnabled
            ? (
            <Badge color="green" size="sm" leftIcon={<IconShieldCheck size={12} />}>
              Enabled
            </Badge>
              )
            : (
            <Badge color="red" size="sm" leftIcon={<IconShieldX size={12} />}>
              Disabled
            </Badge>
              )}
        </Group>

        <Stack spacing="md">
          <Alert color={otpEnabled ? 'green' : 'yellow'} icon={<IconShield size={16} />}>
            <Text size="sm">
              {otpEnabled
                ? 'Two-factor authentication is enabled on your account. Your account is more secure.'
                : 'Two-factor authentication adds an extra layer of security to your account. We recommend enabling it.'}
            </Text>
          </Alert>

          {!otpEnabled && !setupInProgress && (
            <div>
              <Text size="sm" mb="md">
                Enable 2FA to protect your account with an additional security layer using your mobile device.
              </Text>
              <Button
                leftIcon={<IconShield size={16} />}
                onClick={handleSetupOTP}
                loading={loading}
                color="green"
              >
                Setup Two-Factor Authentication
              </Button>
            </div>
          )}

          {setupInProgress && setupData && (
            <Box>
              <Alert color="blue" icon={<IconDeviceMobile size={16} />} mb="md">
                <Text size="sm">
                  Scan the QR code below with your authenticator app (Google Authenticator, Authy, etc.)
                  or enter the manual key.
                </Text>
              </Alert>

              <Stack spacing="md">
                <div style={{ textAlign: 'center', position: 'relative' }}>
                  <Image
                    src={setupData.qrCodeURL}
                    alt="QR Code for 2FA setup"
                    width={200}
                    height={200}
                    fit="contain"
                    style={{
                      filter: qrBlurred ? 'blur(8px)' : 'none',
                      transition: 'filter 0.3s ease',
                      cursor: 'pointer'
                    }}
                    onClick={toggleQrBlur}
                  />
                  {qrBlurred && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        background: 'rgba(0,0,0,0.8)',
                        color: 'white',
                        padding: '8px 16px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                      onClick={toggleQrBlur}
                    >
                      <IconEye size={16} />
                      <Text size="sm">Click to reveal QR code</Text>
                    </div>
                  )}
                </div>

                <div>
                  <Text size="sm" weight={500} mb="xs">Manual Entry Key:</Text>
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
                  <Text size="sm" weight={500} mb="xs">Backup Codes:</Text>
                  <Text size="xs" color="dimmed" mb="xs">
                    Save these codes in a safe place. You can use them to access your account if you lose your device.
                  </Text>
                  <Grid>
                    {setupData.backupCodes.map((code, index) => (
                      <Grid.Col span={6} key={index}>
                        <Code size="xs">{code}</Code>
                      </Grid.Col>
                    ))}
                  </Grid>
                </div>

                <Divider />

                <div>
                  <Text size="sm" weight={500} mb="xs">Verify Setup:</Text>
                  <Text size="xs" color="dimmed" mb="sm">
                    Enter the 6-digit code from your authenticator app to complete setup:
                  </Text>
                  <TextInput
                    placeholder="123456"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    maxLength={6}
                    icon={<IconKey size={16} />}
                  />
                </div>

                <Group position="right">
                  <Button variant="outline" onClick={handleCancelSetup}>
                    Cancel Setup
                  </Button>
                  <Button
                    onClick={handleVerifyAndEnable}
                    loading={loading}
                    disabled={verificationCode.length !== 6}
                    color="green"
                  >
                    Enable 2FA
                  </Button>
                </Group>
              </Stack>
            </Box>
          )}

          {otpEnabled && (
            <div>
              <Text size="sm" mb="md">
                Two-factor authentication is active on your account. You can disable it below.
              </Text>
              <Group>
                <Button
                  leftIcon={<IconShieldX size={16} />}
                  onClick={handleDisableOTP}
                  loading={loading}
                  color="red"
                  variant="outline"
                >
                  Disable 2FA
                </Button>
              </Group>
            </div>
          )}

          <Divider />

          <div>
            <Text size="sm" weight={500} mb="xs">Recovery Phone Number (Optional)</Text>
            <Text size="xs" color="dimmed" mb="sm">
              Add a phone number for account recovery purposes.
            </Text>
            <Group>
              <TextInput
                placeholder="+1 (555) 123-4567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                style={{ flex: 1 }}
              />
              <Button variant="outline" onClick={handlePhoneUpdate}>
                Update
              </Button>
            </Group>
          </div>
        </Stack>
      </Card>
    </>
  )
}
