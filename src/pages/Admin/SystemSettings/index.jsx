import React, { useState, useEffect } from 'react'
import {
  Container,
  Title,
  Grid,
  Card,
  Text,
  Button,
  Switch,
  TextInput,
  NumberInput,
  Select,
  Textarea,
  Group,
  Stack,
  Tabs,
  Alert,
  Badge,
  Divider,
  ColorInput,
  Slider,
  SegmentedControl,
  ActionIcon,
  Modal,
  Progress,
  Code,
  ScrollArea,
  Tooltip,
  Paper,
  Timeline,
  ThemeIcon,
  Checkbox,
  JsonInput,
  PasswordInput
} from '@mantine/core'
import {
  IconSettings,
  IconDatabase,
  IconMail,
  IconShield,
  IconPalette,
  IconServer,
  IconKey,
  IconBell,
  IconCloud,
  IconRefresh,
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconInfoCircle,
  IconEdit,
  IconTrash,
  IconPlus,
  IconDownload,
  IconUpload,
  IconClock,
  IconActivity,
  IconLock,
  IconEye,
  IconEyeOff,
  IconCode,
  IconBrandStripe,
  IconBrandGoogle,
  IconWorldWww,
  IconChartLine,
  IconTestPipe,
  IconBrandMailgun,
  IconBrandDiscord,
  IconBrandSlack
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'

// Mock settings service
const settingsService = {
  getSettings: () => ({
    general: {
      siteName: 'GE Metrics',
      siteDescription: 'Advanced Grand Exchange analytics and trading tools',
      maintenanceMode: false,
      registrationEnabled: true,
      maxUsersPerDay: 100,
      sessionTimeout: 30,
      defaultTheme: 'light',
      timezone: 'UTC'
    },
    email: {
      provider: 'smtp',
      smtpHost: 'smtp.gmail.com',
      smtpPort: 587,
      smtpUser: 'noreply@ge-metrics.com',
      smtpPassword: '••••••••',
      fromEmail: 'noreply@ge-metrics.com',
      fromName: 'GE Metrics',
      emailVerificationRequired: true,
      welcomeEmailEnabled: true
    },
    payments: {
      stripePublishableKey: 'pk_test_••••••••',
      stripeSecretKey: '••••••••',
      webhookSecret: '••••••••',
      currency: 'USD',
      taxRate: 0,
      trialDays: 30,
      monthlyPrice: 4.99,
      yearlyPrice: 39.99,
      yearlyDiscount: 33
    },
    security: {
      twoFactorRequired: false,
      passwordMinLength: 8,
      passwordRequireSpecial: true,
      passwordRequireNumbers: true,
      maxLoginAttempts: 5,
      lockoutDuration: 15,
      sessionSecurity: 'normal',
      ipWhitelisting: false,
      bruteForceProtection: true
    },
    api: {
      rateLimit: 100,
      rateLimitWindow: 15,
      apiKeysEnabled: true,
      webhooksEnabled: true,
      corsEnabled: true,
      allowedOrigins: ['https://ge-metrics.com'],
      apiVersion: 'v1'
    },
    notifications: {
      emailNotifications: true,
      pushNotifications: false,
      slackWebhook: '',
      discordWebhook: '',
      alertOnErrors: true,
      alertOnHighTraffic: true,
      dailyReports: true
    },
    performance: {
      cacheEnabled: true,
      cacheDuration: 300,
      compressionEnabled: true,
      cdnEnabled: false,
      cdnUrl: '',
      databasePoolSize: 10,
      maxConcurrentUsers: 1000
    }
  }),

  updateSettings: async (category, settings) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    return { success: true }
  },

  testEmailSettings: async () => {
    await new Promise(resolve => setTimeout(resolve, 2000))
    return { success: true, message: 'Test email sent successfully' }
  },

  backupSettings: async () => {
    await new Promise(resolve => setTimeout(resolve, 1000))
    return { success: true, backupId: 'backup_' + Date.now() }
  },

  restoreSettings: async (backupData) => {
    await new Promise(resolve => setTimeout(resolve, 1000))
    return { success: true }
  }
}

