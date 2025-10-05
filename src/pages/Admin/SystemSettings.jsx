import React, { useState, useEffect } from 'react'
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
  IconRefresh,
  IconEdit,
  IconAlertTriangle,
  IconCheck,
  IconApi,
  IconKey,
  IconCloud,
  IconDeviceFloppy
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { trpc } from '../../utils/trpc'

const SystemSettings = () => {
  const [activeTab, setActiveTab] = useState('general')
  const [settings, setSettings] = useState({})
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [pendingChanges, setPendingChanges] = useState(false)

  // TRPC queries
  const { data: allSettings, isLoading, refetch } = trpc.adminSystemSettings.getAllSettings.useQuery()

  // Mutations
  const updateSectionMutation = trpc.adminSystemSettings.updateSectionSettings.useMutation({
    onSuccess: () => {
      notifications.show({
        title: 'Settings Saved',
        message: 'System settings have been updated successfully',
        color: 'green',
        icon: <IconCheck size={16} />
      })
      setPendingChanges(false)
      setSaveModalOpen(false)
      refetch()
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to save settings',
        color: 'red'
      })
    }
  })

  const resetSectionMutation = trpc.adminSystemSettings.resetSectionToDefaults.useMutation({
    onSuccess: () => {
      notifications.show({
        title: 'Settings Reset',
        message: 'Settings have been reset to defaults',
        color: 'blue'
      })
      setPendingChanges(false)
      refetch()
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to reset settings',
        color: 'red'
      })
    }
  })

  // Update local state when data loads
  useEffect(() => {
    if (allSettings) {
      setSettings(allSettings)
    }
  }, [allSettings])

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
    updateSectionMutation.mutate({
      section: activeTab,
      settings: settings[activeTab] || {}
    })
  }

  const handleResetSettings = () => {
    resetSectionMutation.mutate({
      section: activeTab
    })
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
                value={settings.general?.siteName ?? ''}
                onChange={(e) => updateSetting('general', 'siteName', e.target.value)}
              />
            </Grid.Col>
            <Grid.Col md={6}>
              <NumberInput
                label="Session Timeout (minutes)"
                value={parseFloat(settings.general?.sessionTimeout ?? 0)}
                onChange={(value) => updateSetting('general', 'sessionTimeout', parseFloat(value ?? 0))}
                min={5}
                max={1440}
              />
            </Grid.Col>
          </Grid>
          <Textarea
            label="Site Description"
            value={settings.general?.siteDescription ?? ''}
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
              checked={settings.general?.allowRegistration ?? true}
              onChange={(e) => updateSetting('general', 'allowRegistration', e.currentTarget.checked)}
            />
            <Switch
              label="Maintenance Mode"
              checked={settings.general?.maintenanceMode ?? false}
              onChange={(e) => updateSetting('general', 'maintenanceMode', e.currentTarget.checked)}
            />
          </Group>
          <NumberInput
            label="Maximum New Users Per Day"
            value={parseFloat(settings.general?.maxUsersPerDay ?? 0)}
            onChange={(value) => updateSetting('general', 'maxUsersPerDay', parseFloat(value ?? 0))}
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
                value={parseFloat(settings.database?.connectionPoolSize ?? 0)}
                onChange={(value) => updateSetting('database', 'connectionPoolSize', parseFloat(value ?? 0))}
                min={1}
                max={100}
              />
            </Grid.Col>
            <Grid.Col md={6}>
              <NumberInput
                label="Query Timeout (ms)"
                value={parseFloat(settings.database?.queryTimeout ?? 0)}
                onChange={(value) => updateSetting('database', 'queryTimeout', parseFloat(value ?? 0))}
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
              checked={settings.database?.autoBackup ?? true}
              onChange={(e) => updateSetting('database', 'autoBackup', e.currentTarget.checked)}
            />
          </Group>
          <Grid>
            <Grid.Col md={6}>
              <NumberInput
                label="Backup Interval (hours)"
                value={parseFloat(settings.database?.backupInterval ?? 0)}
                onChange={(value) => updateSetting('database', 'backupInterval', parseFloat(value ?? 0))}
                min={1}
                max={168}
                disabled={!settings.database?.autoBackup}
              />
            </Grid.Col>
            <Grid.Col md={6}>
              <NumberInput
                label="Retention Period (days)"
                value={parseFloat(settings.database?.retentionDays ?? 0)}
                onChange={(value) => updateSetting('database', 'retentionDays', parseFloat(value ?? 0))}
                min={1}
                max={365}
                disabled={!settings.database?.autoBackup}
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
              checked={settings.security?.enforceHttps ?? true}
              onChange={(e) => updateSetting('security', 'enforceHttps', e.currentTarget.checked)}
            />
            <Switch
              label="Require Email Verification"
              checked={settings.security?.requireEmailVerification ?? true}
              onChange={(e) => updateSetting('security', 'requireEmailVerification', e.currentTarget.checked)}
            />
            <Switch
              label="Enable Two-Factor Authentication"
              checked={settings.security?.enableTwoFactor ?? false}
              onChange={(e) => updateSetting('security', 'enableTwoFactor', e.currentTarget.checked)}
            />
          </Group>
          <Grid>
            <Grid.Col md={4}>
              <NumberInput
                label="Minimum Password Length"
                value={parseFloat(settings.security?.passwordMinLength ?? 0)}
                onChange={(value) => updateSetting('security', 'passwordMinLength', parseFloat(value ?? 0))}
                min={6}
                max={128}
              />
            </Grid.Col>
            <Grid.Col md={4}>
              <NumberInput
                label="Max Login Attempts"
                value={parseFloat(settings.security?.maxLoginAttempts ?? 0)}
                onChange={(value) => updateSetting('security', 'maxLoginAttempts', parseFloat(value ?? 0))}
                min={3}
                max={20}
              />
            </Grid.Col>
            <Grid.Col md={4}>
              <NumberInput
                label="Lockout Duration (minutes)"
                value={parseFloat(settings.security?.lockoutDuration ?? 0)}
                onChange={(value) => updateSetting('security', 'lockoutDuration', parseFloat(value ?? 0))}
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
              checked={settings.security?.enableRateLimiting ?? true}
              onChange={(e) => updateSetting('security', 'enableRateLimiting', e.currentTarget.checked)}
            />
          </Group>
          <NumberInput
            label="Requests per minute"
            value={parseFloat(settings.security?.rateLimit ?? 0)}
            onChange={(value) => updateSetting('security', 'rateLimit', parseFloat(value ?? 0))}
            min={10}
            max={10000}
            disabled={!settings.security?.enableRateLimiting}
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
              checked={settings.api?.enableApiKeys ?? true}
              onChange={(e) => updateSetting('api', 'enableApiKeys', e.currentTarget.checked)}
            />
            <Switch
              label="Enable CORS"
              checked={settings.api?.enableCors ?? false}
              onChange={(e) => updateSetting('api', 'enableCors', e.currentTarget.checked)}
            />
            <Switch
              label="Enable Compression"
              checked={settings.api?.enableCompression ?? true}
              onChange={(e) => updateSetting('api', 'enableCompression', e.currentTarget.checked)}
            />
          </Group>
          <Grid>
            <Grid.Col md={6}>
              <NumberInput
                label="Default Rate Limit (requests/hour)"
                value={parseFloat(settings.api?.defaultRateLimit ?? 0)}
                onChange={(value) => updateSetting('api', 'defaultRateLimit', parseFloat(value ?? 0))}
                min={100}
                max={100000}
              />
            </Grid.Col>
            <Grid.Col md={6}>
              <NumberInput
                label="Cache Timeout (seconds)"
                value={parseFloat(settings.api?.cacheTimeout ?? 0)}
                onChange={(value) => updateSetting('api', 'cacheTimeout', parseFloat(value ?? 0))}
                min={60}
                max={3600}
              />
            </Grid.Col>
          </Grid>
          <TextInput
            label="CORS Origins (comma-separated)"
            value={settings.api?.corsOrigins ?? ''}
            onChange={(e) => updateSetting('api', 'corsOrigins', e.target.value)}
            disabled={!settings.api?.enableCors}
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
              checked={settings.notifications?.enableEmailNotifications ?? true}
              onChange={(e) => updateSetting('notifications', 'enableEmailNotifications', e.currentTarget.checked)}
            />
            <Switch
              label="Enable Push Notifications"
              checked={settings.notifications?.enablePushNotifications ?? false}
              onChange={(e) => updateSetting('notifications', 'enablePushNotifications', e.currentTarget.checked)}
            />
          </Group>
          <Group>
            <Switch
              label="Notify on Errors"
              checked={settings.notifications?.notifyOnErrors ?? true}
              onChange={(e) => updateSetting('notifications', 'notifyOnErrors', e.currentTarget.checked)}
            />
            <Switch
              label="Notify on High Usage"
              checked={settings.notifications?.notifyOnHighUsage ?? false}
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
            checked={settings.notifications?.enableSlackIntegration ?? false}
            onChange={(e) => updateSetting('notifications', 'enableSlackIntegration', e.currentTarget.checked)}
          />
          <TextInput
            label="Slack Webhook URL"
            value={settings.notifications?.slackWebhookUrl ?? ''}
            onChange={(e) => updateSetting('notifications', 'slackWebhookUrl', e.target.value)}
            disabled={!settings.notifications?.enableSlackIntegration}
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
            leftIcon={<IconDeviceFloppy size={16} />}
            disabled={!pendingChanges}
            loading={updateSectionMutation.isLoading}
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
            <Button onClick={confirmSaveSettings} loading={updateSectionMutation.isLoading}>
              Save Settings
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  )
}

export default SystemSettings
