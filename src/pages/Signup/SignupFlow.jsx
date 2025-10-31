import React, { useState, useContext } from 'react'
import {
  Paper,
  TextInput,
  PasswordInput,
  Button,
  Title,
  Text,
  Container,
  Group,
  Anchor,
  Checkbox,
  Box,
  Progress
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../../contexts/AuthContext'
import securityService from '../../services/securityService'
import { IconX, IconCheck } from '@tabler/icons-react'
import bg from '../../assets/gehd.png'

function PasswordRequirement ({ meets, label }) {
  return (
    <Text
      color={meets ? 'teal' : 'red'}
      sx={{ display: 'flex', alignItems: 'center' }}
      mt={7}
      size="sm"
    >
      {meets ? <IconCheck size={14} /> : <IconX size={14} />} <Box ml={10}>{label}</Box>
    </Text>
  )
}

const requirements = [
  { re: /[0-9]/, label: 'Includes number' },
  { re: /[a-z]/, label: 'Includes lowercase letter' },
  { re: /[A-Z]/, label: 'Includes uppercase letter' },
  { re: /[$&+,:;=?@#|'<>.^*()%!-]/, label: 'Includes special symbol' }
]

function getStrength (password) {
  let multiplier = password.length > 7 ? 0 : 1

  requirements.forEach(requirement => {
    if (!requirement.re.test(password)) {
      multiplier += 1
    }
  })

  return Math.max(100 - (100 / (requirements.length + 1)) * multiplier, 10)
}

const SignupFlow = () => {
  const navigate = useNavigate()
  const { register } = useContext(AuthContext)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const form = useForm({
    initialValues: {
      email: '',
      password: '',
      name: '',
      runescapeName: '',
      acceptTerms: false,
      marketingEmails: false
    },
    validate: {
      email: (value) => {
        if (!value) return 'Email is required'
        if (!/^\S+@\S+\.\S+$/.test(value)) return 'Invalid email format'
        return null
      },
      password: (value) => {
        if (getStrength(value) !== 100) return 'Password does not meet all requirements'
        return null
      },
      name: (value) => (value.length < 2 ? 'Name must be at least 2 characters long' : null),
      runescapeName: (value) => {
        if (!value) return 'RuneScape name is required'
        if (value.length < 1 || value.length > 12) return 'Invalid RuneScape name length'
        return null
      },
      acceptTerms: (value) => (value ? null : 'You must accept the terms and policy')
    }
  })

  const strength = getStrength(form.values.password)
  const checks = requirements.map((requirement, index) => (
    <PasswordRequirement key={index} label={requirement.label} meets={requirement.re.test(form.values.password)} />
  ))
  const bars = Array(4)
    .fill(0)
    .map((_, index) => (
      <Progress
        styles={{ bar: { transitionDuration: '0ms' } }}
        value={
          form.values.password.length > 0 && index === 0
            ? 100
            : strength >= ((index + 1) / 4) * 100 ? 100 : 0
        }
        color={strength > 80 ? 'teal' : strength > 50 ? 'yellow' : 'red'}
        key={index}
        size={4}
      />
    ))

  const handleSignup = async () => {
    const validation = form.validate()
    if (validation.hasErrors) return

    setLoading(true)
    setError(null)

    const { email, password, name, runescapeName, marketingEmails } = form.values

    register({
      email,
      password,
      name,
      username: runescapeName // Use 'username' to match the backend
    }, {
      onSuccess: (data) => {
        console.log(data.message) // "Registration successful..."
        setLoading(false)
        // Redirect to login page with email parameter to show verification notice
        navigate(`/login?email=${encodeURIComponent(email)}`)
      },
      onError: (err) => {
        setError(err.message || 'An unexpected error occurred. Please try again.')
        setLoading(false)
      }
    })
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundImage: `url(${bg})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <Container size={420} my={40}>
        <Title
          align="center"
          sx={(theme) => ({
            fontFamily: `Greycliff CF, ${theme.fontFamily}`,
            fontWeight: 900,
            color: 'white'
          })}
        >
          Create your account
        </Title>
        <Text color="dimmed" size="sm" align="center" mt={5}>
          Already have an account?{' '}
          <Anchor size="sm" component="button" onClick={() => navigate('/login')}>
            Log in
          </Anchor>
        </Text>

        <Paper withBorder shadow="md" p={30} mt={30} radius="md">
          <form onSubmit={(e) => { e.preventDefault(); handleSignup() }}>
            <TextInput
              label="Full Name"
              placeholder="Your full name"
              required
              autoComplete="name"
              {...form.getInputProps('name')}
            />
            <TextInput
              mt="md"
              label="Email"
              placeholder="your.email@example.com"
              required
              autoComplete="email"
              {...form.getInputProps('email')}
            />
            <TextInput
              mt="md"
              label="RuneScape Username"
              placeholder="Your RuneScape username"
              required
              autoComplete="off"
              {...form.getInputProps('runescapeName')}
            />
            <PasswordInput
              mt="md"
              label="Password"
              placeholder="Your password"
              required
              autoComplete="new-password"
              {...form.getInputProps('password')}
            />

            <Group spacing={5} grow mt="xs" mb="md">
              {bars}
            </Group>

            {checks}

            <Checkbox
              mt="md"
              label="I accept the terms of service and privacy policy"
              required
              {...form.getInputProps('acceptTerms', { type: 'checkbox' })}
            />
            <Checkbox
              mt="md"
              label="Send me marketing emails about new features and updates"
              {...form.getInputProps('marketingEmails', { type: 'checkbox' })}
            />

            {error && (
              <Text color="red" size="sm" mt="sm">
                {error}
              </Text>
            )}

            <Button fullWidth mt="xl" type="submit" loading={loading}>
              Create Account
            </Button>
          </form>
        </Paper>
      </Container>
    </div>
  )
}

export default SignupFlow
