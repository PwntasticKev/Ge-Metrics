import React, { useState, useEffect } from 'react'
import {
  Container,
  Paper,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Table,
  Badge,
  ActionIcon,
  Menu,
  Modal,
  TextInput,
  Select,
  Textarea,
  Alert,
  Tabs,
  Card,
  Grid,
  Progress,
  Avatar,
  Tooltip,
  Pagination,
  LoadingOverlay,
  NumberInput,
  Switch,
  Divider,
  Accordion,
  Timeline,
  Code,
  ScrollArea,
  Checkbox,
  Indicator,
  MultiSelect,
  Notification,
  Center,
  SimpleGrid,
  ThemeIcon,
  RingProgress
} from '@mantine/core'
import { DateInput, DatePicker } from '@mantine/dates'
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconEye,
  IconUserCheck,
  IconUserX,
  IconShield,
  IconUsers,
  IconChevronDown,
  IconSearch,
  IconDownload,
  IconRefresh,
  IconSettings,
  IconAlertCircle,
  IconCheck,
  IconX,
  IconBan,
  IconUserOff,
  IconKey,
  IconMail,
  IconClock,
  IconActivity,
  IconCreditCard,
  IconGift,
  IconLock,
  IconLockOpen,
  IconDots,
  IconFileExport,
  IconFilter,
  IconSortAscending,
  IconEyeOff,
  IconDevices,
  IconCalendar,
  IconCrown,
  IconStar,
  IconInfoCircle,
  IconAlertTriangle,
  IconWifi,
  IconWifiOff,
  IconSend,
  IconTemplate,
  IconUserPlus,
  IconBug,
  IconFingerprint,
  IconLocation,
  IconDeviceDesktop,
  IconNetwork,
  IconTarget,
  IconDatabase,
  IconChartLine
} from '@tabler/icons-react'
import { useForm } from '@mantine/form'
import userManagementService from '../../../services/userManagementService'
import { showNotification } from '@mantine/notifications'

