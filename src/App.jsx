import React, {useContext, useState} from 'react'
import {BrowserRouter as Router, Outlet, Route, Routes} from "react-router-dom";
import ErrorPage from "./pages/error-page.jsx";
import AllItems from "./pages/AllItems";

import CombinationItems from "./pages/CombinationItems";
import MoneyMaking from "./pages/MoneyMaking";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Faq from "./pages/Faq";
import {AppShell, MantineProvider} from '@mantine/core';
import {QueryCache, QueryClient, QueryClientProvider} from "react-query";
import HeaderNav from './components/Header'
import NavMenu from './components/NavBar/nav-bar.jsx'

import {AuthContext} from './utils/firebase/auth-context.jsx'

export default function App() {
    const queryClient = new QueryClient();
    const queryCache = new QueryCache();

    // const theme = useMantineTheme();
    const [opened, setOpened] = useState(false);
    const {loggedIn} = useContext(AuthContext);

    return (

        <QueryClientProvider client={queryClient} queryCache={queryCache}>
            <MantineProvider withGlobalStyles withNormalizeCSS theme={{
                colorScheme: 'dark',
                colors: {
                    // override dark colors to change them for all components
                    dark: [
                        '#d5d7e0',
                        '#acaebf',
                        '#8c8fa3',
                        '#666980',
                        '#4d4f66',
                        '#34354a',
                        '#2b2c3d',
                        '#1d1e30',
                        '#0c0d21',
                        '#01010a',
                    ],
                },
            }}>

                <Router>
                    <Routes>
                        {/* Common routes accessible to all users */}
                        <Route path="/login" element={<Login/>}/>
                        <Route path="/signup" element={<Signup/>}/>

                        {/* Protected routes accessible only to logged-in users */}
                        {loggedIn ? (
                            <Route
                                element={
                                    <AppShell
                                        navbarOffsetBreakpoint="sm"
                                        asideOffsetBreakpoint="sm"
                                        padding="md"
                                        navbar={<NavMenu opened={opened}/>}
                                        header={<HeaderNav setOpened={setOpened} opened={opened}/>}
                                        styles={(theme) => ({
                                            main: {
                                                backgroundColor:
                                                    theme.colorScheme === 'dark'
                                                        ? theme.colors.dark[8]
                                                        : theme.colors.gray[0],
                                            },
                                        })}
                                    >
                                        <Outlet/>
                                    </AppShell>
                                }
                            >
                                <Route path="/" element={<AllItems/>}/>
                                <Route path="/combination-items" element={<CombinationItems/>}/>
                                <Route path="/money-making" element={<MoneyMaking/>}/>
                                <Route path="/faq" element={<Faq/>}/>
                                <Route path="*" element={<ErrorPage/>}/>
                            </Route>
                        ) : (
                            <Route path="*" element={<ErrorPage/>}/>
                        )}

                    </Routes>
                </Router>

            </MantineProvider>
        </QueryClientProvider>


    );
}
