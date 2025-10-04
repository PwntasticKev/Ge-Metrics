import React, { useState, lazy, Suspense } from 'react'
import { BrowserRouter as Router, Outlet, Route, Routes, Navigate, useLocation } from 'react-router-dom'
import ErrorPage from './pages/error-page.jsx'
import Login from './pages/Login'
import Signup from './pages/Signup'
import SignupSuccess from './pages/Signup/SignupSuccess.jsx'
import { MantineProvider, createStyles, Box, LoadingOverlay, Drawer } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { getTheme } from './theme/index.js'
import HeaderNav from './components/Header'
import NavMenu from './components/NavBar/nav-bar.jsx'
import { useMediaQuery } from '@mantine/hooks'
import { useAuth } from './hooks/useAuth'
import { TRPCProvider } from './utils/trpc.jsx' // Import the central provider
import AuthProvider from './components/auth/AuthProvider'
import AdminRoute from './components/auth/AdminRoute'

// Trial system imports
import { TrialProvider, useTrialContext } from './contexts/TrialContext'
import TrialBanner from './components/Trial/TrialBanner'

// Favorites system import
import { FavoritesProvider } from './contexts/FavoritesContext'
import TrialExpiredModal from './components/Trial/TrialExpiredModal'
import HerbCleaning from './pages/HerbCleaning/index.jsx'

// Lazy load all protected routes to improve initial load performance
const HomePage = lazy(() => import('./pages/HomePage'))
const AllItems = lazy(() => import('./pages/AllItems'))
const HighVolumes = lazy(() => import('./pages/HighVolumes'))
const Watchlist = lazy(() => import('./pages/Watchlist'))
const Settings = lazy(() => import('./pages/Settings'))
const AdminPanel = lazy(() => import('./pages/Admin'))
const AdminDashboard = lazy(() => import('./pages/Admin/AdminDashboard'))
const AccessDenied = lazy(() => import('./pages/AccessDenied'))
const CombinationItems = lazy(() => import('./pages/CombinationItems'))
const MoneyMaking = lazy(() => import('./pages/MoneyMaking'))
const Profile = lazy(() => import('./pages/Profile'))
const Herbs = lazy(() => import('./pages/Herbs'))
const DeathsCoffer = lazy(() => import('./pages/DeathsCoffer'))
const Faq = lazy(() => import('./pages/Faq'))
const Status = lazy(() => import('./pages/Status'))
const FoodIndex = lazy(() => import('./pages/MarketWatch/FoodIndex.jsx'))
const LogsIndex = lazy(() => import('./pages/MarketWatch/LogsIndex.jsx'))
const RunesIndex = lazy(() => import('./pages/MarketWatch/RunesIndex.jsx'))
const MetalsIndex = lazy(() => import('./pages/MarketWatch/MetalsIndex.jsx'))
const BotFarmIndex = lazy(() => import('./pages/MarketWatch/BotFarmIndex.jsx'))
const PotionsIndex = lazy(() => import('./pages/MarketWatch/PotionsIndex.jsx'))
const RaidsIndex = lazy(() => import('./pages/MarketWatch/RaidsIndex.jsx'))
const HerbsIndex = lazy(() => import('./pages/MarketWatch/HerbsIndex.jsx'))
const NightmareZone = lazy(() => import('./pages/NightmareZone'))
const CommunityLeaderboard = lazy(() => import('./pages/CommunityLeaderboard'))
const BillingDashboard = lazy(() => import('./pages/Admin/BillingDashboard'))
const UserManagement = lazy(() => import('./pages/Admin/UserManagement'))
const SystemSettings = lazy(() => import('./pages/Admin/SystemSettings'))
const SecurityLogs = lazy(() => import('./pages/Admin/SecurityLogs'))
const FormulaDocumentation = lazy(() => import('./pages/Admin/FormulaDocumentation'))
const CronJobs = lazy(() => import('./pages/Admin/CronJobs'))
const AIPredictions = lazy(() => import('./pages/AIPredictions'))
const FutureItems = lazy(() => import('./pages/FutureItems'))
const Favorites = lazy(() => import('./pages/Favorites/index.jsx'))
const ProfitOpportunities = lazy(() => import('./pages/ProfitOpportunities'))
const ItemDetails = lazy(() => import('./pages/ItemDetails/index.jsx'))
const PotionCombinations = lazy(() => import('./pages/PotionCombinations'))
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmail'))
const Saplings = lazy(() => import('./pages/Saplings/index.jsx'))
const ComingSoon = lazy(() => import('./pages/ComingSoon/index.jsx'))
const BillingPage = lazy(() => import('./pages/Billing/index.jsx'))

