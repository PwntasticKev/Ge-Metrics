import { useState, useEffect } from 'react'
import {
  Box,
  Card,
  Button,
  Group,
  Text,
  Alert,
  Stack,
  Switch,
  Divider,
  Badge,
  Loader
} from '@mantine/core'
import { IconMail, IconCheck, IconAlertCircle, IconSettings } from '@tabler/icons-react'
import OTPSettings from '../../components/OTP/OTPSettings.jsx'
import { trpc } from '../../utils/trpc.jsx'

export default function Settings () {
  const { data: user, isLoading: isUserLoading, error: userError } = trpc.auth.me.useQuery()
  const { data: settings, isLoading: areSettingsLoading, error: settingsError } = trpc.settings.get.useQuery()
  const updateSettings = trpc.settings.update.useMutation()
  const utils = trpc.useContext()
  const [saving, setSaving] = useState(false)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [volumeAlerts, setVolumeAlerts] = useState(true)
  const [priceDropAlerts, setPriceDropAlerts] = useState(true)
  const [cooldownPeriod, setCooldownPeriod] = useState('60') // minutes
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const handleUserUpdate = () => {
    utils.auth.me.invalidate()
    utils.settings.get.invalidate()
  }

  useEffect(() => {
    if (settings) {
      setEmailNotifications(settings.emailNotifications)
      setVolumeAlerts(settings.volumeAlerts)
      setPriceDropAlerts(settings.priceDropAlerts)
      setCooldownPeriod(String(settings.cooldownPeriod))
    }
  }, [settings])

  const handleSaveSettings = async () => {
    setSaving(true)
    setSuccessMessage('')
    setErrorMessage('')

    try {
      await updateSettings.mutateAsync({
        emailNotifications,
        volumeAlerts,
        priceDropAlerts,
        cooldownPeriod: parseInt(cooldownPeriod)
      })

      utils.settings.get.invalidate()
      setSuccessMessage('Settings saved successfully!')

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      setErrorMessage('Failed to save settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const isEmailConfigured = import.meta.env.VITE_MAIL_CHIMP_KEY && import.meta.env.VITE_MAIL_CHIMP_KEY.length > 0

  if (isUserLoading || areSettingsLoading) {
    return (
      <Box sx={{ py: 4 }}>
        <Group spacing="sm" mb="md">
          <Loader size="sm" />
          <Text>Loading settings...</Text>
        </Group>
      </Box>
    )
  }

  return (
    <Box sx={{ py: 4 }}>
      <Group spacing="sm" mb="md">
        <IconSettings size={24} />
        <Text size="xl" weight={700}>User Settings</Text>
      </Group>

      <Stack spacing="lg">
        {/* Email Configuration */}
        <Card withBorder p="lg">
          <Group spacing="sm" mb="md">
            <IconMail size={20} />
            <Text size="lg" weight={600}>Email Configuration</Text>
            {isEmailConfigured
              ? <Badge color="green" size="sm">Enabled</Badge>
              : <Badge color="red" size="sm">Not Configured</Badge>}
          </Group>
          <Text size="sm">
            Email notifications are {isEmailConfigured ? 'enabled' : 'disabled'} system-wide.
            Contact an administrator if you have questions.
          </Text>
        </Card>

        {/* Alert Preferences */}
        <Card withBorder p="lg">
          <Text size="lg" weight={600} mb="md">Alert Preferences</Text>

          <Stack spacing="md">
            <Switch
              label="Enable Email Notifications"
              description="Receive email alerts for watchlist items"
              checked={emailNotifications}
              onChange={(e) => setEmailNotifications(e.currentTarget.checked)}
              disabled={!isEmailConfigured}
            />

            <Switch
              label="Volume Dump Alerts"
              description="Get notified when volume exceeds your thresholds"
              checked={volumeAlerts}
              onChange={(e) => setVolumeAlerts(e.currentTarget.checked)}
              disabled={!isEmailConfigured || !emailNotifications}
            />

            <Switch
              label="Price Drop Alerts"
              description="Get notified when prices drop by your specified percentage"
              checked={priceDropAlerts}
              onChange={(e) => setPriceDropAlerts(e.currentTarget.checked)}
              disabled={!isEmailConfigured || !emailNotifications}
            />
          </Stack>
        </Card>

        {/* Security Settings */}
        <OTPSettings user={user} onUpdate={handleUserUpdate} />

        {/* Success/Error Messages */}
        {successMessage && (
          <Alert icon={<IconCheck size={16} />} color="green">
            {successMessage}
          </Alert>
        )}

        {errorMessage && (
          <Alert icon={<IconAlertCircle size={16} />} color="red">
            {errorMessage}
          </Alert>
        )}

        {/* Save Button */}
        <Group position="right">
          <Button
            onClick={handleSaveSettings}
            loading={saving}
            size="md"
          >
            Save Settings
          </Button>
        </Group>
      </Stack>
    </Box>
  )
}
