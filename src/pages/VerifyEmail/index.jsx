// src/pages/VerifyEmail/index.jsx
import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { trpc } from '../../utils/trpc'
import { Loader, Alert, Title, Text, Button, Center } from '@mantine/core'
import { IconCircleCheck, IconAlertCircle } from '@tabler/icons-react'

function VerifyEmailPage () {
  const location = useLocation()
  const navigate = useNavigate()
  const [error, setError] = useState(null)
  const [isRedirecting, setIsRedirecting] = useState(false)

  const token = new URLSearchParams(location.search).get('token')

  const { mutate, isLoading, isSuccess, data } = trpc.auth.verifyEmail.useMutation({
    onSuccess: (data) => {
      // Redirect to verified page (don't auto-login, let them log in manually)
      setIsRedirecting(true)
      setTimeout(() => {
        navigate('/email-verified')
      }, 500)
    },
    onError: (error) => {
      setError(error.message)
    }
  })

  useEffect(() => {
    if (token) {
      mutate({ token })
    } else {
      setError('No verification token found.')
    }
  }, [token, mutate])

  const handleLoginRedirect = () => {
    navigate('/login')
  }

  if (isLoading) {
    return (
      <Center style={{ height: '100vh' }}>
        <Loader size="xl" />
        <Title order={3} ml="md">Verifying your email...</Title>
      </Center>
    )
  }

  if (error) {
    return (
      <Center style={{ height: '100vh', flexDirection: 'column' }}>
        <Alert icon={<IconAlertCircle size="1rem" />} title="Verification Failed!" color="red" withCloseButton onClose={() => setError(null)}>
          {error}
        </Alert>
        <Button onClick={handleLoginRedirect} mt="md">
          Back to Login
        </Button>
      </Center>
    )
  }

  if (isSuccess) {
    return (
      <Center style={{ height: '100vh', flexDirection: 'column' }}>
        <Loader size="xl" />
        <Title order={3} mt="md">Email verified! Redirecting...</Title>
      </Center>
    )
  }

  return null
}

export default VerifyEmailPage