const useStyles = createStyles((theme) => ({
  appShell: {
    [theme.fn.smallerThan('sm')]: {
      paddingLeft: 0
    }
  },

  main: {
    backgroundColor: theme.colorScheme === 'dark'
      ? theme.colors.dark[8]
      : theme.colors.gray[0],

    [theme.fn.smallerThan('sm')]: {
      padding: theme.spacing.xs,
      paddingTop: theme.spacing.md,
      marginLeft: 0
    },

    [theme.fn.largerThan('sm')]: {
      padding: theme.spacing.md,
      marginLeft: 80, // Default collapsed navbar width
      transition: 'margin-left 0.3s ease'
    }
  },

  mainExpanded: {
    [theme.fn.largerThan('sm')]: {
      marginLeft: 240 // Expanded navbar width
    }
  }
}))

// Custom layout component that handles navbar spacing and trial protection
function AppLayout ({ children }) {
  const { classes } = useStyles()
  const [expanded, setExpanded] = useState(() => {
    const saved = localStorage.getItem('navbarExpanded')
    return saved ? JSON.parse(saved) : false
  })
  const isMobile = useMediaQuery('(max-width: 768px)')

  // Listen for navbar state changes
  React.useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('navbarExpanded')
      if (saved !== null) {
        setExpanded(JSON.parse(saved))
      }
    }

    window.addEventListener('storage', handleStorageChange)
    // Also listen for direct localStorage changes in the same tab
    const interval = setInterval(() => {
      const saved = localStorage.getItem('navbarExpanded')
      if (saved !== null) {
        const newExpanded = JSON.parse(saved)
        if (newExpanded !== expanded) {
          setExpanded(newExpanded)
        }
      }
    }, 100)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [expanded])

  const mainClasses = `${classes.main} ${!isMobile && expanded ? classes.mainExpanded : ''}`

  return (
    <Box className={mainClasses}>
      <TrialProtectedContent>
        <Suspense fallback={
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '50vh',
            fontSize: '18px',
            color: 'var(--mantine-color-text)'
          }}>
            Loading...
          </div>
        }>
          {children}
        </Suspense>
      </TrialProtectedContent>
    </Box>
  )
}

// Component that protects content based on trial status
function TrialProtectedContent ({ children }) {
  const {
    trialStatus,
    isTrialExpired,
    showExpiredModal,
    setShowExpiredModal
  } = useTrialContext()

  return (
    <>
      {/* Show trial banner if user has active trial */}
      {trialStatus && trialStatus.isActive && <TrialBanner />}

      {/* Show expired modal if trial has expired */}
      <TrialExpiredModal
        opened={showExpiredModal}
        onClose={() => setShowExpiredModal(false)}
        trialData={trialStatus}
      />

      {/* Show content only if trial is active or user is premium */}
      {!isTrialExpired ? children : null}
    </>
  )
}

// RequireAuth component for route protection
function RequireAuth ({ children }) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <LoadingOverlay visible={true} />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}

function MobileNav ({ opened, setOpened, user }) {
  return (
    <Drawer
      opened={opened}
      onClose={() => setOpened(false)}
      title="Menu"
      padding="md"
      size="full"
    >
      <NavMenu opened={opened} setOpened={setOpened} user={user} isMobile={true} />
    </Drawer>
  )
}

