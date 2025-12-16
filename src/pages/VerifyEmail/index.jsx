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
      // Store tokens and log user in automatically
      if (data.accessToken) {
        localStorage.setItem('accessToken', data.accessToken)
        // Redirect to home page after a brief delay
        setIsRedirecting(true)
        setTimeout(() => {
          window.location.href = '/' // Full reload to trigger auth check
        }, 1500)
      }
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
        <Alert icon={<IconCircleCheck size="1rem" />} title="Email Verified!" color="green">
          {isRedirecting 
            ? 'Your email has been verified! Redirecting you to your dashboard...'
            : 'Your email has been successfully verified! You are now logged in.'}
        </Alert>
        {!isRedirecting && (
          <Button onClick={() => window.location.href = '/'} mt="md">
            Go to Dashboard
          </Button>
        )}
        {isRedirecting && (
          <Loader mt="md" />
        )}
      </Center>
    )
  }

  return null
}

export default VerifyEmailPage