export default function SystemSettings () {
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const [testingEmail, setTestingEmail] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  const [backupModalOpened, setBackupModalOpened] = useState(false)
  const [restoreModalOpened, setRestoreModalOpened] = useState(false)
  const [testEmailModal, setTestEmailModal] = useState(false)
  const [testResults, setTestResults] = useState({})
  const [unsavedChanges, setUnsavedChanges] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const data = settingsService.getSettings()
      setSettings(data)
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load settings',
        color: 'red',
        icon: <IconX size={16} />
      })
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async (category, newSettings) => {
    try {
      setSaving(true)
      const result = await settingsService.updateSettings(category, newSettings)

      if (result.success) {
        setSettings(prev => ({
          ...prev,
          [category]: { ...prev[category], ...newSettings }
        }))

        notifications.show({
          title: 'Settings Saved',
          message: 'Settings have been updated successfully',
          color: 'green',
          icon: <IconCheck size={16} />
        })
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to save settings',
        color: 'red',
        icon: <IconX size={16} />
      })
    } finally {
      setSaving(false)
    }
  }

  const testEmailSettings = async () => {
    try {
      setTestingEmail(true)
      const result = await settingsService.testEmailSettings()

      if (result.success) {
        notifications.show({
          title: 'Email Test Successful',
          message: result.message,
          color: 'green',
          icon: <IconCheck size={16} />
        })
      }
    } catch (error) {
      notifications.show({
        title: 'Email Test Failed',
        message: error.message,
        color: 'red',
        icon: <IconX size={16} />
      })
    } finally {
      setTestingEmail(false)
    }
  }

  const handleBackupSettings = async () => {
    try {
      const result = await settingsService.backupSettings()

      if (result.success) {
        notifications.show({
          title: 'Backup Created',
          message: `Backup created with ID: ${result.backupId}`,
          color: 'green',
          icon: <IconCheck size={16} />
        })
        setBackupModalOpened(false)
      }
    } catch (error) {
      notifications.show({
        title: 'Backup Failed',
        message: error.message,
        color: 'red',
        icon: <IconX size={16} />
      })
    }
  }

  const updateSetting = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: { ...prev[category], [key]: value }
    }))
    setUnsavedChanges(true)
  }

  const testEmailConfiguration = async () => {
    try {
      // Simulate email test
      await new Promise(resolve => setTimeout(resolve, 2000))
      setTestResults(prev => ({ ...prev, email: 'success' }))
    } catch (error) {
      setTestResults(prev => ({ ...prev, email: 'error' }))
    }
  }

  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'ge-metrics-settings.json'
    link.click()
  }

  return (
    <Container size="xl" py="md">
      <Group justify="space-between" mb="lg">
        <div>
          <Title order={2}>System Settings</Title>
          <Text size="sm" color="dimmed">
            Configure application settings and preferences
          </Text>
        </div>
        <Group>
          <Button
            leftIcon={<IconDownload size={16} />}
            variant="light"
            onClick={() => setBackupModalOpened(true)}
          >
            Backup Settings
          </Button>
          <Button
            leftIcon={<IconUpload size={16} />}
            variant="light"
            onClick={() => setRestoreModalOpened(true)}
          >
            Restore Settings
          </Button>
          <Button
            leftIcon={<IconRefresh size={16} />}
            variant="light"
            onClick={loadSettings}
          >
            Refresh
          </Button>
          <Button
            leftIcon={<IconDownload size={16} />}
            variant="light"
            onClick={exportSettings}
          >
            Export Settings
          </Button>
        </Group>
      </Group>

      {unsavedChanges && (
        <Alert color="yellow" icon={<IconAlertTriangle size={16} />} mb="md">
          You have unsaved changes. Don't forget to save your settings.
        </Alert>
      )}

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="general" leftIcon={<IconSettings size={16} />}>
            General
          </Tabs.Tab>
          <Tabs.Tab value="email" leftIcon={<IconMail size={16} />}>
            Email
          </Tabs.Tab>
          <Tabs.Tab value="payments" leftIcon={<IconBrandStripe size={16} />}>
            Payments
          </Tabs.Tab>
          <Tabs.Tab value="security" leftIcon={<IconShield size={16} />}>
            Security
          </Tabs.Tab>
          <Tabs.Tab value="api" leftIcon={<IconCode size={16} />}>
            API
          </Tabs.Tab>
          <Tabs.Tab value="notifications" leftIcon={<IconBell size={16} />}>
            Notifications
          </Tabs.Tab>
          <Tabs.Tab value="performance" leftIcon={<IconChartLine size={16} />}>
            Performance
          </Tabs.Tab>
        </Tabs.List>

        {/* General Settings */}
        <Tabs.Panel value="general" pt="md">
          <Grid>
            <Grid.Col span={{ base: 12, md: 8 }}>
              <Card withBorder>
                <Title order={4} mb="md">General Configuration</Title>
                <Stack spacing="md">
                  <TextInput
                    label="Site Name"
                    value={settings.general?.siteName || ''}
                    onChange={(e) => updateSetting('general', 'siteName', e.target.value)}
                  />

                  <Textarea
                    label="Site Description"
                    value={settings.general?.siteDescription || ''}
                    onChange={(e) => updateSetting('general', 'siteDescription', e.target.value)}
                    minRows={3}
                  />

                  <Group grow>
                    <Select
                      label="Default Theme"
                      value={settings.general?.defaultTheme || 'light'}
                      onChange={(value) => updateSetting('general', 'defaultTheme', value)}
                      data={[
                        { value: 'light', label: 'Light' },
                        { value: 'dark', label: 'Dark' },
                        { value: 'auto', label: 'Auto (System)' }
                      ]}
                    />

                    <Select
                      label="Timezone"
                      value={settings.general?.timezone || 'UTC'}
                      onChange={(value) => updateSetting('general', 'timezone', value)}
                      data={[
                        { value: 'UTC', label: 'UTC' },
                        { value: 'America/New_York', label: 'Eastern Time' },
                        { value: 'America/Chicago', label: 'Central Time' },
                        { value: 'America/Denver', label: 'Mountain Time' },
                        { value: 'America/Los_Angeles', label: 'Pacific Time' },
                        { value: 'Europe/London', label: 'London' },
                        { value: 'Europe/Paris', label: 'Paris' },
                        { value: 'Asia/Tokyo', label: 'Tokyo' }
                      ]}
                    />
                  </Group>

                  <Group grow>
                    <NumberInput
                      label="Max New Users Per Day"
                      value={settings.general?.maxUsersPerDay || 100}
                      onChange={(value) => updateSetting('general', 'maxUsersPerDay', value)}
                      min={1}
                      max={10000}
                    />

                    <NumberInput
                      label="Session Timeout (minutes)"
                      value={settings.general?.sessionTimeout || 30}
                      onChange={(value) => updateSetting('general', 'sessionTimeout', value)}
                      min={5}
                      max={1440}
                    />
                  </Group>

                  <Divider />

                  <Switch
                    label="Maintenance Mode"
                    description="Disable access for all users except admins"
                    checked={settings.general?.maintenanceMode || false}
                    onChange={(e) => updateSetting('general', 'maintenanceMode', e.currentTarget.checked)}
                  />

                  <Switch
                    label="User Registration"
                    description="Allow new users to register accounts"
                    checked={settings.general?.registrationEnabled || true}
                    onChange={(e) => updateSetting('general', 'registrationEnabled', e.currentTarget.checked)}
                  />

                  <Button
                    onClick={() => saveSettings('general', settings.general)}
                    loading={saving}
                    leftIcon={<IconCheck size={16} />}
                  >
                    Save General Settings
                  </Button>
                </Stack>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 4 }}>
              <Card withBorder>
                <Title order={5} mb="md">System Status</Title>
                <Stack spacing="sm">
                  <Group justify="space-between">
                    <Text size="sm">Server Status</Text>
                    <Badge color="green">Online</Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Database</Text>
                    <Badge color="green">Connected</Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Cache</Text>
                    <Badge color="blue">Active</Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Email Service</Text>
                    <Badge color="green">Operational</Badge>
                  </Group>
                </Stack>
              </Card>
            </Grid.Col>
          </Grid>
        </Tabs.Panel>

        {/* Email Settings */}
        <Tabs.Panel value="email" pt="md">
          <Card withBorder>
            <Title order={4} mb="md">Email Configuration</Title>
            <Stack spacing="md">
              <Select
                label="Email Provider"
                value={settings.email?.provider || 'smtp'}
                onChange={(value) => updateSetting('email', 'provider', value)}
                data={[
                  { value: 'smtp', label: 'SMTP' },
                  { value: 'sendgrid', label: 'SendGrid' },
                  { value: 'mailgun', label: 'Mailgun' },
                  { value: 'ses', label: 'Amazon SES' }
                ]}
              />

              {settings.email?.provider === 'smtp' && (
                <Grid>
                  <Grid.Col span={6}>
                    <TextInput
                      label="SMTP Host"
                      value={settings.email?.smtpHost || ''}
                      onChange={(e) => updateSetting('email', 'smtpHost', e.target.value)}
                    />
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <NumberInput
                      label="SMTP Port"
                      value={settings.email?.smtpPort || 587}
                      onChange={(value) => updateSetting('email', 'smtpPort', value)}
                    />
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <TextInput
                      label="SMTP Username"
                      value={settings.email?.smtpUser || ''}
                      onChange={(e) => updateSetting('email', 'smtpUser', e.target.value)}
                    />
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <TextInput
                      label="SMTP Password"
                      type="password"
                      value={settings.email?.smtpPassword || ''}
                      onChange={(e) => updateSetting('email', 'smtpPassword', e.target.value)}
                    />
                  </Grid.Col>
                </Grid>
              )}

              <Grid>
                <Grid.Col span={6}>
                  <TextInput
                    label="From Email"
                    value={settings.email?.fromEmail || ''}
                    onChange={(e) => updateSetting('email', 'fromEmail', e.target.value)}
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <TextInput
                    label="From Name"
                    value={settings.email?.fromName || ''}
                    onChange={(e) => updateSetting('email', 'fromName', e.target.value)}
                  />
                </Grid.Col>
              </Grid>

              <Divider />

              <Switch
                label="Email Verification Required"
                description="Require users to verify their email address"
                checked={settings.email?.emailVerificationRequired || true}
                onChange={(e) => updateSetting('email', 'emailVerificationRequired', e.currentTarget.checked)}
              />

              <Switch
                label="Welcome Email"
                description="Send welcome email to new users"
                checked={settings.email?.welcomeEmailEnabled || true}
                onChange={(e) => updateSetting('email', 'welcomeEmailEnabled', e.currentTarget.checked)}
              />

              <Group>
                <Button
                  onClick={() => saveSettings('email', settings.email)}
                  loading={saving}
                  leftIcon={<IconCheck size={16} />}
                >
                  Save Email Settings
                </Button>
                <Button
                  variant="light"
                  onClick={() => setTestEmailModal(true)}
                  leftIcon={<IconTestPipe size={16} />}
                >
                  Test Email
                </Button>
              </Group>
            </Stack>
          </Card>
        </Tabs.Panel>

        {/* Payment Settings */}
        <Tabs.Panel value="payments" pt="md">
          <Card withBorder>
            <Title order={4} mb="md">Payment Configuration</Title>
            <Stack spacing="md">
              <Alert icon={<IconInfoCircle size={16} />} color="blue">
                Configure your Stripe settings for payment processing. You can find these keys in your Stripe Dashboard.
              </Alert>

              <Grid>
                <Grid.Col span={6}>
                  <TextInput
                    label="Stripe Publishable Key"
                    value={settings.payments?.stripePublishableKey || ''}
                    onChange={(e) => updateSetting('payments', 'stripePublishableKey', e.target.value)}
                    placeholder="pk_test_..."
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <TextInput
                    label="Stripe Secret Key"
                    type="password"
                    value={settings.payments?.stripeSecretKey || ''}
                    onChange={(e) => updateSetting('payments', 'stripeSecretKey', e.target.value)}
                    placeholder="sk_test_..."
                  />
                </Grid.Col>
              </Grid>

              <TextInput
                label="Webhook Secret"
                type="password"
                value={settings.payments?.webhookSecret || ''}
                onChange={(e) => updateSetting('payments', 'webhookSecret', e.target.value)}
                placeholder="whsec_..."
                description="Used to verify webhook signatures from Stripe"
              />

              <Grid>
                <Grid.Col span={4}>
                  <Select
                    label="Currency"
                    value={settings.payments?.currency || 'USD'}
                    onChange={(value) => updateSetting('payments', 'currency', value)}
                    data={[
                      { value: 'USD', label: 'USD ($)' },
                      { value: 'EUR', label: 'EUR (€)' },
                      { value: 'GBP', label: 'GBP (£)' },
                      { value: 'CAD', label: 'CAD (C$)' }
                    ]}
                  />
                </Grid.Col>
                <Grid.Col span={4}>
                  <NumberInput
                    label="Trial Days"
                    value={settings.payments?.trialDays || 30}
                    onChange={(value) => updateSetting('payments', 'trialDays', value)}
                    min={0}
                    max={365}
                  />
                </Grid.Col>
                <Grid.Col span={4}>
                  <NumberInput
                    label="Tax Rate (%)"
                    value={settings.payments?.taxRate || 0}
                    onChange={(value) => updateSetting('payments', 'taxRate', value)}
                    min={0}
                    max={50}
                    precision={2}
                  />
                </Grid.Col>
              </Grid>

              <Grid>
                <Grid.Col span={4}>
                  <NumberInput
                    label="Monthly Price ($)"
                    value={settings.payments?.monthlyPrice || 4.99}
                    onChange={(value) => updateSetting('payments', 'monthlyPrice', value)}
                    min={0.99}
                    max={999.99}
                    precision={2}
                  />
                </Grid.Col>
                <Grid.Col span={4}>
                  <NumberInput
                    label="Yearly Price ($)"
                    value={settings.payments?.yearlyPrice || 39.99}
                    onChange={(value) => updateSetting('payments', 'yearlyPrice', value)}
                    min={9.99}
                    max={9999.99}
                    precision={2}
                  />
                </Grid.Col>
                <Grid.Col span={4}>
                  <NumberInput
                    label="Yearly Discount (%)"
                    value={settings.payments?.yearlyDiscount || 33}
                    onChange={(value) => updateSetting('payments', 'yearlyDiscount', value)}
                    min={0}
                    max={90}
                    readOnly
                    description="Calculated automatically"
                  />
                </Grid.Col>
              </Grid>

              <Button
                onClick={() => saveSettings('payments', settings.payments)}
                loading={saving}
                leftIcon={<IconCheck size={16} />}
              >
                Save Payment Settings
              </Button>
            </Stack>
          </Card>
        </Tabs.Panel>

        {/* Security Settings */}
        <Tabs.Panel value="security" pt="md">
          <Card withBorder>
            <Title order={4} mb="md">Security Configuration</Title>
            <Stack spacing="md">
              <Alert icon={<IconShield size={16} />} color="orange">
                Security settings affect all users. Changes take effect immediately.
              </Alert>

              <Grid>
                <Grid.Col span={6}>
                  <NumberInput
                    label="Password Minimum Length"
                    value={settings.security?.passwordMinLength || 8}
                    onChange={(value) => updateSetting('security', 'passwordMinLength', value)}
                    min={6}
                    max={32}
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <NumberInput
                    label="Max Login Attempts"
                    value={settings.security?.maxLoginAttempts || 5}
                    onChange={(value) => updateSetting('security', 'maxLoginAttempts', value)}
                    min={3}
                    max={20}
                  />
                </Grid.Col>
              </Grid>

              <NumberInput
                label="Account Lockout Duration (minutes)"
                value={settings.security?.lockoutDuration || 15}
                onChange={(value) => updateSetting('security', 'lockoutDuration', value)}
                min={1}
                max={1440}
              />

              <Select
                label="Session Security Level"
                value={settings.security?.sessionSecurity || 'normal'}
                onChange={(value) => updateSetting('security', 'sessionSecurity', value)}
                data={[
                  { value: 'low', label: 'Low - Basic session management' },
                  { value: 'normal', label: 'Normal - Standard security' },
                  { value: 'high', label: 'High - Enhanced security' },
                  { value: 'paranoid', label: 'Paranoid - Maximum security' }
                ]}
              />

              <Divider />

              <Switch
                label="Require Two-Factor Authentication"
                description="Force all users to enable 2FA"
                checked={settings.security?.twoFactorRequired || false}
                onChange={(e) => updateSetting('security', 'twoFactorRequired', e.currentTarget.checked)}
              />

              <Switch
                label="Password Requires Special Characters"
                description="Passwords must contain special characters"
                checked={settings.security?.passwordRequireSpecial || true}
                onChange={(e) => updateSetting('security', 'passwordRequireSpecial', e.currentTarget.checked)}
              />

              <Switch
                label="Password Requires Numbers"
                description="Passwords must contain numbers"
                checked={settings.security?.passwordRequireNumbers || true}
                onChange={(e) => updateSetting('security', 'passwordRequireNumbers', e.currentTarget.checked)}
              />

              <Switch
                label="IP Whitelisting"
                description="Only allow access from specific IP addresses"
                checked={settings.security?.ipWhitelisting || false}
                onChange={(e) => updateSetting('security', 'ipWhitelisting', e.currentTarget.checked)}
              />

              <Switch
                label="Brute Force Protection"
                description="Automatically block suspicious login attempts"
                checked={settings.security?.bruteForceProtection || true}
                onChange={(e) => updateSetting('security', 'bruteForceProtection', e.currentTarget.checked)}
              />

              <Button
                onClick={() => saveSettings('security', settings.security)}
                loading={saving}
                leftIcon={<IconCheck size={16} />}
              >
                Save Security Settings
              </Button>
            </Stack>
          </Card>
        </Tabs.Panel>

        {/* API Settings */}
        <Tabs.Panel value="api" pt="md">
          <Card withBorder>
            <Title order={4} mb="md">API Configuration</Title>
            <Stack spacing="md">
              <Grid>
                <Grid.Col span={6}>
                  <NumberInput
                    label="Rate Limit (requests)"
                    value={settings.api?.rateLimit || 100}
                    onChange={(value) => updateSetting('api', 'rateLimit', value)}
                    min={10}
                    max={10000}
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <NumberInput
                    label="Rate Limit Window (minutes)"
                    value={settings.api?.rateLimitWindow || 15}
                    onChange={(value) => updateSetting('api', 'rateLimitWindow', value)}
                    min={1}
                    max={1440}
                  />
                </Grid.Col>
              </Grid>

              <Select
                label="API Version"
                value={settings.api?.apiVersion || 'v1'}
                onChange={(value) => updateSetting('api', 'apiVersion', value)}
                data={[
                  { value: 'v1', label: 'Version 1' },
                  { value: 'v2', label: 'Version 2 (Beta)' }
                ]}
              />

              <Textarea
                label="Allowed Origins (CORS)"
                value={settings.api?.allowedOrigins?.join('\n') || ''}
                onChange={(e) => updateSetting('api', 'allowedOrigins', e.target.value.split('\n').filter(Boolean))}
                placeholder="https://example.com&#10;https://app.example.com"
                minRows={3}
                description="One origin per line"
              />

              <Divider />

              <Switch
                label="API Keys Enabled"
                description="Allow users to generate API keys"
                checked={settings.api?.apiKeysEnabled || true}
                onChange={(e) => updateSetting('api', 'apiKeysEnabled', e.currentTarget.checked)}
              />

              <Switch
                label="Webhooks Enabled"
                description="Enable webhook functionality"
                checked={settings.api?.webhooksEnabled || true}
                onChange={(e) => updateSetting('api', 'webhooksEnabled', e.currentTarget.checked)}
              />

              <Switch
                label="CORS Enabled"
                description="Enable Cross-Origin Resource Sharing"
                checked={settings.api?.corsEnabled || true}
                onChange={(e) => updateSetting('api', 'corsEnabled', e.currentTarget.checked)}
              />

              <Button
                onClick={() => saveSettings('api', settings.api)}
                loading={saving}
                leftIcon={<IconCheck size={16} />}
              >
                Save API Settings
              </Button>
            </Stack>
          </Card>
        </Tabs.Panel>

        {/* Notification Settings */}
        <Tabs.Panel value="notifications" pt="md">
          <Card withBorder>
            <Title order={4} mb="md">Notification Configuration</Title>
            <Stack spacing="md">
              <Switch
                label="Email Notifications"
                description="Send notifications via email"
                checked={settings.notifications?.emailNotifications || true}
                onChange={(e) => updateSetting('notifications', 'emailNotifications', e.currentTarget.checked)}
              />

              <Switch
                label="Push Notifications"
                description="Send browser push notifications"
                checked={settings.notifications?.pushNotifications || false}
                onChange={(e) => updateSetting('notifications', 'pushNotifications', e.currentTarget.checked)}
              />

              <TextInput
                label="Slack Webhook URL"
                value={settings.notifications?.slackWebhook || ''}
                onChange={(e) => updateSetting('notifications', 'slackWebhook', e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
              />

              <TextInput
                label="Discord Webhook URL"
                value={settings.notifications?.discordWebhook || ''}
                onChange={(e) => updateSetting('notifications', 'discordWebhook', e.target.value)}
                placeholder="https://discord.com/api/webhooks/..."
              />

              <Divider />

              <Switch
                label="Alert on Errors"
                description="Send notifications when errors occur"
                checked={settings.notifications?.alertOnErrors || true}
                onChange={(e) => updateSetting('notifications', 'alertOnErrors', e.currentTarget.checked)}
              />

              <Switch
                label="Alert on High Traffic"
                description="Send notifications during traffic spikes"
                checked={settings.notifications?.alertOnHighTraffic || true}
                onChange={(e) => updateSetting('notifications', 'alertOnHighTraffic', e.currentTarget.checked)}
              />

              <Switch
                label="Daily Reports"
                description="Send daily summary reports"
                checked={settings.notifications?.dailyReports || true}
                onChange={(e) => updateSetting('notifications', 'dailyReports', e.currentTarget.checked)}
              />

              <Button
                onClick={() => saveSettings('notifications', settings.notifications)}
                loading={saving}
                leftIcon={<IconCheck size={16} />}
              >
                Save Notification Settings
              </Button>
            </Stack>
          </Card>
        </Tabs.Panel>

        {/* Performance Settings */}
        <Tabs.Panel value="performance" pt="md">
          <Card withBorder>
            <Title order={4} mb="md">Performance Configuration</Title>
            <Stack spacing="md">
              <Grid>
                <Grid.Col span={6}>
                  <NumberInput
                    label="Cache Duration (seconds)"
                    value={settings.performance?.cacheDuration || 300}
                    onChange={(value) => updateSetting('performance', 'cacheDuration', value)}
                    min={60}
                    max={86400}
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <NumberInput
                    label="Database Pool Size"
                    value={settings.performance?.databasePoolSize || 10}
                    onChange={(value) => updateSetting('performance', 'databasePoolSize', value)}
                    min={5}
                    max={100}
                  />
                </Grid.Col>
              </Grid>

              <NumberInput
                label="Max Concurrent Users"
                value={settings.performance?.maxConcurrentUsers || 1000}
                onChange={(value) => updateSetting('performance', 'maxConcurrentUsers', value)}
                min={100}
                max={100000}
              />

              <TextInput
                label="CDN URL"
                value={settings.performance?.cdnUrl || ''}
                onChange={(e) => updateSetting('performance', 'cdnUrl', e.target.value)}
                placeholder="https://cdn.example.com"
                disabled={!settings.performance?.cdnEnabled}
              />

              <Divider />

              <Switch
                label="Enable Caching"
                description="Cache frequently accessed data"
                checked={settings.performance?.cacheEnabled || true}
                onChange={(e) => updateSetting('performance', 'cacheEnabled', e.currentTarget.checked)}
              />

              <Switch
                label="Enable Compression"
                description="Compress API responses"
                checked={settings.performance?.compressionEnabled || true}
                onChange={(e) => updateSetting('performance', 'compressionEnabled', e.currentTarget.checked)}
              />

              <Switch
                label="Enable CDN"
                description="Use Content Delivery Network"
                checked={settings.performance?.cdnEnabled || false}
                onChange={(e) => updateSetting('performance', 'cdnEnabled', e.currentTarget.checked)}
              />

              <Button
                onClick={() => saveSettings('performance', settings.performance)}
                loading={saving}
                leftIcon={<IconCheck size={16} />}
              >
                Save Performance Settings
              </Button>
            </Stack>
          </Card>
        </Tabs.Panel>
      </Tabs>

      {/* Backup Modal */}
      <Modal
        opened={backupModalOpened}
        onClose={() => setBackupModalOpened(false)}
        title="Backup Settings"
        size="md"
      >
        <Stack>
          <Alert icon={<IconInfoCircle size={16} />} color="blue">
            This will create a backup of all current system settings. The backup will be saved with a timestamp.
          </Alert>

          <Text size="sm">
            Backup will include:
          </Text>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>General settings</li>
            <li>Email configuration</li>
            <li>Payment settings (keys will be masked)</li>
            <li>Security configuration</li>
            <li>API settings</li>
            <li>Notification preferences</li>
            <li>Performance settings</li>
          </ul>

          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setBackupModalOpened(false)}>
              Cancel
            </Button>
            <Button onClick={handleBackupSettings} leftIcon={<IconDownload size={16} />}>
              Create Backup
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Restore Modal */}
      <Modal
        opened={restoreModalOpened}
        onClose={() => setRestoreModalOpened(false)}
        title="Restore Settings"
        size="md"
      >
        <Stack>
          <Alert icon={<IconAlertTriangle size={16} />} color="orange">
            Restoring settings will overwrite all current configuration. This action cannot be undone.
          </Alert>

          <Text size="sm">
            Upload a settings backup file to restore configuration:
          </Text>

          <Button variant="light" leftIcon={<IconUpload size={16} />}>
            Choose Backup File
          </Button>

          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setRestoreModalOpened(false)}>
              Cancel
            </Button>
            <Button color="orange" disabled>
              Restore Settings
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Test Email Modal */}
      <Modal
        opened={testEmailModal}
        onClose={() => setTestEmailModal(false)}
        title="Test Email Configuration"
      >
        <Stack spacing="md">
          <TextInput
            label="Test Email Address"
            placeholder="test@example.com"
            required
          />
          <Button
            fullWidth
            onClick={testEmailConfiguration}
            leftIcon={<IconMail size={16} />}
          >
            Send Test Email
          </Button>
        </Stack>
      </Modal>
    </Container>
  )
}
