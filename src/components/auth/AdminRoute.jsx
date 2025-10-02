import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Center, Loader } from '@mantine/core'

const AdminRoute = ({ children }) => {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <Center style={{ height: '100vh' }}>
        <Loader />
      </Center>
    )
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/access-denied" />
  }

  return children
}

export default AdminRoute
