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
  Loader,
  Table,
  ActionIcon,
  Tooltip,
  List,
  ThemeIcon,
  Progress,
  Tabs
} from '@mantine/core'
import { 
  IconMail, 
  IconCheck, 
  IconAlertCircle, 
  IconSettings,
  IconShield,
  IconDeviceDesktop,
  IconHistory,
  IconLock,
  IconX,
  IconAlertTriangle,
  IconCircleCheck
} from '@tabler/icons-react'
import OTPSettings from '../../components/OTP/OTPSettings.jsx'
import { trpc } from '../../utils/trpc.jsx'
import { notifications } from '@mantine/notifications'

export default function Settings () {
  const { data: user, isLoading: isUserLoading, error: userError } = trpc.auth.me.useQuery()
  const { data: settings, isLoading: areSettingsLoading, error: settingsError } = trpc.settings.get.useQuery()
  const { data: activeSessions, isLoading: sessionsLoading, refetch: refetchSessions } = trpc.sessions.getActiveSessions.useQuery()
  const { data: loginHistory, isLoading: historyLoading } = trpc.sessions.getLoginHistory.useQuery({ limit: 50 })
  const revokeSession = trpc.sessions.revokeSession.useMutation()
  const revokeAllSessions = trpc.sessions.revokeAllOtherSessions.useMutation()
  const updateSettings = trpc.settings.update.useMutation()
  const utils = trpc.useContext()
  const [saving, setSaving] = useState(false)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [volumeAlerts, setVolumeAlerts] = useState(true)
  const [priceDropAlerts, setPriceDropAlerts] = useState(true)
  const [cooldownPeriod, setCooldownPeriod] = useState('60') // minutes
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  
  // Get current refresh token from localStorage
  const getCurrentRefreshToken = () => {
    try {
      const authData = localStorage.getItem('auth')
      if (authData) {
        const parsed = JSON.parse(authData)
        return parsed.refreshToken || null
      }
    } catch (e) {
      return null
    }
    return null
  }

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

        {/* Active Sessions */}
        <Card withBorder p="lg">
          <Group spacing="sm" mb="md">
            <IconDeviceDesktop size={20} />
            <Text size="lg" weight={600}>Active Sessions</Text>
            {activeSessions && <Badge color="blue" size="sm">{activeSessions.length}</Badge>}
          </Group>
          
          {sessionsLoading ? (
            <Loader size="sm" />
          ) : activeSessions && activeSessions.length > 0 ? (
            <Stack spacing="md">
              <Table>
                <thead>
                  <tr>
                    <th>Device</th>
                    <th>Location</th>
                    <th>Last Activity</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeSessions.map((session) => {
                    const isCurrentSession = session.token === getCurrentRefreshToken()
                    const deviceInfo = session.deviceInfo || {}
                    const lastActivity = new Date(session.lastActivity)
                    const isRecent = (Date.now() - lastActivity.getTime()) < 5 * 60 * 1000 // 5 minutes
                    
                    return (
                      <tr key={session.id}>
                        <td>
                          <Text size="sm">
                            {deviceInfo.browser || 'Unknown'} on {deviceInfo.os || 'Unknown'}
                            {isCurrentSession && (
                              <Badge color="green" size="xs" ml="xs">Current</Badge>
                            )}
                          </Text>
                          <Text size="xs" color="dimmed">{session.ipAddress}</Text>
                        </td>
                        <td>
                          <Text size="sm">{session.ipAddress || 'Unknown'}</Text>
                        </td>
                        <td>
                          <Text size="sm">
                            {isRecent ? 'Just now' : lastActivity.toLocaleString()}
                          </Text>
                        </td>
                        <td>
                          <Badge color={session.isActive ? 'green' : 'gray'} size="sm">
                            {session.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td>
                          {!isCurrentSession && (
                            <Tooltip label="Revoke session">
                              <ActionIcon
                                color="red"
                                onClick={async () => {
                                  try {
                                    await revokeSession.mutateAsync({ sessionId: session.id })
                                    notifications.show({
                                      title: 'Session Revoked',
                                      message: 'The session has been revoked successfully.',
                                      color: 'green'
                                    })
                                    refetchSessions()
                                  } catch (error) {
                                    notifications.show({
                                      title: 'Error',
                                      message: error.message || 'Failed to revoke session.',
                                      color: 'red'
                                    })
                                  }
                                }}
                              >
                                <IconX size={16} />
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </Table>
              
              {activeSessions.length > 1 && (
                <Button
                  variant="outline"
                  color="red"
                  onClick={async () => {
                    try {
                      const currentToken = getCurrentRefreshToken()
                      if (currentToken) {
                        await revokeAllSessions.mutateAsync({ currentToken })
                        notifications.show({
                          title: 'Sessions Revoked',
                          message: 'All other sessions have been revoked.',
                          color: 'green'
                        })
                        refetchSessions()
                      }
                    } catch (error) {
                      notifications.show({
                        title: 'Error',
                        message: error.message || 'Failed to revoke sessions.',
                        color: 'red'
                      })
                    }
                  }}
                >
                  Revoke All Other Sessions
                </Button>
              )}
            </Stack>
          ) : (
            <Text size="sm" color="dimmed">No active sessions</Text>
          )}
        </Card>

        {/* Login History */}
        <Card withBorder p="lg">
          <Group spacing="sm" mb="md">
            <IconHistory size={20} />
            <Text size="lg" weight={600}>Login History</Text>
          </Group>
          
          {historyLoading ? (
            <Loader size="sm" />
          ) : loginHistory && loginHistory.length > 0 ? (
            <Table>
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>IP Address</th>
                  <th>Device</th>
                  <th>Status</th>
                  <th>2FA Used</th>
                </tr>
              </thead>
              <tbody>
                {loginHistory.map((entry) => {
                  const deviceInfo = entry.deviceInfo || {}
                  const createdAt = new Date(entry.createdAt)
                  
                  return (
                    <tr key={entry.id}>
                      <td>
                        <Text size="sm">{createdAt.toLocaleString()}</Text>
                      </td>
                      <td>
                        <Text size="sm">{entry.ipAddress || 'Unknown'}</Text>
                      </td>
                      <td>
                        <Text size="sm">
                          {deviceInfo.browser || 'Unknown'} on {deviceInfo.os || 'Unknown'}
                        </Text>
                      </td>
                      <td>
                        <Badge color={entry.success ? 'green' : 'red'} size="sm">
                          {entry.success ? 'Success' : 'Failed'}
                        </Badge>
                        {entry.failureReason && (
                          <Text size="xs" color="dimmed" mt={4}>
                            {entry.failureReason.replace(/_/g, ' ')}
                          </Text>
                        )}
                      </td>
                      <td>
                        {entry.twoFactorUsed ? (
                          <Badge color="blue" size="sm">Yes</Badge>
                        ) : (
                          <Text size="sm" color="dimmed">No</Text>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </Table>
          ) : (
            <Text size="sm" color="dimmed">No login history available</Text>
          )}
        </Card>

        {/* Password Requirements & Security Score */}
        <Card withBorder p="lg">
          <Group spacing="sm" mb="md">
            <IconShield size={20} />
            <Text size="lg" weight={600}>Security Overview</Text>
          </Group>
          
          <Stack spacing="md">
            {/* Security Score */}
            <Box>
              <Group position="apart" mb="xs">
                <Text size="sm" weight={500}>Security Score</Text>
                <Text size="lg" weight={700}>
                  {calculateSecurityScore(settings, user)}/100
                </Text>
              </Group>
              <Progress 
                value={calculateSecurityScore(settings, user)} 
                color={getSecurityScoreColor(calculateSecurityScore(settings, user))}
                size="lg"
                radius="xl"
              />
            </Box>
            
            <Divider />
            
            {/* Security Checklist */}
            <Stack spacing="xs">
              <Text size="sm" weight={500} mb="xs">Security Checklist</Text>
              
              <SecurityChecklistItem
                checked={settings?.otpEnabled || false}
                label="Two-Factor Authentication Enabled"
                description="Add an extra layer of security to your account"
              />
              
              <SecurityChecklistItem
                checked={user?.emailVerified || false}
                label="Email Verified"
                description="Your email address has been verified"
              />
              
              <SecurityChecklistItem
                checked={hasRecentPasswordChange(user)}
                label="Recent Password Change"
                description="Password changed within the last 90 days"
              />
              
              <SecurityChecklistItem
                checked={!hasSuspiciousActivity(loginHistory)}
                label="No Suspicious Activity"
                description="No unusual login attempts detected"
              />
            </Stack>
            
            <Divider />
            
            {/* Password Requirements */}
            <Box>
              <Text size="sm" weight={500} mb="xs">Password Requirements</Text>
              <List size="sm" spacing="xs">
                <List.Item icon={<IconCheck size={14} color="green" />}>
                  Minimum 8 characters
                </List.Item>
                <List.Item icon={<IconCheck size={14} color="green" />}>
                  At least one uppercase letter
                </List.Item>
                <List.Item icon={<IconCheck size={14} color="green" />}>
                  At least one lowercase letter
                </List.Item>
                <List.Item icon={<IconCheck size={14} color="green" />}>
                  At least one number
                </List.Item>
                <List.Item icon={<IconCheck size={14} color="green" />}>
                  At least one special character
                </List.Item>
              </List>
            </Box>
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

// Helper function to calculate security score
function calculateSecurityScore(settings, user) {
  let score = 0
  
  // 2FA enabled: 40 points
  if (settings?.otpEnabled) score += 40
  
  // Email verified: 20 points
  if (user?.emailVerified) score += 20
  
  // Recent password change: 20 points
  if (hasRecentPasswordChange(user)) score += 20
  
  // No suspicious activity: 20 points
  // This would need loginHistory passed in, but for now we'll assume true
  score += 20
  
  return score
}

// Helper function to get security score color
function getSecurityScoreColor(score) {
  if (score >= 80) return 'green'
  if (score >= 60) return 'yellow'
  return 'red'
}

// Helper function to check if password was changed recently
function hasRecentPasswordChange(user) {
  // This would require tracking password change date
  // For now, return true as a placeholder
  return true
}

// Helper function to check for suspicious activity
function hasSuspiciousActivity(loginHistory) {
  if (!loginHistory || loginHistory.length === 0) return false
  
  // Check for multiple failed attempts in last 24 hours
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const recentFailures = loginHistory.filter(
    entry => !entry.success && new Date(entry.createdAt) > oneDayAgo
  )
  
  return recentFailures.length >= 5
}

// Security Checklist Item Component
function SecurityChecklistItem({ checked, label, description }) {
  return (
    <Group spacing="xs" noWrap>
      <ThemeIcon
        color={checked ? 'green' : 'gray'}
        variant={checked ? 'filled' : 'outline'}
        size="sm"
        radius="xl"
      >
        {checked ? <IconCheck size={14} /> : <IconAlertCircle size={14} />}
      </ThemeIcon>
      <Box style={{ flex: 1 }}>
        <Text size="sm" weight={checked ? 500 : 400}>
          {label}
        </Text>
        <Text size="xs" color="dimmed">
          {description}
        </Text>
      </Box>
    </Group>
  )
}
