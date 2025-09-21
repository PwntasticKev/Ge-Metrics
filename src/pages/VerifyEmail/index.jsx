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

  const token = new URLSearchParams(location.search).get('token')

  const { mutate, isLoading, isSuccess, data } = trpc.auth.verifyEmail.useMutation({
    onSuccess: (data) => {
      // Handle successful verification, e.g., store tokens and redirect
      // For now, just show a success message
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
          Your email has been successfully verified. You can now log in to your account.
        </Alert>
        <Button onClick={handleLoginRedirect} mt="md">
          Proceed to Login
        </Button>
      </Center>
    )
  }

  return null
}

export default VerifyEmailPage
