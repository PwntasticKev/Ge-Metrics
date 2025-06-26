import { useState, useEffect } from 'react'
import {
  Box,
  Card,
  TextInput,
  Button,
  Group,
  Text,
  Alert,
  Stack,
  PasswordInput,
  Switch,
  Divider,
  Badge,
  Loader
} from '@mantine/core'
import { IconKey, IconMail, IconCheck, IconAlertCircle, IconSettings, IconShield } from '@tabler/icons-react'
import OTPSettings from '../../components/OTP/OTPSettings.jsx'

export default function Settings () {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState(null) // 'success', 'error', 'testing'
  const [mailchimpApiKey, setMailchimpApiKey] = useState('')
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [volumeAlerts, setVolumeAlerts] = useState(true)
  const [priceDropAlerts, setPriceDropAlerts] = useState(true)
  const [cooldownPeriod, setCooldownPeriod] = useState('60') // minutes
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  // Mock user data - this would come from your auth context
  const [currentUser, setCurrentUser] = useState({
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    mailchimp_api_key: 'your-api-key-here',
    phone_number: '',
    otp_enabled: false
  })

  useEffect(() => {
    // Load user settings
    setLoading(true)
    // Simulate API call
    setTimeout(() => {
      setMailchimpApiKey(currentUser.mailchimp_api_key || '')
      setLoading(false)
    }, 500)
  }, [])

  const handleSaveSettings = async () => {
    setSaving(true)
    setSuccessMessage('')
    setErrorMessage('')

    try {
      // Simulate API call to save settings
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Here you would make the actual API call:
      // await updateUserSettings({
      //   mailchimp_api_key: mailchimpApiKey,
      //   email_notifications: emailNotifications,
      //   volume_alerts: volumeAlerts,
      //   price_drop_alerts: priceDropAlerts,
      //   cooldown_period: parseInt(cooldownPeriod)
      // })

      setSuccessMessage('Settings saved successfully!')

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      setErrorMessage('Failed to save settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const testMailchimpConnection = async () => {
    if (!mailchimpApiKey.trim()) {
      setErrorMessage('Please enter a Mailchimp API key first')
      return
    }

    setTesting(true)
    setConnectionStatus('testing')
    setSuccessMessage('')
    setErrorMessage('')

    try {
      // Simulate API test with more realistic timing
      await new Promise(resolve => setTimeout(resolve, 2000))

      // In real implementation, test the actual API
      // const response = await testMailchimpApi(mailchimpApiKey)

      // Mock success for demo
      const testSuccess = Math.random() > 0.3 // 70% success rate for demo

      if (testSuccess) {
        setConnectionStatus('success')
        setSuccessMessage('✅ Mailchimp connection successful! Your API key is working correctly.')
      } else {
        setConnectionStatus('error')
        setErrorMessage('❌ Failed to connect to Mailchimp. Please check your API key and try again.')
      }

      // Clear messages after 5 seconds
      setTimeout(() => {
        setSuccessMessage('')
        setErrorMessage('')
        setConnectionStatus(null)
      }, 5000)
    } catch (error) {
      setConnectionStatus('error')
      setErrorMessage('❌ Connection test failed. Please verify your API key is correct.')
      setTimeout(() => {
        setErrorMessage('')
        setConnectionStatus(null)
      }, 5000)
    } finally {
      setTesting(false)
    }
  }

  const getConnectionStatusBadge = () => {
    if (connectionStatus === 'success') {
      return <Badge color="green" size="sm">Connected</Badge>
    }
    if (connectionStatus === 'error') {
      return <Badge color="red" size="sm">Connection Failed</Badge>
    }
    if (connectionStatus === 'testing') {
      return <Badge color="blue" size="sm">Testing...</Badge>
    }
    if (isApiKeyConfigured) {
      return <Badge color="orange" size="sm">Not Tested</Badge>
    }
    return null
  }

  const isApiKeyConfigured = mailchimpApiKey && mailchimpApiKey.trim().length > 0

  if (loading && !mailchimpApiKey) {
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
            {getConnectionStatusBadge()}
          </Group>

          <Stack spacing="md">
            <Alert icon={<IconAlertCircle size={16} />} color="blue">
              <Text size="sm">
                To receive volume dump alerts via email, you need to configure your Mailchimp API key.
                This allows the system to send you personalized alerts when items in your watchlist meet your criteria.
              </Text>
            </Alert>

            <PasswordInput
              label="Mailchimp API Key"
              description="Your Mailchimp API key for sending email alerts"
              placeholder="Enter your Mailchimp API key..."
              value={mailchimpApiKey}
              onChange={(e) => {
                setMailchimpApiKey(e.target.value)
                setConnectionStatus(null) // Reset connection status when key changes
              }}
              icon={<IconKey size={16} />}
              rightSection={
                connectionStatus === 'success'
                  ? (
                  <IconCheck size={16} color="green" />
                    )
                  : null
              }
            />

            <Group>
              <Button
                variant="outline"
                onClick={testMailchimpConnection}
                loading={testing}
                disabled={!mailchimpApiKey.trim()}
                color={connectionStatus === 'success' ? 'green' : connectionStatus === 'error' ? 'red' : 'blue'}
              >
                {testing ? 'Testing Connection...' : 'Test Connection'}
              </Button>
              {connectionStatus && (
                <Text size="xs" color={connectionStatus === 'success' ? 'green' : connectionStatus === 'error' ? 'red' : 'blue'}>
                  {connectionStatus === 'success' && 'API key verified successfully'}
                  {connectionStatus === 'error' && 'Connection failed - check your API key'}
                  {connectionStatus === 'testing' && 'Verifying API key...'}
                </Text>
              )}
            </Group>

            <Text size="xs" color="dimmed">
              Don't have a Mailchimp API key?
              <Text component="a" href="https://mailchimp.com/help/about-api-keys/" target="_blank" color="blue" ml="xs">
                Learn how to get one →
              </Text>
            </Text>
          </Stack>
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
              disabled={!isApiKeyConfigured}
            />

            <Switch
              label="Volume Dump Alerts"
              description="Get notified when volume exceeds your thresholds"
              checked={volumeAlerts}
              onChange={(e) => setVolumeAlerts(e.currentTarget.checked)}
              disabled={!isApiKeyConfigured || !emailNotifications}
            />

            <Switch
              label="Price Drop Alerts"
              description="Get notified when prices drop by your specified percentage"
              checked={priceDropAlerts}
              onChange={(e) => setPriceDropAlerts(e.currentTarget.checked)}
              disabled={!isApiKeyConfigured || !emailNotifications}
            />

            <TextInput
              label="Alert Cooldown Period (minutes)"
              description="Minimum time between alerts for the same item to prevent spam"
              value={cooldownPeriod}
              onChange={(e) => setCooldownPeriod(e.target.value || '60')}
              type="number"
              min="1"
              max="1440"
              placeholder="60"
            />

            {!isApiKeyConfigured && (
              <Alert icon={<IconAlertCircle size={16} />} color="orange">
                <Text size="sm">
                  Email alerts are disabled until you configure your Mailchimp API key above.
                </Text>
              </Alert>
            )}
          </Stack>
        </Card>

        {/* Security Settings */}
        <OTPSettings user={currentUser} onUpdate={setCurrentUser} />

        {/* Account Information */}
        <Card withBorder p="lg">
          <Text size="lg" weight={600} mb="md">Account Information</Text>

          <Stack spacing="sm">
            <Group>
              <Text size="sm" weight={500}>Name:</Text>
              <Text size="sm">{currentUser.name}</Text>
            </Group>
            <Group>
              <Text size="sm" weight={500}>Email:</Text>
              <Text size="sm">{currentUser.email}</Text>
            </Group>
            <Group>
              <Text size="sm" weight={500}>User ID:</Text>
              <Text size="sm">{currentUser.id}</Text>
            </Group>
          </Stack>
        </Card>

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