function AppContent () {
  const [opened, setOpened] = useState(false)
  const { user, logout } = useAuth()
  const isMobile = useMediaQuery('(max-width: 768px)')
  const toggle = () => setOpened((o) => !o)

  // Theme mode state (global)
  const [colorScheme, setColorScheme] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved ? (JSON.parse(saved) ? 'dark' : 'light') : 'dark'
  })

  // Listen for changes to darkMode in localStorage
  React.useEffect(() => {
    const handleStorage = () => {
      const saved = localStorage.getItem('darkMode')
      const newColorScheme = saved ? (JSON.parse(saved) ? 'dark' : 'light') : 'dark'
      setColorScheme(newColorScheme)
    }

    // Listen for storage events (cross-tab)
    window.addEventListener('storage', handleStorage)

    // Also check periodically for changes in the same tab
    const interval = setInterval(() => {
      const saved = localStorage.getItem('darkMode')
      const newColorScheme = saved ? (JSON.parse(saved) ? 'dark' : 'light') : 'dark'
      if (newColorScheme !== colorScheme) {
        setColorScheme(newColorScheme)
      }
    }, 100)

    return () => {
      window.removeEventListener('storage', handleStorage)
      clearInterval(interval)
    }
  }, [colorScheme])

  return (
    <MantineProvider withGlobalStyles withNormalizeCSS theme={getTheme(colorScheme)}>
      <Notifications />
      <TrialProvider>
        <FavoritesProvider itemType="item">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/signup/success" element={<SignupSuccess />} />
            <Route path="/" element={<Navigate to="/all-items" />} />

            {/* Protected routes */}
            <Route
              element={
                <RequireAuth>
                  <div>
                    {user && (
                      <>
                        <HeaderNav setOpened={toggle} opened={opened} user={user} onLogout={logout} />
                        {isMobile
                          ? <MobileNav opened={opened} setOpened={setOpened} user={user} />
                          : <NavMenu user={user} />}
                      </>
                    )}
                    <AppLayout>
                      <Outlet />
                    </AppLayout>
                  </div>
                </RequireAuth>
              }
            >
              <Route path="/home" element={<Navigate to="/all-items" />} />
              <Route path="/all-items" element={<AllItems />} />
              <Route path="/high-volumes" element={<HighVolumes />} />
              <Route path="/watchlist" element={<Watchlist />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/market-watch" element={<div style={{ padding: '20px', textAlign: 'center' }}><h2>Market Watch Overview</h2><p>Coming Soon - Comprehensive market analysis dashboard</p></div>} />
              <Route path="/future-items" element={<FutureItems />} />
              <Route path="/ai-predictions" element={<AIPredictions />} />
              <Route path="/money-making" element={<MoneyMaking />} />
              <Route path="/combination-items" element={<CombinationItems />} />
              <Route path="/potion-combinations" element={<PotionCombinations />} />
              <Route path="/herbs" element={<Herbs />} />
              <Route path="/nightmare-zone" element={<NightmareZone />} />
              <Route path="/deaths-coffer" element={<DeathsCoffer />} />
              <Route path="/community" element={<CommunityLeaderboard />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/faq" element={<Faq />} />
              <Route path="/status" element={<Status />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/item/:id" element={<ItemDetails />} />
              <Route path="/profile/:id" element={<Profile />} />
              <Route path="/saplings" element={<Saplings />} />
              <Route path="/herb-cleaning" element={<HerbCleaning />} />
              <Route path="/transaction-history" element={<ComingSoon />} />
              <Route path="/billing" element={<BillingPage />} />
              {/* Market Watch Submenu Routes */}
              <Route path="/market-watch/food" element={<FoodIndex />} />
              <Route path="/market-watch/logs" element={<LogsIndex />} />
              <Route path="/market-watch/runes" element={<RunesIndex />} />
              <Route path="/market-watch/metals" element={<MetalsIndex />} />
              <Route path="/market-watch/bot-farm" element={<BotFarmIndex />} />
              <Route path="/market-watch/potions" element={<PotionsIndex />} />
              <Route path="/market-watch/raids" element={<RaidsIndex />} />
              <Route path="/market-watch/herbs" element={<HerbsIndex />} />
              {/* Admin routes */}
              <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
              <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
              <Route path="/admin/billing" element={<AdminRoute><BillingDashboard /></AdminRoute>} />
              <Route path="/admin/user-management" element={<AdminRoute><UserManagement /></AdminRoute>} />
              <Route path="/admin/settings" element={<AdminRoute><SystemSettings /></AdminRoute>} />
              <Route path="/admin/security" element={<AdminRoute><SecurityLogs /></AdminRoute>} />
              <Route path="/admin/formulas" element={<AdminRoute><FormulaDocumentation /></AdminRoute>} />
              <Route path="/admin/cron-jobs" element={<AdminRoute><CronJobs /></AdminRoute>} />
              {/* Legacy routes for backwards compatibility */}
              <Route path="/access-denied" element={<AccessDenied />} />
              <Route path="*" element={<ErrorPage />} />
            </Route>
          </Routes>
        </FavoritesProvider>
      </TrialProvider>
    </MantineProvider>
  )
}

export default function App () {
  return (
    <TRPCProvider>
      <Router>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </Router>
    </TRPCProvider>
  )
}