const UserManagement = () => {
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState('view') // 'view', 'edit', 'role', 'trial', 'block', 'sessions'
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [membershipFilter, setMembershipFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [stats, setStats] = useState({})
  const [auditLog, setAuditLog] = useState([])
  const [activeTab, setActiveTab] = useState('users')
  const [messageModalOpened, setMessageModalOpened] = useState(false)

  // Mass messaging
  const [selectedUsers, setSelectedUsers] = useState([])
  const [messageRecipients, setMessageRecipients] = useState([])
  const [messageSubject, setMessageSubject] = useState('')
  const [messageBody, setMessageBody] = useState('')
  const [messageTemplate, setMessageTemplate] = useState('')
  const [smartSuggestions, setSmartSuggestions] = useState([])
  const [messageTemplates, setMessageTemplates] = useState({})

  // User editing
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    runescape_name: '',
    role: 'user',
    membership: 'free',
    subscription_status: 'none'
  })

  // Suspicious behavior tracking state
  const [suspiciousActivity, setSuspiciousActivity] = useState({
    apiAbuse: [],
    multipleAccounts: [],
    suspiciousIPs: [],
    botBehavior: [],
    dataScrapingAttempts: [],
    deviceFingerprints: [],
    networkAnalysis: [],
    behaviorPatterns: []
  })

  // Security investigation state
  const [securityInvestigation, setSecurityInvestigation] = useState({
    selectedUser: null,
    investigationOpen: false,
    ipHistory: [],
    deviceHistory: [],
    behaviorAnalysis: {},
    threatLevel: 'low',
    securityTimeline: [],
    networkConnections: []
  })

  // Mass messaging state
  const [messageForm, setMessageForm] = useState({
    subject: '',
    message: '',
    recipients: 'all',
    template: '',
    priority: 'normal'
  })

  const itemsPerPage = 20

  const form = useForm({
    initialValues: {
      name: '',
      email: '',
      runescape_name: '',
      role: 'user',
      membership: 'free',
      subscription_status: 'none'
    }
  })

  const trialForm = useForm({
    initialValues: {
      duration: '',
      endDate: null,
      useEndDate: false,
      note: ''
    }
  })

  const blockForm = useForm({
    initialValues: {
      reason: ''
    }
  })

  useEffect(() => {
    loadUsers()
    loadStats()
    loadAuditLog()
    loadSuspiciousActivity()
  }, [])

  useEffect(() => {
    filterUsers()
  }, [users, searchQuery, roleFilter, membershipFilter, statusFilter])

  const loadUsers = () => {
    setLoading(true)
    try {
      const userData = userManagementService.getAllUsers()
      const analyticsData = userManagementService.getUserAnalytics()
      const suggestions = userManagementService.getSmartRecipientSuggestions()
      const templates = userManagementService.getMessageTemplates()

      setUsers(userData)
      setStats(analyticsData)
      setSmartSuggestions(suggestions)
      setMessageTemplates(templates)
    } catch (error) {
      showNotification({
        title: 'Error',
        message: 'Failed to load user data',
        color: 'red'
      })
    } finally {
      setLoading(false)
    }
  }

  const loadStats = () => {
    const statsData = userManagementService.getUserStats()
    setStats(statsData)
  }

  const loadAuditLog = () => {
    const logs = userManagementService.getAuditLog()
    setAuditLog(logs.slice(0, 50)) // Show last 50 entries
  }

  const loadSuspiciousActivity = async () => {
    try {
      // Simulate comprehensive security monitoring
      const suspiciousData = {
        apiAbuse: [
          {
            userId: 1,
            userName: 'john_doe',
            email: 'john@example.com',
            requestCount: 15420,
            timeWindow: '1 hour',
            rateLimit: 1000,
            severity: 'critical',
            ipAddress: '192.168.1.100',
            userAgent: 'Python/3.9 requests/2.25.1',
            endpoints: ['/api/items', '/api/prices', '/api/volumes'],
            pattern: 'Automated scraping detected',
            firstDetected: new Date(Date.now() - 3600000),
            lastSeen: new Date()
          },
          {
            userId: 5,
            userName: 'trader_bot',
            email: 'bot@trading.com',
            requestCount: 8900,
            timeWindow: '30 minutes',
            rateLimit: 1000,
            severity: 'high',
            ipAddress: '10.0.0.50',
            userAgent: 'curl/7.68.0',
            endpoints: ['/api/predictions', '/api/analysis'],
            pattern: 'Rapid API consumption',
            firstDetected: new Date(Date.now() - 1800000),
            lastSeen: new Date()
          }
        ],

        multipleAccounts: [
          {
            primaryUserId: 3,
            relatedUserIds: [7, 12, 18],
            sharedIP: '203.0.113.10',
            deviceFingerprint: 'fp_abc123def456',
            confidence: 0.92,
            indicators: ['Same IP', 'Same device', 'Similar usage patterns', 'Sequential registration'],
            riskLevel: 'high',
            detectedAt: new Date(Date.now() - 86400000)
          }
        ],

        suspiciousIPs: [
          {
            ipAddress: '198.51.100.42',
            country: 'Unknown',
            provider: 'VPN Service',
            userCount: 15,
            requestCount: 25000,
            riskScore: 85,
            indicators: ['VPN/Proxy', 'High user count', 'Abnormal traffic'],
            firstSeen: new Date(Date.now() - 172800000),
            lastActivity: new Date(),
            blockedUsers: [2, 8, 14]
          },
          {
            ipAddress: '192.0.2.100',
            country: 'Russia',
            provider: 'Hosting Provider',
            userCount: 8,
            requestCount: 12000,
            riskScore: 70,
            indicators: ['Datacenter IP', 'Multiple accounts', 'Bot-like behavior'],
            firstSeen: new Date(Date.now() - 259200000),
            lastActivity: new Date(),
            blockedUsers: []
          }
        ],

        botBehavior: [
          {
            userId: 9,
            userName: 'data_collector',
            confidence: 0.88,
            indicators: [
              'Perfect timing intervals',
              'No mouse movement variation',
              'Consistent request patterns',
              'No human-like delays'
            ],
            activityPattern: 'Requests every 5.2 seconds',
            sessionDuration: '6 hours continuous',
            humanScore: 0.12,
            detectedAt: new Date(Date.now() - 21600000)
          }
        ],

        dataScrapingAttempts: [
          {
            userId: 11,
            userName: 'scraper_user',
            targetEndpoints: ['/api/all-items', '/api/market-data', '/api/historical'],
            requestVolume: 50000,
            dataExtracted: '2.3 GB',
            timeframe: '2 hours',
            detectionMethod: 'Pattern analysis',
            severity: 'critical',
            blocked: true,
            detectedAt: new Date(Date.now() - 7200000)
          }
        ],

        deviceFingerprints: [
          {
            fingerprint: 'fp_malicious_001',
            userIds: [4, 9, 15, 22],
            riskScore: 95,
            indicators: ['Spoofed headers', 'Automation tools', 'Multiple accounts'],
            firstSeen: new Date(Date.now() - 604800000),
            lastSeen: new Date()
          }
        ],

        networkAnalysis: [
          {
            sourceIP: '172.16.0.50',
            targetEndpoints: ['/api/admin', '/api/users', '/api/sensitive'],
            attemptCount: 1200,
            successRate: 0.02,
            attackType: 'Brute force',
            severity: 'critical',
            blocked: true,
            detectedAt: new Date(Date.now() - 1800000)
          }
        ],

        behaviorPatterns: [
          {
            userId: 6,
            userName: 'suspicious_trader',
            anomalies: [
              'Trading only during off-hours',
              'Unusual profit margins',
              'Rapid account switching',
              'Geographic inconsistencies'
            ],
            riskScore: 78,
            investigationStatus: 'under_review',
            assignedTo: 'security_team',
            detectedAt: new Date(Date.now() - 43200000)
          }
        ]
      }

      setSuspiciousActivity(suspiciousData)
    } catch (error) {
      console.error('Failed to load suspicious activity:', error)
    }
  }

  const filterUsers = () => {
    let filtered = [...users]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.runescape_name?.toLowerCase().includes(query)
      )
    }

    if (roleFilter) {
      filtered = filtered.filter(user => user.role === roleFilter)
    }

    if (membershipFilter) {
      filtered = filtered.filter(user => user.membership === membershipFilter)
    }

    if (statusFilter) {
      if (statusFilter === 'active') {
        filtered = filtered.filter(user => user.session_id)
      } else if (statusFilter === 'blocked') {
        filtered = filtered.filter(user => user.is_blocked)
      } else if (statusFilter === 'expired') {
        filtered = filtered.filter(user => user.subscription_status === 'expired')
      }
    }

    setFilteredUsers(filtered)
    setCurrentPage(1)
  }

  const openModal = (type, user = null) => {
    setModalType(type)
    setSelectedUser(user)
    setModalOpen(true)

    if (type === 'edit' && user) {
      form.setValues({
        name: user.name,
        email: user.email,
        runescape_name: user.runescape_name || '',
        role: user.role,
        membership: user.membership,
        subscription_status: user.subscription_status
      })
    }

    if (type === 'trial') {
      trialForm.reset()
    }

    if (type === 'block') {
      blockForm.reset()
    }
  }

  const closeModal = () => {
    setModalOpen(false)
    setSelectedUser(null)
    form.reset()
    trialForm.reset()
    blockForm.reset()
  }

  const handleCreateUser = async (values) => {
    try {
      const result = userManagementService.createUser(values)
      if (result.success) {
        showNotification({
          title: 'Success',
          message: 'User created successfully',
          color: 'green'
        })
        loadUsers()
        loadStats()
        closeModal()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      showNotification({
        title: 'Error',
        message: error.message,
        color: 'red'
      })
    }
  }

  const handleUpdateUser = async (values) => {
    try {
      const result = userManagementService.updateUser(selectedUser.id, values)
      if (result.success) {
        showNotification({
          title: 'Success',
          message: 'User updated successfully',
          color: 'green'
        })
        loadUsers()
        loadStats()
        closeModal()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      showNotification({
        title: 'Error',
        message: error.message,
        color: 'red'
      })
    }
  }

  const handleUpdateRole = async (userId, newRole) => {
    try {
      const result = userManagementService.updateUserRole(userId, newRole, 'user_admin_001') // Current admin
      if (result.success) {
        showNotification({
          title: 'Success',
          message: 'User role updated successfully',
          color: 'green'
        })
        loadUsers()
        loadStats()
        loadAuditLog()
        closeModal()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      showNotification({
        title: 'Error',
        message: error.message,
        color: 'red'
      })
    }
  }

  const handleGrantTrial = async (values) => {
    try {
      // Determine if using end date or duration
      const endDate = values.useEndDate ? values.endDate : null
      const duration = values.useEndDate ? null : values.duration

      const result = userManagementService.grantFreeTrial(
        selectedUser.id,
        duration,
        endDate,
        values.note
      )
      if (result.success) {
        const message = values.useEndDate
          ? `Free trial granted until ${new Date(values.endDate).toLocaleDateString()}`
          : `Free trial granted for ${values.duration} days`

        showNotification({
          title: 'Success',
          message,
          color: 'green'
        })
        loadUsers()
        loadStats()
        loadAuditLog()
        closeModal()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      showNotification({
        title: 'Error',
        message: error.message,
        color: 'red'
      })
    }
  }

  const handleBlockUser = async (values) => {
    try {
      const result = userManagementService.blockUser(
        selectedUser.id,
        values.reason,
        'user_admin_001'
      )
      if (result.success) {
        showNotification({
          title: 'Success',
          message: 'User blocked successfully',
          color: 'green'
        })
        loadUsers()
        loadStats()
        loadAuditLog()
        closeModal()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      showNotification({
        title: 'Error',
        message: error.message,
        color: 'red'
      })
    }
  }

  const handleUnblockUser = async (userId) => {
    try {
      const result = userManagementService.unblockUser(userId, 'user_admin_001')
      if (result.success) {
        showNotification({
          title: 'Success',
          message: 'User unblocked successfully',
          color: 'green'
        })
        loadUsers()
        loadStats()
        loadAuditLog()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      showNotification({
        title: 'Error',
        message: error.message,
        color: 'red'
      })
    }
  }

  const handleDestroySession = async (userId) => {
    try {
      const result = userManagementService.destroyUserSessions(userId)
      if (result.success) {
        showNotification({
          title: 'Success',
          message: `Destroyed ${result.destroyedCount} session(s)`,
          color: 'green'
        })
        loadUsers()
        loadAuditLog()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      showNotification({
        title: 'Error',
        message: error.message,
        color: 'red'
      })
    }
  }

  const handleSendPasswordReset = async (userId) => {
    try {
      const result = userManagementService.sendPasswordReset(userId)
      if (result.success) {
        showNotification({
          title: 'Success',
          message: 'Password reset email sent',
          color: 'green'
        })
        loadAuditLog()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      showNotification({
        title: 'Error',
        message: error.message,
        color: 'red'
      })
    }
  }

  const handleSendUsernameReminder = async (userId) => {
    try {
      const result = userManagementService.sendUsernameReminder(userId)
      if (result.success) {
        showNotification({
          title: 'Success',
          message: 'Username reminder sent',
          color: 'green'
        })
        loadAuditLog()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      showNotification({
        title: 'Error',
        message: error.message,
        color: 'red'
      })
    }
  }

  const exportData = (format) => {
    try {
      const data = userManagementService.exportUserData(format)
      const blob = new Blob([data], {
        type: format === 'csv' ? 'text/csv' : 'application/json'
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `user-data-${new Date().toISOString().split('T')[0]}.${format}`
      a.click()
      URL.revokeObjectURL(url)

      showNotification({
        title: 'Success',
        message: `Data exported as ${format.toUpperCase()}`,
        color: 'green'
      })
    } catch (error) {
      showNotification({
        title: 'Error',
        message: 'Failed to export data',
        color: 'red'
      })
    }
  }

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return 'red'
      case 'jmod': return 'orange'
      case 'mod': return 'yellow'
      case 'user': return 'blue'
      default: return 'gray'
    }
  }

  const getSubscriptionBadgeColor = (status) => {
    switch (status) {
      case 'active': return 'green'
      case 'trial': return 'blue'
      case 'expired': return 'red'
      case 'canceled': return 'gray'
      default: return 'gray'
    }
  }

  const formatDate = (date) => {
    if (!date) return 'Never'
    return new Date(date).toLocaleDateString() + ' ' + new Date(date).toLocaleTimeString()
  }

  const formatRelativeTime = (date) => {
    if (!date) return 'Never'
    const now = new Date()
    const diff = now - new Date(date)
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days} day(s) ago`
    if (hours > 0) return `${hours} hour(s) ago`
    if (minutes > 0) return `${minutes} minute(s) ago`
    return 'Just now'
  }

  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentPageData = filteredUsers.slice(startIndex, endIndex)
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)

  const handleEditUser = (user) => {
    setSelectedUser(user)
    setEditForm({
      name: user.name,
      email: user.email,
      runescape_name: user.runescape_name || '',
      role: user.role,
      membership: user.membership,
      subscription_status: user.subscription_status
    })
    setModalType('edit')
    setModalOpen(true)
  }

  const handleSaveUser = async () => {
    try {
      const result = await userManagementService.updateUser(selectedUser.id, editForm)
      if (result.success) {
        showNotification({
          title: 'Success',
          message: 'User updated successfully',
          color: 'green'
        })
        loadUsers()
        loadStats()
        closeModal()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      showNotification({
        title: 'Error',
        message: error.message,
        color: 'red'
      })
    }
  }

  const handleToggleUserSelection = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleSelectAllUsers = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(filteredUsers.map(user => user.id))
    }
  }

  const handleSendMessage = async () => {
    const criteria = {
      userIds: selectedUsers.length > 0 ? selectedUsers : undefined,
      subscriptionStatus: messageRecipients.includes('expiring') ? ['expiring'] : undefined,
      onlineStatus: messageRecipients.includes('online') ? ['online'] : undefined
    }

    const message = {
      subject: messageSubject,
      body: messageBody
    }

    const result = await userManagementService.sendMassMessage(criteria, message)

    showNotification({
      title: 'Message Sent',
      message: `Message sent to ${result.deliveryStats.total} recipients`,
      color: 'green'
    })

    setMessageModalOpened(false)
    setMessageSubject('')
    setMessageBody('')
    setSelectedUsers([])
    setMessageRecipients([])
  }

  const getOnlineStatusBadge = (status) => {
    const configs = {
      online: { color: 'green', icon: <IconWifi size={12} />, label: 'Online' },
      away: { color: 'yellow', icon: <IconClock size={12} />, label: 'Away' },
      recently: { color: 'orange', icon: <IconClock size={12} />, label: 'Recently' },
      offline: { color: 'gray', icon: <IconWifiOff size={12} />, label: 'Offline' }
    }

    const config = configs[status] || configs.offline
    return (
      <Badge size="sm" color={config.color} leftIcon={config.icon}>
        {config.label}
      </Badge>
    )
  }

  const getSubscriptionBadge = (status) => {
    const configs = {
      active: { color: 'green', label: 'Active' },
      expiring: { color: 'orange', label: 'Expiring' },
      expired: { color: 'red', label: 'Expired' },
      free: { color: 'blue', label: 'Free' },
      trial: { color: 'purple', label: 'Trial' },
      cancelled: { color: 'gray', label: 'Cancelled' }
    }

    const config = configs[status] || { color: 'gray', label: 'None' }
    return (
      <Badge size="sm" color={config.color}>
        {config.label}
      </Badge>
    )
  }

  const getRoleBadge = (role) => {
    const configs = {
      admin: { color: 'red', icon: <IconCrown size={12} /> },
      jmod: { color: 'orange', icon: <IconShield size={12} /> },
      mod: { color: 'blue', icon: <IconShield size={12} /> },
      user: { color: 'gray', icon: <IconUsers size={12} /> }
    }

    const config = configs[role] || configs.user
    return (
      <Badge size="sm" color={config.color} leftIcon={config.icon}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </Badge>
    )
  }

  // Enhanced suspicious activity detection
  const openSecurityInvestigation = async (user) => {
    try {
      // Simulate comprehensive user investigation
      const investigation = {
        selectedUser: user,
        investigationOpen: true,
        ipHistory: [
          { ip: '192.168.1.100', country: 'US', city: 'New York', firstSeen: new Date(Date.now() - 86400000), lastSeen: new Date(), requestCount: 1200 },
          { ip: '10.0.0.50', country: 'CA', city: 'Toronto', firstSeen: new Date(Date.now() - 172800000), lastSeen: new Date(Date.now() - 86400000), requestCount: 800 },
          { ip: '203.0.113.10', country: 'GB', city: 'London', firstSeen: new Date(Date.now() - 259200000), lastSeen: new Date(Date.now() - 172800000), requestCount: 450 }
        ],
        deviceHistory: [
          {
            fingerprint: 'fp_chrome_windows_001',
            device: 'Windows 10 - Chrome 91',
            firstSeen: new Date(Date.now() - 86400000),
            lastSeen: new Date(),
            riskScore: 25
          },
          {
            fingerprint: 'fp_automated_tool_001',
            device: 'Automated Tool - Python',
            firstSeen: new Date(Date.now() - 172800000),
            lastSeen: new Date(Date.now() - 86400000),
            riskScore: 95
          }
        ],
        behaviorAnalysis: {
          humanScore: 0.65,
          botScore: 0.35,
          riskLevel: 'medium',
          patterns: [
            'Consistent request timing',
            'Limited UI interaction',
            'API-focused usage',
            'Off-hours activity'
          ],
          recommendations: [
            'Monitor API usage closely',
            'Implement additional verification',
            'Review account activity manually'
          ]
        },
        threatLevel: user.id === 1 ? 'critical' : user.id === 5 ? 'high' : 'medium',
        securityTimeline: [
          {
            timestamp: new Date(),
            event: 'Investigation opened',
            severity: 'info',
            details: 'Security team initiated investigation'
          },
          {
            timestamp: new Date(Date.now() - 3600000),
            event: 'Suspicious API usage detected',
            severity: 'warning',
            details: 'Rate limit exceeded by 1540%'
          },
          {
            timestamp: new Date(Date.now() - 7200000),
            event: 'Multiple IP addresses',
            severity: 'warning',
            details: 'User accessed from 3 different countries in 24h'
          },
          {
            timestamp: new Date(Date.now() - 86400000),
            event: 'Account created',
            severity: 'info',
            details: 'New user registration'
          }
        ],
        networkConnections: [
          {
            type: 'Related Account',
            target: 'user_789',
            relationship: 'Same IP',
            strength: 0.8,
            riskLevel: 'high'
          },
          {
            type: 'Suspicious IP',
            target: '192.168.1.100',
            relationship: 'VPN/Proxy',
            strength: 0.6,
            riskLevel: 'medium'
          }
        ]
      }

      setSecurityInvestigation(investigation)
    } catch (error) {
      console.error('Failed to load investigation data:', error)
    }
  }

  const closeSecurityInvestigation = () => {
    setSecurityInvestigation({
      selectedUser: null,
      investigationOpen: false,
      ipHistory: [],
      deviceHistory: [],
      behaviorAnalysis: {},
      threatLevel: 'low',
      securityTimeline: [],
      networkConnections: []
    })
  }

  // Enhanced threat level badge
  const getThreatLevelBadge = (level) => {
    const colors = {
      critical: 'red',
      high: 'orange',
      medium: 'yellow',
      low: 'green'
    }
    return (
      <Badge color={colors[level]} variant="filled" size="sm">
        {level.toUpperCase()}
      </Badge>
    )
  }

  // Enhanced suspicious activity severity badge
  const getSeverityBadge = (severity) => {
    const colors = {
      critical: 'red',
      high: 'orange',
      medium: 'yellow',
      low: 'blue'
    }
    return (
      <Badge color={colors[severity]} variant="light" size="xs">
        {severity.toUpperCase()}
      </Badge>
    )
  }

  return (
    <Container size="xl" py="md">
      <LoadingOverlay visible={loading} />

      {/* Modals */}
      <Modal
        opened={modalOpen}
        onClose={closeModal}
        title={
          modalType === 'view'
            ? 'User Details'
            : modalType === 'edit'
              ? 'Edit User'
              : modalType === 'create'
                ? 'Create User'
                : modalType === 'role'
                  ? 'Change User Role'
                  : modalType === 'trial'
                    ? 'Grant Free Trial'
                    : modalType === 'block'
                      ? 'Block User'
                      : modalType === 'sessions' ? 'User Sessions' : 'User Management'
        }
        size={modalType === 'view' ? 'xl' : 'lg'}
      >
        {modalType === 'view' && selectedUser && (
          <Stack spacing="md">
            <Group justify="space-between" align="flex-start">
              <div>
                <Group spacing="sm" mb="xs">
                  <Avatar size="lg" color={getRoleBadgeColor(selectedUser.role)}>
                    {selectedUser.name.charAt(0).toUpperCase()}
                  </Avatar>
                  <div>
                    <Text size="xl" weight={600}>{selectedUser.name}</Text>
                    <Text size="sm" color="dimmed">{selectedUser.email}</Text>
                    <Group spacing="xs" mt="xs">
                      <Badge color={getRoleBadgeColor(selectedUser.role)} size="sm">
                        {selectedUser.role.toUpperCase()}
                      </Badge>
                      <Badge color={getSubscriptionBadgeColor(selectedUser.subscription_status)} size="sm">
                        {selectedUser.subscription_status.toUpperCase()}
                      </Badge>
                      {selectedUser.is_blocked && (
                        <Badge color="red" size="sm">BLOCKED</Badge>
                      )}
                    </Group>
                  </div>
                </Group>
              </div>
              <Group spacing="xs">
                <ActionIcon color="blue" onClick={() => openModal('edit', selectedUser)}>
                  <IconEdit size={16} />
                </ActionIcon>
                <Menu>
                  <Menu.Target>
                    <ActionIcon>
                      <IconDots size={16} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item icon={<IconCrown size={14} />} onClick={() => openModal('role', selectedUser)}>
                      Change Role
                    </Menu.Item>
                    <Menu.Item icon={<IconGift size={14} />} onClick={() => openModal('trial', selectedUser)}>
                      Grant Trial
                    </Menu.Item>
                    <Menu.Item icon={<IconKey size={14} />} onClick={() => handleSendPasswordReset(selectedUser.id)}>
                      Send Password Reset
                    </Menu.Item>
                    <Menu.Item icon={<IconMail size={14} />} onClick={() => handleSendUsernameReminder(selectedUser.id)}>
                      Send Username Reminder
                    </Menu.Item>
                    <Menu.Item icon={<IconDevices size={14} />} onClick={() => handleDestroySession(selectedUser.id)}>
                      Destroy Sessions
                    </Menu.Item>
                    <Menu.Divider />
                    {selectedUser.is_blocked
                      ? (
                      <Menu.Item icon={<IconLockOpen size={14} />} color="green" onClick={() => handleUnblockUser(selectedUser.id)}>
                        Unblock User
                      </Menu.Item>
                        )
                      : (
                      <Menu.Item icon={<IconBan size={14} />} color="red" onClick={() => openModal('block', selectedUser)}>
                        Block User
                      </Menu.Item>
                        )}
                  </Menu.Dropdown>
                </Menu>
              </Group>
            </Group>

            <Divider />

            <Grid>
              <Grid.Col span={6}>
                <Card withBorder>
                  <Stack spacing="xs">
                    <Text weight={500} size="sm">Account Information</Text>
                    <Group justify="space-between">
                      <Text size="xs" color="dimmed">RuneScape Name:</Text>
                      <Text size="xs">{selectedUser.runescape_name || 'Not set'}</Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="xs" color="dimmed">Member Since:</Text>
                      <Text size="xs">{formatDate(selectedUser.created_at)}</Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="xs" color="dimmed">Last Login:</Text>
                      <Text size="xs">{formatRelativeTime(selectedUser.last_login)}</Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="xs" color="dimmed">Login Count:</Text>
                      <Text size="xs">{selectedUser.login_count || 0}</Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="xs" color="dimmed">Currently Online:</Text>
                      <Badge size="xs" color={selectedUser.session_id ? 'green' : 'gray'}>
                        {selectedUser.session_id ? 'Online' : 'Offline'}
                      </Badge>
                    </Group>
                  </Stack>
                </Card>
              </Grid.Col>

              <Grid.Col span={6}>
                <Card withBorder>
                  <Stack spacing="xs">
                    <Text weight={500} size="sm">Subscription Details</Text>
                    <Group justify="space-between">
                      <Text size="xs" color="dimmed">Plan:</Text>
                      <Text size="xs">{selectedUser.membership}</Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="xs" color="dimmed">Status:</Text>
                      <Badge size="xs" color={getSubscriptionBadgeColor(selectedUser.subscription_status)}>
                        {selectedUser.subscription_status}
                      </Badge>
                    </Group>
                    <Group justify="space-between">
                      <Text size="xs" color="dimmed">Expires:</Text>
                      <Text size="xs">{selectedUser.subscription_end ? formatDate(selectedUser.subscription_end) : 'N/A'}</Text>
                    </Group>
                    {selectedUser.trial_granted_by && (
                      <>
                        <Group justify="space-between">
                          <Text size="xs" color="dimmed">Trial Granted:</Text>
                          <Text size="xs">{formatDate(selectedUser.trial_granted_at)}</Text>
                        </Group>
                        <Group justify="space-between">
                          <Text size="xs" color="dimmed">Admin Note:</Text>
                          <Text size="xs">{selectedUser.trial_admin_note || 'None'}</Text>
                        </Group>
                      </>
                    )}
                  </Stack>
                </Card>
              </Grid.Col>

              <Grid.Col span={6}>
                <Card withBorder>
                  <Stack spacing="xs">
                    <Text weight={500} size="sm">Security Settings</Text>
                    <Group justify="space-between">
                      <Text size="xs" color="dimmed">2FA Enabled:</Text>
                      <Badge size="xs" color={selectedUser.otp_enabled ? 'green' : 'gray'}>
                        {selectedUser.otp_enabled ? 'Yes' : 'No'}
                      </Badge>
                    </Group>
                    <Group justify="space-between">
                      <Text size="xs" color="dimmed">Mailchimp API:</Text>
                      <Badge size="xs" color={selectedUser.mailchimp_api_key ? 'green' : 'gray'}>
                        {selectedUser.mailchimp_api_key ? 'Configured' : 'Not Set'}
                      </Badge>
                    </Group>
                    {selectedUser.is_blocked && (
                      <>
                        <Group justify="space-between">
                          <Text size="xs" color="dimmed">Blocked:</Text>
                          <Text size="xs">{formatDate(selectedUser.blocked_at)}</Text>
                        </Group>
                        <Group justify="space-between">
                          <Text size="xs" color="dimmed">Reason:</Text>
                          <Text size="xs">{selectedUser.block_reason}</Text>
                        </Group>
                      </>
                    )}
                  </Stack>
                </Card>
              </Grid.Col>

              <Grid.Col span={6}>
                <Card withBorder>
                  <Stack spacing="xs">
                    <Text weight={500} size="sm">Role & Permissions</Text>
                    <Group justify="space-between">
                      <Text size="xs" color="dimmed">Current Role:</Text>
                      <Badge size="xs" color={getRoleBadgeColor(selectedUser.role)}>
                        {selectedUser.role.toUpperCase()}
                      </Badge>
                    </Group>
                    <Text size="xs" color="dimmed">Permissions:</Text>
                    <ScrollArea style={{ height: 100 }}>
                      <Stack spacing={2}>
                        {userManagementService.getUserRole(selectedUser.id)?.permissions.map(permission => (
                          <Code key={permission} size="xs">{permission}</Code>
                        )) || <Text size="xs" color="dimmed">No special permissions</Text>}
                      </Stack>
                    </ScrollArea>
                  </Stack>
                </Card>
              </Grid.Col>
            </Grid>
          </Stack>
        )}

        {modalType === 'create' && (
          <form onSubmit={form.onSubmit(handleCreateUser)}>
            <Stack spacing="md">
              <TextInput
                label="Full Name"
                placeholder="Enter full name"
                required
                {...form.getInputProps('name')}
              />
              <TextInput
                label="Email"
                placeholder="Enter email"
                type="email"
                required
                {...form.getInputProps('email')}
              />
              <TextInput
                label="RuneScape Username"
                placeholder="Enter RuneScape username"
                {...form.getInputProps('runescape_name')}
              />
              <Select
                label="Role"
                data={[
                  { value: 'user', label: 'User' },
                  { value: 'mod', label: 'Moderator' },
                  { value: 'jmod', label: 'J-Moderator' },
                  { value: 'admin', label: 'Administrator' }
                ]}
                {...form.getInputProps('role')}
              />
              <Select
                label="Membership"
                data={[
                  { value: 'free', label: 'Free' },
                  { value: 'premium', label: 'Premium' }
                ]}
                {...form.getInputProps('membership')}
              />
              <Group justify="flex-end">
                <Button variant="outline" onClick={closeModal}>Cancel</Button>
                <Button type="submit">Create User</Button>
              </Group>
            </Stack>
          </form>
        )}

        {modalType === 'edit' && (
          <form onSubmit={form.onSubmit(handleSaveUser)}>
            <Stack spacing="md">
              <TextInput
                label="Full Name"
                placeholder="Enter full name"
                required
                {...form.getInputProps('name')}
              />
              <TextInput
                label="Email"
                placeholder="Enter email"
                type="email"
                required
                {...form.getInputProps('email')}
              />
              <TextInput
                label="RuneScape Username"
                placeholder="Enter RuneScape username"
                {...form.getInputProps('runescape_name')}
              />
              <Select
                label="Membership"
                data={[
                  { value: 'free', label: 'Free' },
                  { value: 'premium', label: 'Premium' }
                ]}
                {...form.getInputProps('membership')}
              />
              <Group justify="flex-end">
                <Button variant="outline" onClick={closeModal}>Cancel</Button>
                <Button type="submit">Update User</Button>
              </Group>
            </Stack>
          </form>
        )}

        {modalType === 'role' && selectedUser && (
          <Stack spacing="md">
            <Text size="sm">
              Change role for <strong>{selectedUser.name}</strong>
            </Text>
            <Select
              label="New Role"
              value={selectedUser.role}
              onChange={(value) => handleUpdateRole(selectedUser.id, value)}
              data={[
                { value: 'user', label: 'User - Basic access' },
                { value: 'mod', label: 'Moderator - Content moderation' },
                { value: 'jmod', label: 'J-Moderator - Extended permissions' },
                { value: 'admin', label: 'Administrator - Full access' }
              ]}
            />
            <Alert icon={<IconAlertCircle size={16} />} color="yellow">
              Changing user roles will affect their access permissions immediately.
            </Alert>
          </Stack>
        )}

        {modalType === 'trial' && selectedUser && (
          <form onSubmit={trialForm.onSubmit(handleGrantTrial)}>
            <Stack spacing="md">
              <Text size="sm">
                Grant free trial to <strong>{selectedUser.name}</strong>
              </Text>

              <Checkbox
                label="Set specific end date instead of duration"
                {...trialForm.getInputProps('useEndDate', { type: 'checkbox' })}
              />

              {!trialForm.values.useEndDate
                ? (
                <NumberInput
                  label="Trial Duration (Days)"
                  placeholder="Enter number of days (e.g., 7, 14, 30)"
                  min={1}
                  max={365}
                  required
                  {...trialForm.getInputProps('duration')}
                />
                  )
                : (
                <DatePicker
                  label="Trial End Date"
                  placeholder="Select when the trial should end"
                  required
                  minDate={new Date()}
                  maxDate={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)} // Max 1 year from now
                  {...trialForm.getInputProps('endDate')}
                />
                  )}

              <Textarea
                label="Admin Note"
                placeholder="Optional note about this trial grant"
                {...trialForm.getInputProps('note')}
              />

              <Alert icon={<IconInfoCircle size={16} />} color="blue">
                {!trialForm.values.useEndDate
                  ? `Trial will end on ${new Date(Date.now() + (trialForm.values.duration || 0) * 24 * 60 * 60 * 1000).toLocaleDateString()}`
                  : trialForm.values.endDate
                    ? `Trial will end on ${new Date(trialForm.values.endDate).toLocaleDateString()}`
                    : 'Please select an end date'
                }
              </Alert>

              <Group justify="flex-end">
                <Button variant="outline" onClick={closeModal}>Cancel</Button>
                <Button type="submit" color="green">Grant Trial</Button>
              </Group>
            </Stack>
          </form>
        )}

        {modalType === 'block' && selectedUser && (
          <form onSubmit={blockForm.onSubmit(handleBlockUser)}>
            <Stack spacing="md">
              <Text size="sm">
                Block user <strong>{selectedUser.name}</strong>
              </Text>
              <Textarea
                label="Reason for blocking"
                placeholder="Enter reason for blocking this user"
                required
                {...blockForm.getInputProps('reason')}
              />
              <Alert icon={<IconAlertCircle size={16} />} color="red">
                Blocking this user will immediately destroy all their active sessions and prevent login.
              </Alert>
              <Group justify="flex-end">
                <Button variant="outline" onClick={closeModal}>Cancel</Button>
                <Button type="submit" color="red">Block User</Button>
              </Group>
            </Stack>
          </form>
        )}
      </Modal>

      {/* Header */}
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={2} color="white">
            <IconUsers size={28} style={{ marginRight: 8 }} />
            User Management
          </Title>
          <Text size="sm" color="rgba(255, 255, 255, 0.7)">
            Manage users, roles, permissions, and subscriptions
          </Text>
        </div>
        <Group spacing="xs">
          <Menu>
            <Menu.Target>
              <Button leftIcon={<IconFileExport size={16} />} variant="outline">
                Export
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item onClick={() => exportData('json')}>Export as JSON</Menu.Item>
              <Menu.Item onClick={() => exportData('csv')}>Export as CSV</Menu.Item>
            </Menu.Dropdown>
          </Menu>
          <Button leftIcon={<IconRefresh size={16} />} variant="outline" onClick={loadUsers}>
            Refresh
          </Button>
          <Button leftIcon={<IconPlus size={16} />} onClick={() => openModal('create')}>
            Add User
          </Button>
        </Group>
      </Group>

      {/* Stats Cards */}
      <Grid mb="xl">
        <Grid.Col span={3}>
          <Card withBorder>
            <Text size="sm" color="dimmed">Total Users</Text>
            <Text size="xl" weight={700}>{stats.total || 0}</Text>
            <Text size="xs" color="green">
              {stats.active || 0} currently online
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={3}>
          <Card withBorder>
            <Text size="sm" color="dimmed">Active Subscriptions</Text>
            <Text size="xl" weight={700}>{stats.bySubscription?.active || 0}</Text>
            <Text size="xs" color="blue">
              {stats.bySubscription?.trial || 0} on trial
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={3}>
          <Card withBorder>
            <Text size="sm" color="dimmed">Staff Members</Text>
            <Text size="xl" weight={700}>
              {(stats.byRole?.admin || 0) + (stats.byRole?.jmod || 0) + (stats.byRole?.mod || 0)}
            </Text>
            <Text size="xs" color="orange">
              {stats.byRole?.admin || 0} admins, {stats.byRole?.jmod || 0} jmods, {stats.byRole?.mod || 0} mods
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={3}>
          <Card withBorder>
            <Text size="sm" color="dimmed">Security</Text>
            <Text size="xl" weight={700}>{stats.withOTP || 0}</Text>
            <Text size="xs" color="purple">
              users with 2FA enabled
            </Text>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Tabs */}
      <Tabs value={activeTab} onTabChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="users" leftIcon={<IconUsers size={16} />}>
            Users ({filteredUsers.length})
          </Tabs.Tab>
          <Tabs.Tab value="security" leftIcon={<IconShield size={16} />}>
            Security Monitoring
          </Tabs.Tab>
          <Tabs.Tab value="audit" leftIcon={<IconActivity size={16} />}>
            Audit Log
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="users" pt="md">
          {/* Filters */}
          <Card withBorder mb="md">
            <Grid>
              <Grid.Col span={4}>
                <TextInput
                  placeholder="Search users..."
                  leftIcon={<IconSearch size={16} />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </Grid.Col>
              <Grid.Col span={2}>
                <Select
                  placeholder="Filter by role"
                  value={roleFilter}
                  onChange={setRoleFilter}
                  data={[
                    { value: '', label: 'All Roles' },
                    { value: 'admin', label: 'Admin' },
                    { value: 'jmod', label: 'J-Mod' },
                    { value: 'mod', label: 'Mod' },
                    { value: 'user', label: 'User' }
                  ]}
                />
              </Grid.Col>
              <Grid.Col span={2}>
                <Select
                  placeholder="Filter by membership"
                  value={membershipFilter}
                  onChange={setMembershipFilter}
                  data={[
                    { value: '', label: 'All Plans' },
                    { value: 'premium', label: 'Premium' },
                    { value: 'free', label: 'Free' }
                  ]}
                />
              </Grid.Col>
              <Grid.Col span={2}>
                <Select
                  placeholder="Filter by status"
                  value={statusFilter}
                  onChange={setStatusFilter}
                  data={[
                    { value: '', label: 'All Status' },
                    { value: 'active', label: 'Online' },
                    { value: 'blocked', label: 'Blocked' },
                    { value: 'expired', label: 'Expired' }
                  ]}
                />
              </Grid.Col>
              <Grid.Col span={2}>
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => {
                    setSearchQuery('')
                    setRoleFilter('')
                    setMembershipFilter('')
                    setStatusFilter('')
                  }}
                >
                  Clear
                </Button>
              </Grid.Col>
            </Grid>
          </Card>

          {/* Users Table */}
          <Card withBorder>
            <Group justify="space-between" mb="md">
              <Group>
                <Checkbox
                  checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                  indeterminate={selectedUsers.length > 0 && selectedUsers.length < filteredUsers.length}
                  onChange={handleSelectAllUsers}
                />
                <Text size="sm" color="dimmed">
                  {selectedUsers.length > 0 ? `${selectedUsers.length} selected` : 'Select all'}
                </Text>
              </Group>
              <Group>
                <Button
                  size="xs"
                  variant="light"
                  leftIcon={<IconDownload size={14} />}
                >
                  Export
                </Button>
              </Group>
            </Group>

            <ScrollArea>
              <Table highlightOnHover>
                <thead>
                  <tr>
                    <th>Select</th>
                    <th>User</th>
                    <th>Role</th>
                    <th>Subscription</th>
                    <th>Status</th>
                    <th>Online Status</th>
                    <th>Last Seen</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentPageData.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <Checkbox
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => handleToggleUserSelection(user.id)}
                        />
                      </td>
                      <td>
                        <Group spacing="sm">
                          <Indicator
                            inline
                            size={8}
                            offset={7}
                            position="bottom-end"
                            color={user.isOnline ? 'green' : 'gray'}
                            withBorder
                          >
                            <Avatar size="sm" radius="xl">
                              {user.name.charAt(0).toUpperCase()}
                            </Avatar>
                          </Indicator>
                          <div>
                            <Text size="sm" fw={500}>
                              {user.name}
                            </Text>
                            <Text size="xs" color="dimmed">
                              {user.email}
                            </Text>
                          </div>
                        </Group>
                      </td>
                      <td>{getRoleBadge(user.role)}</td>
                      <td>{getSubscriptionBadge(user.subscriptionStatus)}</td>
                      <td>
                        <Badge color={user.status === 'active' ? 'green' : 'red'}>
                          {user.status}
                        </Badge>
                      </td>
                      <td>{getOnlineStatusBadge(user.onlineStatus)}</td>
                      <td>
                        <Text size="xs" color="dimmed">
                          {user.lastSeen ? new Date(user.lastSeen).toLocaleString() : 'Never'}
                        </Text>
                      </td>
                      <td>
                        <Group spacing={4}>
                          <ActionIcon
                            size="sm"
                            variant="light"
                            onClick={() => handleEditUser(user)}
                          >
                            <IconEdit size={14} />
                          </ActionIcon>
                          <ActionIcon
                            size="sm"
                            variant="light"
                            color="blue"
                            onClick={() => {
                              setSelectedUsers([user.id])
                              setMessageModalOpened(true)
                            }}
                          >
                            <IconMail size={14} />
                          </ActionIcon>
                        </Group>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </ScrollArea>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="security" pt="md">
          <Grid mb="md">
            <Grid.Col span={3}>
              <Card withBorder>
                <Group justify="space-between">
                  <div>
                    <Text size="xs" color="dimmed" transform="uppercase" weight={700}>
                      API Abuse Alerts
                    </Text>
                    <Text size="xl" weight={700} color="red">
                      {suspiciousActivity.apiAbuse.length}
                    </Text>
                  </div>
                  <ThemeIcon color="red" variant="light" size="lg">
                    <IconAlertTriangle size={20} />
                  </ThemeIcon>
                </Group>
              </Card>
            </Grid.Col>
            <Grid.Col span={3}>
              <Card withBorder>
                <Group justify="space-between">
                  <div>
                    <Text size="xs" color="dimmed" transform="uppercase" weight={700}>
                      Suspicious IPs
                    </Text>
                    <Text size="xl" weight={700} color="orange">
                      {suspiciousActivity.suspiciousIPs.length}
                    </Text>
                  </div>
                  <ThemeIcon color="orange" variant="light" size="lg">
                    <IconNetwork size={20} />
                  </ThemeIcon>
                </Group>
              </Card>
            </Grid.Col>
            <Grid.Col span={3}>
              <Card withBorder>
                <Group justify="space-between">
                  <div>
                    <Text size="xs" color="dimmed" transform="uppercase" weight={700}>
                      Bot Behavior
                    </Text>
                    <Text size="xl" weight={700} color="purple">
                      {suspiciousActivity.botBehavior.length}
                    </Text>
                  </div>
                  <ThemeIcon color="purple" variant="light" size="lg">
                    <IconBug size={20} />
                  </ThemeIcon>
                </Group>
              </Card>
            </Grid.Col>
            <Grid.Col span={3}>
              <Card withBorder>
                <Group justify="space-between">
                  <div>
                    <Text size="xs" color="dimmed" transform="uppercase" weight={700}>
                      Data Scraping
                    </Text>
                    <Text size="xl" weight={700} color="red">
                      {suspiciousActivity.dataScrapingAttempts.length}
                    </Text>
                  </div>
                  <ThemeIcon color="red" variant="light" size="lg">
                    <IconDatabase size={20} />
                  </ThemeIcon>
                </Group>
              </Card>
            </Grid.Col>
          </Grid>

          <Tabs defaultValue="api-abuse">
            <Tabs.List>
              <Tabs.Tab value="api-abuse" leftIcon={<IconAlertTriangle size={14} />}>
                API Abuse ({suspiciousActivity.apiAbuse.length})
              </Tabs.Tab>
              <Tabs.Tab value="suspicious-ips" leftIcon={<IconNetwork size={14} />}>
                Suspicious IPs ({suspiciousActivity.suspiciousIPs.length})
              </Tabs.Tab>
              <Tabs.Tab value="bot-behavior" leftIcon={<IconBug size={14} />}>
                Bot Behavior ({suspiciousActivity.botBehavior.length})
              </Tabs.Tab>
              <Tabs.Tab value="data-scraping" leftIcon={<IconDatabase size={14} />}>
                Data Scraping ({suspiciousActivity.dataScrapingAttempts.length})
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="api-abuse" pt="md">
              <Card withBorder>
                <Title order={4} mb="md">API Abuse Detection</Title>
                <ScrollArea>
                  <Table striped highlightOnHover>
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Requests</th>
                        <th>Rate Limit</th>
                        <th>Severity</th>
                        <th>IP Address</th>
                        <th>Pattern</th>
                        <th>First Detected</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {suspiciousActivity.apiAbuse.map((abuse, index) => (
                        <tr key={index}>
                          <td>
                            <div>
                              <Text size="sm" weight={500}>{abuse.userName}</Text>
                              <Text size="xs" color="dimmed">{abuse.email}</Text>
                            </div>
                          </td>
                          <td>
                            <Text size="sm" color="red" weight={600}>
                              {abuse.requestCount.toLocaleString()}
                            </Text>
                            <Text size="xs" color="dimmed">in {abuse.timeWindow}</Text>
                          </td>
                          <td>
                            <Text size="sm">{abuse.rateLimit.toLocaleString()}</Text>
                            <Progress
                              value={(abuse.requestCount / abuse.rateLimit) * 100}
                              color="red"
                              size="xs"
                              mt={2}
                            />
                          </td>
                          <td>{getSeverityBadge(abuse.severity)}</td>
                          <td>
                            <Code size="xs">{abuse.ipAddress}</Code>
                          </td>
                          <td>
                            <Text size="xs">{abuse.pattern}</Text>
                          </td>
                          <td>
                            <Text size="xs" color="dimmed">
                              {formatRelativeTime(abuse.firstDetected)}
                            </Text>
                          </td>
                          <td>
                            <Group spacing="xs">
                              <ActionIcon
                                size="sm"
                                color="blue"
                                variant="light"
                                onClick={() => openSecurityInvestigation({ id: abuse.userId, name: abuse.userName, email: abuse.email })}
                              >
                                <IconEye size={14} />
                              </ActionIcon>
                              <ActionIcon size="sm" color="red" variant="light">
                                <IconBan size={14} />
                              </ActionIcon>
                            </Group>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </ScrollArea>
              </Card>
            </Tabs.Panel>

            <Tabs.Panel value="suspicious-ips" pt="md">
              <Card withBorder>
                <Title order={4} mb="md">Suspicious IP Addresses</Title>
                <ScrollArea>
                  <Table striped highlightOnHover>
                    <thead>
                      <tr>
                        <th>IP Address</th>
                        <th>Country</th>
                        <th>Provider</th>
                        <th>Users</th>
                        <th>Requests</th>
                        <th>Risk Score</th>
                        <th>Indicators</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {suspiciousActivity.suspiciousIPs.map((ip, index) => (
                        <tr key={index}>
                          <td>
                            <Code size="sm">{ip.ipAddress}</Code>
                          </td>
                          <td>
                            <Text size="sm">{ip.country}</Text>
                          </td>
                          <td>
                            <Text size="sm">{ip.provider}</Text>
                          </td>
                          <td>
                            <Badge color="blue" size="sm">{ip.userCount}</Badge>
                          </td>
                          <td>
                            <Text size="sm">{ip.requestCount.toLocaleString()}</Text>
                          </td>
                          <td>
                            <Group spacing="xs">
                              <RingProgress
                                size={30}
                                thickness={4}
                                sections={[{ value: ip.riskScore, color: ip.riskScore > 80 ? 'red' : ip.riskScore > 60 ? 'orange' : 'yellow' }]}
                                label={<Text size="xs" align="center">{ip.riskScore}</Text>}
                              />
                            </Group>
                          </td>
                          <td>
                            <Stack spacing={2}>
                              {ip.indicators.map((indicator, idx) => (
                                <Badge key={idx} size="xs" color="red" variant="outline">
                                  {indicator}
                                </Badge>
                              ))}
                            </Stack>
                          </td>
                          <td>
                            <Group spacing="xs">
                              <ActionIcon size="sm" color="red" variant="light">
                                <IconBan size={14} />
                              </ActionIcon>
                              <ActionIcon size="sm" color="blue" variant="light">
                                <IconTarget size={14} />
                              </ActionIcon>
                            </Group>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </ScrollArea>
              </Card>
            </Tabs.Panel>

            <Tabs.Panel value="bot-behavior" pt="md">
              <Card withBorder>
                <Title order={4} mb="md">Bot Behavior Detection</Title>
                <ScrollArea>
                  <Table striped highlightOnHover>
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Confidence</th>
                        <th>Human Score</th>
                        <th>Activity Pattern</th>
                        <th>Session Duration</th>
                        <th>Indicators</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {suspiciousActivity.botBehavior.map((bot, index) => (
                        <tr key={index}>
                          <td>
                            <Text size="sm" weight={500}>{bot.userName}</Text>
                          </td>
                          <td>
                            <Group spacing="xs">
                              <Progress value={bot.confidence * 100} color="red" size="sm" style={{ width: 60 }} />
                              <Text size="sm">{Math.round(bot.confidence * 100)}%</Text>
                            </Group>
                          </td>
                          <td>
                            <Group spacing="xs">
                              <Progress value={bot.humanScore * 100} color="green" size="sm" style={{ width: 60 }} />
                              <Text size="sm">{Math.round(bot.humanScore * 100)}%</Text>
                            </Group>
                          </td>
                          <td>
                            <Text size="xs">{bot.activityPattern}</Text>
                          </td>
                          <td>
                            <Text size="xs">{bot.sessionDuration}</Text>
                          </td>
                          <td>
                            <Stack spacing={2}>
                              {bot.indicators.slice(0, 2).map((indicator, idx) => (
                                <Badge key={idx} size="xs" color="orange" variant="outline">
                                  {indicator}
                                </Badge>
                              ))}
                              {bot.indicators.length > 2 && (
                                <Badge size="xs" color="gray" variant="outline">
                                  +{bot.indicators.length - 2} more
                                </Badge>
                              )}
                            </Stack>
                          </td>
                          <td>
                            <Group spacing="xs">
                              <ActionIcon
                                size="sm"
                                color="blue"
                                variant="light"
                                onClick={() => openSecurityInvestigation({ id: bot.userId, name: bot.userName, email: 'bot@example.com' })}
                              >
                                <IconEye size={14} />
                              </ActionIcon>
                              <ActionIcon size="sm" color="red" variant="light">
                                <IconBan size={14} />
                              </ActionIcon>
                            </Group>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </ScrollArea>
              </Card>
            </Tabs.Panel>

            <Tabs.Panel value="data-scraping" pt="md">
              <Card withBorder>
                <Title order={4} mb="md">Data Scraping Attempts</Title>
                <ScrollArea>
                  <Table striped highlightOnHover>
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Target Endpoints</th>
                        <th>Request Volume</th>
                        <th>Data Extracted</th>
                        <th>Timeframe</th>
                        <th>Severity</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {suspiciousActivity.dataScrapingAttempts.map((scraping, index) => (
                        <tr key={index}>
                          <td>
                            <Text size="sm" weight={500}>{scraping.userName}</Text>
                          </td>
                          <td>
                            <Stack spacing={2}>
                              {scraping.targetEndpoints.slice(0, 2).map((endpoint, idx) => (
                                <Code key={idx} size="xs">{endpoint}</Code>
                              ))}
                              {scraping.targetEndpoints.length > 2 && (
                                <Text size="xs" color="dimmed">+{scraping.targetEndpoints.length - 2} more</Text>
                              )}
                            </Stack>
                          </td>
                          <td>
                            <Text size="sm" color="red" weight={600}>
                              {scraping.requestVolume.toLocaleString()}
                            </Text>
                          </td>
                          <td>
                            <Text size="sm" color="orange" weight={600}>
                              {scraping.dataExtracted}
                            </Text>
                          </td>
                          <td>
                            <Text size="sm">{scraping.timeframe}</Text>
                          </td>
                          <td>{getSeverityBadge(scraping.severity)}</td>
                          <td>
                            <Badge color={scraping.blocked ? 'red' : 'green'} size="sm">
                              {scraping.blocked ? 'Blocked' : 'Active'}
                            </Badge>
                          </td>
                          <td>
                            <Group spacing="xs">
                              <ActionIcon
                                size="sm"
                                color="blue"
                                variant="light"
                                onClick={() => openSecurityInvestigation({ id: scraping.userId, name: scraping.userName, email: 'scraper@example.com' })}
                              >
                                <IconEye size={14} />
                              </ActionIcon>
                              <ActionIcon size="sm" color="red" variant="light">
                                <IconBan size={14} />
                              </ActionIcon>
                            </Group>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </ScrollArea>
              </Card>
            </Tabs.Panel>
          </Tabs>
        </Tabs.Panel>

        <Tabs.Panel value="audit" pt="md">
          <Card withBorder>
            <Group justify="space-between" mb="md">
              <Text weight={500}>Recent Activity</Text>
              <Button size="xs" variant="outline" onClick={loadAuditLog}>
                <IconRefresh size={14} />
              </Button>
            </Group>

            <Timeline>
              {auditLog.map((entry) => (
                <Timeline.Item
                  key={entry.id}
                  title={entry.action.replace('_', ' ').toUpperCase()}
                  color={
                    entry.action.includes('block')
                      ? 'red'
                      : entry.action.includes('create')
                        ? 'green'
                        : entry.action.includes('delete')
                          ? 'red'
                          : entry.action.includes('update') ? 'blue' : 'gray'
                  }
                >
                  <Text size="xs" color="dimmed">
                    {formatDate(entry.timestamp)}
                  </Text>
                  {entry.metadata && (
                    <Code size="xs" mt="xs">
                      {JSON.stringify(entry.metadata, null, 2)}
                    </Code>
                  )}
                </Timeline.Item>
              ))}
            </Timeline>

            {auditLog.length === 0 && (
              <Text align="center" color="dimmed" py="xl">
                No audit log entries
              </Text>
            )}
          </Card>
        </Tabs.Panel>
      </Tabs>

      {/* Security Investigation Modal */}
      <Modal
        opened={securityInvestigation.investigationOpen}
        onClose={closeSecurityInvestigation}
        title={`Security Investigation: ${securityInvestigation.selectedUser?.name || 'User'}`}
        size="xl"
      >
        {securityInvestigation.selectedUser && (
          <Stack spacing="md">
            <Group justify="space-between" align="flex-start">
              <div>
                <Group spacing="sm" mb="xs">
                  <Avatar size="lg" color="red">
                    {securityInvestigation.selectedUser.name.charAt(0).toUpperCase()}
                  </Avatar>
                  <div>
                    <Text size="xl" weight={600}>{securityInvestigation.selectedUser.name}</Text>
                    <Text size="sm" color="dimmed">{securityInvestigation.selectedUser.email}</Text>
                    <Group spacing="xs" mt="xs">
                      {getThreatLevelBadge(securityInvestigation.threatLevel)}
                      <Badge color="red" size="sm">UNDER INVESTIGATION</Badge>
                    </Group>
                  </div>
                </Group>
              </div>
              <Group spacing="xs">
                <ActionIcon color="red" size="lg">
                  <IconBan size={20} />
                </ActionIcon>
                <ActionIcon color="orange" size="lg">
                  <IconAlertTriangle size={20} />
                </ActionIcon>
              </Group>
            </Group>

            <Divider />

            <Tabs defaultValue="overview">
              <Tabs.List>
                <Tabs.Tab value="overview" leftIcon={<IconEye size={14} />}>
                  Overview
                </Tabs.Tab>
                <Tabs.Tab value="ip-history" leftIcon={<IconLocation size={14} />}>
                  IP History
                </Tabs.Tab>
                <Tabs.Tab value="devices" leftIcon={<IconDeviceDesktop size={14} />}>
                  Devices
                </Tabs.Tab>
                <Tabs.Tab value="behavior" leftIcon={<IconActivity size={14} />}>
                  Behavior Analysis
                </Tabs.Tab>
                <Tabs.Tab value="timeline" leftIcon={<IconClock size={14} />}>
                  Security Timeline
                </Tabs.Tab>
                <Tabs.Tab value="network" leftIcon={<IconNetwork size={14} />}>
                  Network Analysis
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="overview" pt="md">
                <Grid>
                  <Grid.Col span={6}>
                    <Card withBorder>
                      <Stack spacing="xs">
                        <Text weight={500} size="sm">Threat Assessment</Text>
                        <Group justify="space-between">
                          <Text size="xs" color="dimmed">Threat Level:</Text>
                          {getThreatLevelBadge(securityInvestigation.threatLevel)}
                        </Group>
                        <Group justify="space-between">
                          <Text size="xs" color="dimmed">Human Score:</Text>
                          <Group spacing="xs">
                            <Progress
                              value={securityInvestigation.behaviorAnalysis.humanScore * 100}
                              color="green"
                              size="sm"
                              style={{ width: 80 }}
                            />
                            <Text size="xs">{Math.round(securityInvestigation.behaviorAnalysis.humanScore * 100)}%</Text>
                          </Group>
                        </Group>
                        <Group justify="space-between">
                          <Text size="xs" color="dimmed">Bot Score:</Text>
                          <Group spacing="xs">
                            <Progress
                              value={securityInvestigation.behaviorAnalysis.botScore * 100}
                              color="red"
                              size="sm"
                              style={{ width: 80 }}
                            />
                            <Text size="xs">{Math.round(securityInvestigation.behaviorAnalysis.botScore * 100)}%</Text>
                          </Group>
                        </Group>
                      </Stack>
                    </Card>
                  </Grid.Col>

                  <Grid.Col span={6}>
                    <Card withBorder>
                      <Stack spacing="xs">
                        <Text weight={500} size="sm">Quick Stats</Text>
                        <Group justify="space-between">
                          <Text size="xs" color="dimmed">IP Addresses Used:</Text>
                          <Text size="xs">{securityInvestigation.ipHistory.length}</Text>
                        </Group>
                        <Group justify="space-between">
                          <Text size="xs" color="dimmed">Devices:</Text>
                          <Text size="xs">{securityInvestigation.deviceHistory.length}</Text>
                        </Group>
                        <Group justify="space-between">
                          <Text size="xs" color="dimmed">Security Events:</Text>
                          <Text size="xs">{securityInvestigation.securityTimeline.length}</Text>
                        </Group>
                      </Stack>
                    </Card>
                  </Grid.Col>

                  <Grid.Col span={12}>
                    <Card withBorder>
                      <Stack spacing="xs">
                        <Text weight={500} size="sm">Behavior Patterns</Text>
                        <SimpleGrid cols={2} spacing="xs">
                          {securityInvestigation.behaviorAnalysis.patterns?.map((pattern, index) => (
                            <Badge key={index} size="sm" color="orange" variant="outline">
                              {pattern}
                            </Badge>
                          ))}
                        </SimpleGrid>
                      </Stack>
                    </Card>
                  </Grid.Col>

                  <Grid.Col span={12}>
                    <Card withBorder>
                      <Stack spacing="xs">
                        <Text weight={500} size="sm">Security Recommendations</Text>
                        <Stack spacing="xs">
                          {securityInvestigation.behaviorAnalysis.recommendations?.map((rec, index) => (
                            <Alert key={index} color="blue" size="sm">
                              {rec}
                            </Alert>
                          ))}
                        </Stack>
                      </Stack>
                    </Card>
                  </Grid.Col>
                </Grid>
              </Tabs.Panel>

              <Tabs.Panel value="ip-history" pt="md">
                <Card withBorder>
                  <Title order={5} mb="md">IP Address History</Title>
                  <Table striped>
                    <thead>
                      <tr>
                        <th>IP Address</th>
                        <th>Location</th>
                        <th>First Seen</th>
                        <th>Last Seen</th>
                        <th>Requests</th>
                      </tr>
                    </thead>
                    <tbody>
                      {securityInvestigation.ipHistory.map((ip, index) => (
                        <tr key={index}>
                          <td><Code size="xs">{ip.ip}</Code></td>
                          <td>{ip.city}, {ip.country}</td>
                          <td><Text size="xs">{formatRelativeTime(ip.firstSeen)}</Text></td>
                          <td><Text size="xs">{formatRelativeTime(ip.lastSeen)}</Text></td>
                          <td><Badge size="sm">{ip.requestCount}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card>
              </Tabs.Panel>

              <Tabs.Panel value="devices" pt="md">
                <Card withBorder>
                  <Title order={5} mb="md">Device History</Title>
                  <Table striped>
                    <thead>
                      <tr>
                        <th>Device</th>
                        <th>Fingerprint</th>
                        <th>Risk Score</th>
                        <th>First Seen</th>
                        <th>Last Seen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {securityInvestigation.deviceHistory.map((device, index) => (
                        <tr key={index}>
                          <td>{device.device}</td>
                          <td><Code size="xs">{device.fingerprint}</Code></td>
                          <td>
                            <Group spacing="xs">
                              <Progress
                                value={device.riskScore}
                                color={device.riskScore > 80 ? 'red' : device.riskScore > 50 ? 'orange' : 'green'}
                                size="sm"
                                style={{ width: 60 }}
                              />
                              <Text size="xs">{device.riskScore}%</Text>
                            </Group>
                          </td>
                          <td><Text size="xs">{formatRelativeTime(device.firstSeen)}</Text></td>
                          <td><Text size="xs">{formatRelativeTime(device.lastSeen)}</Text></td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card>
              </Tabs.Panel>

              <Tabs.Panel value="behavior" pt="md">
                <Card withBorder>
                  <Title order={5} mb="md">Behavior Analysis</Title>
                  <Grid>
                    <Grid.Col span={6}>
                      <Stack spacing="md">
                        <div>
                          <Text size="sm" weight={500} mb="xs">Human vs Bot Score</Text>
                          <Group spacing="md">
                            <div style={{ width: 120 }}>
                              <RingProgress
                                size={100}
                                thickness={8}
                                sections={[
                                  { value: securityInvestigation.behaviorAnalysis.humanScore * 100, color: 'green' },
                                  { value: securityInvestigation.behaviorAnalysis.botScore * 100, color: 'red' }
                                ]}
                                label={
                                  <Center>
                                    <Text size="xs" align="center">
                                      Human<br/>{Math.round(securityInvestigation.behaviorAnalysis.humanScore * 100)}%
                                    </Text>
                                  </Center>
                                }
                              />
                            </div>
                            <Stack spacing="xs">
                              <Group spacing="xs">
                                <div style={{ width: 12, height: 12, backgroundColor: 'var(--mantine-color-green-6)', borderRadius: '50%' }}></div>
                                <Text size="xs">Human Behavior</Text>
                              </Group>
                              <Group spacing="xs">
                                <div style={{ width: 12, height: 12, backgroundColor: 'var(--mantine-color-red-6)', borderRadius: '50%' }}></div>
                                <Text size="xs">Bot Behavior</Text>
                              </Group>
                            </Stack>
                          </Group>
                        </div>
                      </Stack>
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <Stack spacing="xs">
                        <Text size="sm" weight={500}>Risk Assessment</Text>
                        <Text size="lg" weight={700} color={securityInvestigation.behaviorAnalysis.riskLevel === 'high' ? 'red' : securityInvestigation.behaviorAnalysis.riskLevel === 'medium' ? 'orange' : 'green'}>
                          {securityInvestigation.behaviorAnalysis.riskLevel?.toUpperCase()}
                        </Text>
                      </Stack>
                    </Grid.Col>
                  </Grid>
                </Card>
              </Tabs.Panel>

              <Tabs.Panel value="timeline" pt="md">
                <Card withBorder>
                  <Title order={5} mb="md">Security Timeline</Title>
                  <Timeline>
                    {securityInvestigation.securityTimeline.map((event, index) => (
                      <Timeline.Item
                        key={index}
                        title={event.event}
                        color={event.severity === 'critical' ? 'red' : event.severity === 'warning' ? 'orange' : 'blue'}
                      >
                        <Text size="xs" color="dimmed">
                          {formatRelativeTime(event.timestamp)}
                        </Text>
                        <Text size="sm" mt="xs">
                          {event.details}
                        </Text>
                      </Timeline.Item>
                    ))}
                  </Timeline>
                </Card>
              </Tabs.Panel>

              <Tabs.Panel value="network" pt="md">
                <Card withBorder>
                  <Title order={5} mb="md">Network Connections</Title>
                  <Table striped>
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Target</th>
                        <th>Relationship</th>
                        <th>Strength</th>
                        <th>Risk Level</th>
                      </tr>
                    </thead>
                    <tbody>
                      {securityInvestigation.networkConnections.map((connection, index) => (
                        <tr key={index}>
                          <td><Badge size="sm">{connection.type}</Badge></td>
                          <td><Code size="xs">{connection.target}</Code></td>
                          <td>{connection.relationship}</td>
                          <td>
                            <Group spacing="xs">
                              <Progress
                                value={connection.strength * 100}
                                color="blue"
                                size="sm"
                                style={{ width: 60 }}
                              />
                              <Text size="xs">{Math.round(connection.strength * 100)}%</Text>
                            </Group>
                          </td>
                          <td>
                            <Badge color={connection.riskLevel === 'high' ? 'red' : connection.riskLevel === 'medium' ? 'orange' : 'green'} size="sm">
                              {connection.riskLevel.toUpperCase()}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card>
              </Tabs.Panel>
            </Tabs>
          </Stack>
        )}
      </Modal>

      {/* Mass Message Modal */}
      <Modal
        opened={messageModalOpened}
        onClose={() => setMessageModalOpened(false)}
        title="Send Mass Message"
        size="lg"
      >
        <Stack>
          <Alert color="blue" leftIcon={<IconMail size={16} />}>
            {selectedUsers.length > 0
              ? `Sending to ${selectedUsers.length} selected users`
              : messageRecipients.length > 0
                ? `Sending to ${messageRecipients.join(', ')} group(s)`
                : 'No recipients selected'
            }
          </Alert>

          <Select
            label="Use Template"
            placeholder="Select a template"
            data={Object.keys(messageTemplates).map(key => ({
              value: key,
              label: messageTemplates[key].subject
            }))}
            value={messageTemplate}
            onChange={(value) => {
              setMessageTemplate(value)
              if (value && messageTemplates[value]) {
                setMessageSubject(messageTemplates[value].subject)
                setMessageBody(messageTemplates[value].body)
              }
            }}
          />

          <TextInput
            label="Subject"
            placeholder="Enter message subject"
            value={messageSubject}
            onChange={(e) => setMessageSubject(e.target.value)}
            required
          />

          <Textarea
            label="Message Body"
            placeholder="Enter your message content"
            value={messageBody}
            onChange={(e) => setMessageBody(e.target.value)}
            minRows={4}
            required
          />

          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setMessageModalOpened(false)}>
              Cancel
            </Button>
            <Button
              leftIcon={<IconSend size={16} />}
              onClick={handleSendMessage}
              disabled={!messageSubject || !messageBody}
            >
              Send Message
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  )
}

export default UserManagement
