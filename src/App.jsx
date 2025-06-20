import React, { useContext, useState } from 'react'
import { BrowserRouter as Router, Outlet, Route, Routes } from 'react-router-dom'
import ErrorPage from './pages/error-page.jsx'
import AllItems from './pages/AllItems'
import HighVolumes from './pages/HighVolumes'
import Watchlist from './pages/Watchlist'
import Settings from './pages/Settings'
import AdminPanel from './pages/Admin'
import AccessDenied from './pages/AccessDenied'
import CombinationItems from './pages/CombinationItems'
import MoneyMaking from './pages/MoneyMaking'
import Login from './pages/Login'
import Profile from './pages/Profile'
import Herbs from './pages/Herbs'
import DeathsCoffer from './pages/DeathsCoffer'
import Signup from './pages/Signup'
import Faq from './pages/Faq'
import Status from './pages/Status'
import FoodIndex from './pages/MarketWatch/FoodIndex.jsx'
import LogsIndex from './pages/MarketWatch/LogsIndex.jsx'
import RunesIndex from './pages/MarketWatch/RunesIndex.jsx'
import MetalsIndex from './pages/MarketWatch/MetalsIndex.jsx'
import BotFarmIndex from './pages/MarketWatch/BotFarmIndex.jsx'
import PotionsIndex from './pages/MarketWatch/PotionsIndex.jsx'
import RaidsIndex from './pages/MarketWatch/RaidsIndex.jsx'
import HerbsIndex from './pages/MarketWatch/HerbsIndex.jsx'
import NightmareZone from './pages/NightmareZone'
import CommunityLeaderboard from './pages/CommunityLeaderboard'
import BillingDashboard from './pages/Admin/BillingDashboard'
import UserManagement from './pages/Admin/UserManagement'
import SystemSettings from './pages/Admin/SystemSettings'
import SecurityLogs from './pages/Admin/SecurityLogs'
import FormulaDocumentation from './pages/Admin/FormulaDocumentation'
import AIPredictions from './pages/AIPredictions'
import FutureItems from './pages/FutureItems'
import Favorites from './pages/Favorites'
import { AppShell, MantineProvider, createStyles, Box } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { getTheme } from './theme/index.js'
import { QueryCache, QueryClient, QueryClientProvider } from 'react-query'
import HeaderNav from './components/Header'
import NavMenu from './components/NavBar/nav-bar.jsx'
import { useMediaQuery } from '@mantine/hooks'

// Import mobile styles
import './styles/mobile.css'

// Firebase removed - using new auth system
import ItemDetails from './pages/ItemDetails/index.jsx'
import SignupSuccess from './pages/Signup/SignupSuccess.jsx'

// Trial system imports
import { TrialProvider } from './contexts/TrialContext'
import TrialBanner from './components/Trial/TrialBanner'
import TrialExpiredModal from './components/Trial/TrialExpiredModal'
import { useTrialContext } from './contexts/TrialContext'

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
        {children}
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

export default function App () {
  const { classes } = useStyles()
  const queryClient = new QueryClient()
  const queryCache = new QueryCache()
  const [opened, setOpened] = useState(false)
  const isMobile = useMediaQuery('(max-width: 768px)')

  //   const { loggedIn, user } = useContext(AuthContext)
  const loggedIn = true

  return (
    <QueryClientProvider client={queryClient} queryCache={queryCache}>
      <MantineProvider withGlobalStyles withNormalizeCSS theme={getTheme('dark')}>
        <Notifications />
        <TrialProvider>
          <Router>
            <Routes>
              <Route path="/signup" element={<Signup/>}/>
              <Route path="/signup/success" element={<SignupSuccess/>}/>

              {loggedIn
                ? (
                <Route
                  element={
                    <div>
                      <HeaderNav setOpened={setOpened} opened={opened}/>
                      <NavMenu opened={opened} setOpened={setOpened}/>
                      <AppLayout>
                        <Outlet/>
                      </AppLayout>
                    </div>
                  }
                >
                  <Route path="/" element={<AllItems/>}/>
                  <Route path="/all-items" element={<AllItems/>}/>
                  <Route path="/high-volumes" element={<HighVolumes/>}/>
                  <Route path="/watchlist" element={<Watchlist/>}/>
                  <Route path="/favorites" element={<Favorites/>}/>
                  <Route path="/market-watch" element={<div style={{ padding: '20px', textAlign: 'center' }}>
                    <h2>Market Watch Overview</h2>
                    <p>Coming Soon - Comprehensive market analysis dashboard</p>
                  </div>}/>
                  <Route path="/future-items" element={<FutureItems/>}/>
                  <Route path="/ai-predictions" element={<AIPredictions/>}/>
                  <Route path="/money-making" element={<MoneyMaking/>}/>
                  <Route path="/combination-items" element={<CombinationItems/>}/>
                  <Route path="/herbs" element={<Herbs/>}/>
                  <Route path="/nightmare-zone" element={<NightmareZone/>}/>
                  <Route path="/deaths-coffer" element={<DeathsCoffer/>}/>
                  <Route path="/community" element={<CommunityLeaderboard/>}/>
                  <Route path="/settings" element={<Settings/>}/>
                  <Route path="/faq" element={<Faq/>}/>
                  <Route path="/status" element={<Status/>}/>
                  <Route path="/item/:id" element={<ItemDetails/>}/>
                  <Route path="/profile/:id" element={<Profile/>}/>

                  {/* Market Watch Submenu Routes */}
                  <Route path="/market-watch/food" element={<FoodIndex/>}/>
                  <Route path="/market-watch/logs" element={<LogsIndex/>}/>
                  <Route path="/market-watch/runes" element={<RunesIndex/>}/>
                  <Route path="/market-watch/metals" element={<MetalsIndex/>}/>
                  <Route path="/market-watch/bot-farm" element={<BotFarmIndex/>}/>
                  <Route path="/market-watch/potions" element={<PotionsIndex/>}/>
                  <Route path="/market-watch/raids" element={<RaidsIndex/>}/>
                  <Route path="/market-watch/herbs" element={<HerbsIndex/>}/>

                  {/* Admin routes */}
                  <Route path="/admin" element={<AdminPanel/>}/>
                  <Route path="/admin/billing" element={<BillingDashboard/>}/>
                  <Route path="/admin/users" element={<UserManagement/>}/>
                  <Route path="/admin/settings" element={<SystemSettings/>}/>
                  <Route path="/admin/security" element={<SecurityLogs/>}/>
                  <Route path="/admin/formulas" element={<FormulaDocumentation/>}/>

                  {/* Legacy routes for backwards compatibility */}
                  <Route path="/access-denied" element={<AccessDenied/>}/>

                  <Route path="*" element={<ErrorPage/>}/>
                </Route>
                  )
                : (
                  <Route path="/" element={<Login/>}/>
                  )}
            </Routes>
          </Router>
        </TrialProvider>
      </MantineProvider>
    </QueryClientProvider>
  )
}
