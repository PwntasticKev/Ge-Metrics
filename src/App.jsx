import React, {useState} from 'react'
import {BrowserRouter as Router, Route, Routes} from "react-router-dom";
import ErrorPage from "./pages/error-page.jsx";
import AllItems from "./pages/AllItems.jsx";

import CombinationItems from "./pages/CombinationItems.jsx";
import MoneyMaking from "./pages/MoneyMaking.jsx";
import Login from "./pages/Login/Login.tsx";
import Faq from "./pages/Faq.jsx";
import {AppShell, MantineProvider, useMantineTheme} from '@mantine/core';
import {QueryClient, QueryClientProvider} from "react-query";
import NavHeader from './components/NavHeader.jsx'
import NavMenu from './components/NavBar/NavBar.jsx'


export default function App() {
    const queryClient = new QueryClient();
    const theme = useMantineTheme();
    const [opened, setOpened] = useState(false);
    const loggedIn = false

    return (
        <QueryClientProvider client={queryClient}>
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
                    {
                        loggedIn ?
                            <AppShell
                                navbarOffsetBreakpoint="sm"
                                asideOffsetBreakpoint="sm"
                                padding="md"
                                navbar={<NavMenu opened={opened}/>}
                                header={<NavHeader setOpened={setOpened} opened={opened}/>}
                                styles={(theme) => ({
                                    main: {backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.colors.gray[0]},
                                })}
                            >
                                <Routes>
                                    <Route path="/" element={<AllItems/>}/>
                                    <Route path="/combination-items" element={<CombinationItems/>}/>
                                    <Route path="/money-making" element={<MoneyMaking/>}/>
                                    <Route path="/faq" element={<Faq/>}/>
                                    <Route path="*" element={<ErrorPage/>}/>
                                </Routes>
                            </AppShell>
                            :
                            <Routes>
                                <Route path="/login" element={<Login/>}/>
                            </Routes>
                    }
                </Router>

            </MantineProvider>
        </QueryClientProvider>

    );
}
