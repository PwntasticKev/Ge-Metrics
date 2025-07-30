import React from 'react'
import './styles/App.scss'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { TRPCProvider } from './utils/trpc.jsx'

createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <TRPCProvider>
            <App/>
        </TRPCProvider>
    </React.StrictMode>
)
