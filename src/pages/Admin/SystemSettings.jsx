import React, { useState } from 'react'
import {
  Container,
  Title,
  Paper,
  Group,
  Text,
  Button,
  Stack,
  Grid,
  Card,
  Switch,
  NumberInput,
  TextInput,
  Textarea,
  Select,
  Badge,
  Alert,
  Tabs,
  Divider,
  JsonInput,
  Code,
  ActionIcon,
  Tooltip,
  Modal
} from '@mantine/core'
import {
  IconSettings,
  IconServer,
  IconDatabase,
  IconShield,
  IconMail,
  IconBell,
  IconSave,
  IconRefresh,
  IconEdit,
  IconAlertTriangle,
  IconCheck,
  IconApi,
  IconKey,
  IconCloud
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'

const SystemSettings = () => {
  const [activeTab, setActiveTab] = useState('general')
  const [settings, setSettings] = useState({
    general: {
      siteName: 'GE Metrics',
      siteDescription: 'Live Market Data for Old School RuneScape',
      maintenanceMode: false,
      allowRegistration: true,
      maxUsersPerDay: 100,
      sessionTimeout: 30
    },
    database: {
      connectionPoolSize: 20,
      queryTimeout: 30000,
      autoBackup: true,
      backupInterval: 24,
      retentionDays: 30
    },
    security: {
      enforceHttps: true,
      requireEmailVerification: true,
      enableTwoFactor: true,
      passwordMinLength: 8,
      maxLoginAttempts: 5,
      lockoutDuration: 15,
      enableRateLimiting: true,
      rateLimit: 100
    },
    email: {
      provider: 'smtp',
      smtpHost: 'smtp.gmail.com',
      smtpPort: 587,
      smtpSecure: true,
      fromAddress: 'noreply@gemetrics.com',
      fromName: 'GE Metrics'
    },
    api: {
      enableApiKeys: true,
      defaultRateLimit: 1000,
      enableCors: true,
      corsOrigins: 'http://localhost:3000,https://gemetrics.com',
      enableCompression: true,
      cacheTimeout: 300
    },
    notifications: {
      enableEmailNotifications: true,
      enablePushNotifications: false,
      enableSlackIntegration: false,
      slackWebhookUrl: '',
      notifyOnErrors: true,
      notifyOnHighUsage: true
    }
  })
  
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [pendingChanges, setPendingChanges] = useState(false)

  const updateSetting = (section, key, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }))
    setPendingChanges(true)
  }

  const handleSaveSettings = () => {
    setSaveModalOpen(true)
  }

  const confirmSaveSettings = () => {
    // Mock save operation
    notifications.show({
      title: 'Settings Saved',
      message: 'System settings have been updated successfully',
      color: 'green',
      icon: <IconCheck size={16} />
    })
    setPendingChanges(false)
    setSaveModalOpen(false)
  }

  const handleResetSettings = () => {
    notifications.show({
      title: 'Settings Reset',
      message: 'Settings have been reset to defaults',
      color: 'blue'
    })
    setPendingChanges(false)
  }

  // General Settings Tab
  const GeneralSettingsTab = () => (
    <Stack spacing="md">
      <Card withBorder p="md">
        <Stack spacing="md">
          <Text size="lg" weight={500}>Site Configuration</Text>
          <Grid>
            <Grid.Col md={6}>
              <TextInput
                label="Site Name"
                value={settings.general.siteName}
                onChange={(e) => updateSetting('general', 'siteName', e.target.value)}
              />
            </Grid.Col>
            <Grid.Col md={6}>
              <NumberInput
                label="Session Timeout (minutes)"
                value={settings.general.sessionTimeout}
                onChange={(value) => updateSetting('general', 'sessionTimeout', value)}
                min={5}
                max={1440}
              />
            </Grid.Col>
          </Grid>
          <Textarea
            label="Site Description"
            value={settings.general.siteDescription}
            onChange={(e) => updateSetting('general', 'siteDescription', e.target.value)}
            minRows={2}
          />
        </Stack>
      </Card>

      <Card withBorder p="md">
        <Stack spacing="md">
          <Text size="lg" weight={500}>User Management</Text>
          <Group>
            <Switch
              label="Allow New User Registration"
              checked={settings.general.allowRegistration}
              onChange={(e) => updateSetting('general', 'allowRegistration', e.currentTarget.checked)}
            />
            <Switch
              label="Maintenance Mode"
              checked={settings.general.maintenanceMode}
              onChange={(e) => updateSetting('general', 'maintenanceMode', e.currentTarget.checked)}
            />
          </Group>
          <NumberInput
            label="Maximum New Users Per Day"
            value={settings.general.maxUsersPerDay}
            onChange={(value) => updateSetting('general', 'maxUsersPerDay', value)}
            min={0}
            max={10000}
            style={{ maxWidth: 300 }}
          />
        </Stack>
      </Card>
    </Stack>
  )

  // Database Settings Tab
  const DatabaseSettingsTab = () => (
    <Stack spacing="md">
      <Card withBorder p="md">
        <Stack spacing="md">
          <Text size="lg" weight={500}>Connection Settings</Text>
          <Grid>
            <Grid.Col md={6}>
              <NumberInput
                label="Connection Pool Size"
                value={settings.database.connectionPoolSize}
                onChange={(value) => updateSetting('database', 'connectionPoolSize', value)}
                min={1}
                max={100}
              />
            </Grid.Col>
            <Grid.Col md={6}>
              <NumberInput
                label="Query Timeout (ms)"
                value={settings.database.queryTimeout}
                onChange={(value) => updateSetting('database', 'queryTimeout', value)}
                min={1000}
                max={300000}
              />
            </Grid.Col>
          </Grid>
        </Stack>
      </Card>

      <Card withBorder p="md">
        <Stack spacing="md">
          <Text size="lg" weight={500}>Backup Configuration</Text>
          <Group>
            <Switch
              label="Enable Automatic Backups"
              checked={settings.database.autoBackup}
              onChange={(e) => updateSetting('database', 'autoBackup', e.currentTarget.checked)}
            />
          </Group>
          <Grid>
            <Grid.Col md={6}>
              <NumberInput
                label="Backup Interval (hours)"
                value={settings.database.backupInterval}
                onChange={(value) => updateSetting('database', 'backupInterval', value)}
                min={1}
                max={168}
                disabled={!settings.database.autoBackup}
              />
            </Grid.Col>
            <Grid.Col md={6}>
              <NumberInput
                label="Retention Period (days)"
                value={settings.database.retentionDays}
                onChange={(value) => updateSetting('database', 'retentionDays', value)}
                min={1}
                max={365}
                disabled={!settings.database.autoBackup}
              />
            </Grid.Col>
          </Grid>
        </Stack>
      </Card>
    </Stack>
  )

  // Security Settings Tab
  const SecuritySettingsTab = () => (
    <Stack spacing="md">
      <Card withBorder p="md">
        <Stack spacing="md">
          <Text size="lg" weight={500}>Authentication Security</Text>
          <Group>
            <Switch
              label="Enforce HTTPS"
              checked={settings.security.enforceHttps}
              onChange={(e) => updateSetting('security', 'enforceHttps', e.currentTarget.checked)}
            />
            <Switch
              label="Require Email Verification"
              checked={settings.security.requireEmailVerification}
              onChange={(e) => updateSetting('security', 'requireEmailVerification', e.currentTarget.checked)}
            />
            <Switch
              label="Enable Two-Factor Authentication"
              checked={settings.security.enableTwoFactor}
              onChange={(e) => updateSetting('security', 'enableTwoFactor', e.currentTarget.checked)}
            />
          </Group>
          <Grid>
            <Grid.Col md={4}>
              <NumberInput
                label="Minimum Password Length"
                value={settings.security.passwordMinLength}
                onChange={(value) => updateSetting('security', 'passwordMinLength', value)}
                min={6}
                max={128}
              />
            </Grid.Col>
            <Grid.Col md={4}>
              <NumberInput
                label="Max Login Attempts"
                value={settings.security.maxLoginAttempts}
                onChange={(value) => updateSetting('security', 'maxLoginAttempts', value)}
                min={3}
                max={20}
              />
            </Grid.Col>
            <Grid.Col md={4}>
              <NumberInput
                label="Lockout Duration (minutes)"
                value={settings.security.lockoutDuration}
                onChange={(value) => updateSetting('security', 'lockoutDuration', value)}
                min={1}
                max={1440}
              />
            </Grid.Col>
          </Grid>
        </Stack>
      </Card>

      <Card withBorder p="md">
        <Stack spacing="md">
          <Text size="lg" weight={500}>Rate Limiting</Text>
          <Group>
            <Switch
              label="Enable Rate Limiting"
              checked={settings.security.enableRateLimiting}
              onChange={(e) => updateSetting('security', 'enableRateLimiting', e.currentTarget.checked)}
            />
          </Group>
          <NumberInput
            label="Requests per minute"
            value={settings.security.rateLimit}
            onChange={(value) => updateSetting('security', 'rateLimit', value)}
            min={10}
            max={10000}
            disabled={!settings.security.enableRateLimiting}
            style={{ maxWidth: 300 }}
          />
        </Stack>
      </Card>
    </Stack>
  )

  // API Settings Tab
  const ApiSettingsTab = () => (
    <Stack spacing="md">
      <Card withBorder p="md">
        <Stack spacing="md">
          <Text size="lg" weight={500}>API Configuration</Text>
          <Group>
            <Switch
              label="Enable API Keys"
              checked={settings.api.enableApiKeys}
              onChange={(e) => updateSetting('api', 'enableApiKeys', e.currentTarget.checked)}
            />
            <Switch
              label="Enable CORS"
              checked={settings.api.enableCors}
              onChange={(e) => updateSetting('api', 'enableCors', e.currentTarget.checked)}
            />
            <Switch
              label="Enable Compression"
              checked={settings.api.enableCompression}
              onChange={(e) => updateSetting('api', 'enableCompression', e.currentTarget.checked)}
            />
          </Group>
          <Grid>
            <Grid.Col md={6}>
              <NumberInput
                label="Default Rate Limit (requests/hour)"
                value={settings.api.defaultRateLimit}
                onChange={(value) => updateSetting('api', 'defaultRateLimit', value)}
                min={100}
                max={100000}
              />
            </Grid.Col>
            <Grid.Col md={6}>
              <NumberInput
                label="Cache Timeout (seconds)"
                value={settings.api.cacheTimeout}
                onChange={(value) => updateSetting('api', 'cacheTimeout', value)}
                min={60}
                max={3600}
              />
            </Grid.Col>
          </Grid>
          <TextInput
            label="CORS Origins (comma-separated)"
            value={settings.api.corsOrigins}
            onChange={(e) => updateSetting('api', 'corsOrigins', e.target.value)}
            disabled={!settings.api.enableCors}
            placeholder="https://example.com,https://app.example.com"
          />
        </Stack>
      </Card>
    </Stack>
  )

  // Notifications Tab
  const NotificationsTab = () => (
    <Stack spacing="md">
      <Card withBorder p="md">
        <Stack spacing="md">
          <Text size="lg" weight={500}>Notification Settings</Text>
          <Group>
            <Switch
              label="Enable Email Notifications"
              checked={settings.notifications.enableEmailNotifications}
              onChange={(e) => updateSetting('notifications', 'enableEmailNotifications', e.currentTarget.checked)}
            />
            <Switch
              label="Enable Push Notifications"
              checked={settings.notifications.enablePushNotifications}
              onChange={(e) => updateSetting('notifications', 'enablePushNotifications', e.currentTarget.checked)}
            />
          </Group>
          <Group>
            <Switch
              label="Notify on Errors"
              checked={settings.notifications.notifyOnErrors}
              onChange={(e) => updateSetting('notifications', 'notifyOnErrors', e.currentTarget.checked)}
            />
            <Switch
              label="Notify on High Usage"
              checked={settings.notifications.notifyOnHighUsage}
              onChange={(e) => updateSetting('notifications', 'notifyOnHighUsage', e.currentTarget.checked)}
            />
          </Group>
        </Stack>
      </Card>

      <Card withBorder p="md">
        <Stack spacing="md">
          <Text size="lg" weight={500}>Slack Integration</Text>
          <Switch
            label="Enable Slack Integration"
            checked={settings.notifications.enableSlackIntegration}
            onChange={(e) => updateSetting('notifications', 'enableSlackIntegration', e.currentTarget.checked)}
          />
          <TextInput
            label="Slack Webhook URL"
            value={settings.notifications.slackWebhookUrl}
            onChange={(e) => updateSetting('notifications', 'slackWebhookUrl', e.target.value)}
            disabled={!settings.notifications.enableSlackIntegration}
            placeholder="https://hooks.slack.com/services/..."
          />
        </Stack>
      </Card>
    </Stack>
  )

  return (
    <Container size="xl">
      <Group position="apart" mb="xl">
        <Title order={2}>System Settings</Title>
        <Group>
          <Button variant="light" onClick={handleResetSettings} leftIcon={<IconRefresh size={16} />}>
            Reset to Defaults
          </Button>
          <Button 
            onClick={handleSaveSettings} 
            leftIcon={<IconSave size={16} />}
            disabled={!pendingChanges}
          >
            Save Changes
          </Button>
        </Group>
      </Group>

      {pendingChanges && (
        <Alert icon={<IconAlertTriangle size={16} />} color="yellow" mb="md">
          You have unsaved changes. Don't forget to save your settings.
        </Alert>
      )}

      <Tabs value={activeTab} onTabChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="general" icon={<IconSettings size={16} />}>
            General
          </Tabs.Tab>
          <Tabs.Tab value="database" icon={<IconDatabase size={16} />}>
            Database
          </Tabs.Tab>
          <Tabs.Tab value="security" icon={<IconShield size={16} />}>
            Security
          </Tabs.Tab>
          <Tabs.Tab value="api" icon={<IconApi size={16} />}>
            API
          </Tabs.Tab>
          <Tabs.Tab value="notifications" icon={<IconBell size={16} />}>
            Notifications
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="general" pt="md">
          <GeneralSettingsTab />
        </Tabs.Panel>

        <Tabs.Panel value="database" pt="md">
          <DatabaseSettingsTab />
        </Tabs.Panel>

        <Tabs.Panel value="security" pt="md">
          <SecuritySettingsTab />
        </Tabs.Panel>

        <Tabs.Panel value="api" pt="md">
          <ApiSettingsTab />
        </Tabs.Panel>

        <Tabs.Panel value="notifications" pt="md">
          <NotificationsTab />
        </Tabs.Panel>
      </Tabs>

      {/* Save Confirmation Modal */}
      <Modal
        opened={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        title="Save System Settings"
        size="sm"
      >
        <Stack spacing="md">
          <Text>
            Are you sure you want to save these system settings? Some changes may require a server restart to take effect.
          </Text>
          <Alert icon={<IconAlertTriangle size={16} />} color="orange">
            Database and security settings changes will be applied immediately.
          </Alert>
          <Group position="right">
            <Button variant="light" onClick={() => setSaveModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmSaveSettings}>
              Save Settings
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  )
}

export default SystemSettings