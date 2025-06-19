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
import FutureItems from './pages/FutureItems'
import CommunityLeaderboard from './pages/CommunityLeaderboard'
import BillingDashboard from './pages/Admin/BillingDashboard'
import UserManagement from './pages/Admin/UserManagement'
import { AppShell, MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { getTheme } from './theme/index.js'
import { QueryCache, QueryClient, QueryClientProvider } from 'react-query'
import HeaderNav from './components/Header'
import NavMenu from './components/NavBar/nav-bar.jsx'

// Firebase removed - using new auth system
import ItemDetails from './pages/ItemDetails/index.jsx'
import SignupSuccess from './pages/Signup/SignupSuccess.jsx'

export default function App () {
  const queryClient = new QueryClient()
  const queryCache = new QueryCache()

  // const theme = useMantineTheme();
  const [opened, setOpened] = useState(false)
  //   const { loggedIn, user } = useContext(AuthContext)
  const loggedIn = true

  return (

        <QueryClientProvider client={queryClient} queryCache={queryCache}>
            <MantineProvider withGlobalStyles withNormalizeCSS theme={getTheme('dark')}>
                <Notifications />
                <Router>
                    <Routes>
                        <Route path="/signup" element={<Signup/>}/>
                        <Route path="/signup/success" element={<SignupSuccess/>}/>

                        {
                            loggedIn
                              ? (
                            <Route
                                element={
                                    <AppShell
                                        navbarOffsetBreakpoint="xs"
                                        asideOffsetBreakpoint="xs"
                                        navbar={<NavMenu opened={opened}/>}
                                        header={<HeaderNav setOpened={setOpened} opened={opened}/>}
                                        styles={(theme) => ({
                                          main: {
                                            backgroundColor:
                                                    theme.colorScheme === 'dark'
                                                      ? theme.colors.dark[8]
                                                      : theme.colors.gray[0]

                                          }
                                        })}
                                    >
                                        <Outlet/>
                                    </AppShell>
                                }
                            >
                                <Route path="/" element={<AllItems/>}/>
                                <Route path="/high-volumes" element={<HighVolumes/>}/>
                                <Route path="/watchlist" element={<Watchlist/>}/>
                                <Route path="/settings" element={<Settings/>}/>
                                <Route path="/admin" element={<AdminPanel/>}/>
                                <Route path="/admin/billing" element={<BillingDashboard/>}/>
                                <Route path="/admin/users" element={<UserManagement/>}/>
                                <Route path="/admin/settings" element={<div>System Settings - Coming Soon</div>}/>
                                <Route path="/admin/security" element={<div>Security Logs - Coming Soon</div>}/>
                                <Route path="/access-denied" element={<AccessDenied/>}/>
                                <Route path="/combination-items" element={<CombinationItems/>}/>
                                <Route path="/money-making" element={<MoneyMaking/>}/>
                                <Route path="/item/:id" element={<ItemDetails/>}/>
                                <Route path="/faq" element={<Faq/>}/>
                                <Route path="/status" element={<Status/>}/>
                                <Route path="/herbs" element={<Herbs/>}/>
                                <Route path="/deaths-coffer" element={<DeathsCoffer/>}/>
                                <Route path="/market-watch/food" element={<FoodIndex/>}/>
                                <Route path="/market-watch/logs" element={<LogsIndex/>}/>
                                <Route path="/market-watch/runes" element={<RunesIndex/>}/>
                                <Route path="/market-watch/metals" element={<MetalsIndex/>}/>
                                <Route path="/market-watch/bot-farm" element={<BotFarmIndex/>}/>
                                <Route path="/market-watch/potions" element={<PotionsIndex/>}/>
                                <Route path="/market-watch/raids" element={<RaidsIndex/>}/>
                                <Route path="/market-watch/herbs" element={<HerbsIndex/>}/>
                                <Route path="/nightmare-zone" element={<NightmareZone/>}/>
                                <Route path="/future-items" element={<FutureItems/>}/>
                                <Route path="/community" element={<CommunityLeaderboard/>}/>
                                <Route path="*" element={<ErrorPage/>}/>
                                <Route path="/profile/:id" element={<Profile/>}/>
                            </Route>
                                )
                              : (

                                <Route path="/" element={<Login/>}/>

                                )}

                    </Routes>
                </Router>

            </MantineProvider>
        </QueryClientProvider>

  )
}
