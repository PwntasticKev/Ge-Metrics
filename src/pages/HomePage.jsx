import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { LoadingOverlay } from '@mantine/core'

const HomePage = () => {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <LoadingOverlay visible={true} />
  }

  if (isAuthenticated) {
    return <Navigate to="/all-items" replace />
  }

  return <Navigate to="/login" replace />
}

export default HomePage
