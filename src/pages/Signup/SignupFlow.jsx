import React, { useState, useEffect } from 'react'
import {
  Stepper,
  Button,
  Group,
  TextInput,
  PasswordInput,
  Paper,
  Text,
  Title,
  Container,
  Card,
  Badge,
  Stack,
  Divider,
  Alert,
  LoadingOverlay,
  Checkbox,
  Radio,
  List,
  ThemeIcon,
  Center,
  Progress
} from '@mantine/core'
import {
  IconCheck,
  IconCreditCard,
  IconUser,
  IconShield,
  IconTrendingUp,
  IconBell,
  IconDatabase,
  IconApi,
  IconStar,
  IconAlertCircle,
  IconCheckbox
} from '@tabler/icons-react'
import { useForm } from '@mantine/form'
import { useNavigate } from 'react-router-dom'
import { stripeService } from '../../services/stripeService'
import { securityService } from '../../services/securityService'
import bg from '../../assets/gehd.png'

const SignupFlow = () => {
  const navigate = useNavigate()
  const [active, setActive] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedPlan, setSelectedPlan] = useState('yearly')
  const [stripe, setStripe] = useState(null)
  const [elements, setElements] = useState(null)
  const [paymentProcessing, setPaymentProcessing] = useState(false)

  const form = useForm({
    initialValues: {
      email: '',
      password: '',
      confirmPassword: '',
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
        if (!value) return 'Password is required'
        if (value.length < 8) return 'Password must be at least 8 characters'
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
          return 'Password must contain uppercase, lowercase, and number'
        }
        return null
      },
      confirmPassword: (value, values) => {
        if (value !== values.password) return 'Passwords do not match'
        return null
      },
      name: (value) => {
        if (!value) return 'Name is required'
        if (value.length < 2) return 'Name must be at least 2 characters'
        return null
      },
      runescapeName: (value) => {
        if (!value) return 'RuneScape name is required'
        if (value.length < 1 || value.length > 12) return 'Invalid RuneScape name length'
        return null
      },
      acceptTerms: (value) => {
        if (!value) return 'You must accept the terms and conditions'
        return null
      }
    }
  })

  const plans = stripeService.getPricingPlans()

  useEffect(() => {
    const initializeStripe = async () => {
      try {
        const stripeInstance = await stripeService.initialize()
        setStripe(stripeInstance)
      } catch (error) {
        console.error('Failed to initialize Stripe:', error)
        setError('Payment system unavailable. Please try again later.')
      }
    }

    initializeStripe()
  }, [])

  const nextStep = () => setActive((current) => (current < 3 ? current + 1 : current))
  const prevStep = () => setActive((current) => (current > 0 ? current - 1 : current))

  const handleAccountCreation = async () => {
    const validation = form.validate()
    if (validation.hasErrors) return

    setLoading(true)
    setError(null)

    try {
      // Validate input with security service
      const emailValidation = securityService.validateInput(form.values.email, 'email')
      const passwordValidation = securityService.validateInput(form.values.password, 'password')
      const nameValidation = securityService.validateInput(form.values.name, 'text')

      if (!emailValidation.isValid) {
        throw new Error(emailValidation.error)
      }
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.error)
      }
      if (!nameValidation.isValid) {
        throw new Error(nameValidation.error)
      }

      // Create account (this would typically call your auth service)
      const accountData = {
        email: form.values.email,
        password: form.values.password,
        name: form.values.name,
        runescapeName: form.values.runescapeName,
        marketingEmails: form.values.marketingEmails
      }

      // Simulate account creation
      console.log('Creating account:', accountData)

      // Move to next step
      nextStep()
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePlanSelection = () => {
    if (!selectedPlan) {
      setError('Please select a plan')
      return
    }
    nextStep()
  }

  const handlePayment = async () => {
    if (!stripe) {
      setError('Payment system not ready. Please try again.')
      return
    }

    setPaymentProcessing(true)
    setError(null)

    try {
      const plan = plans[selectedPlan]

      // Create customer first
      const customer = await stripeService.createCustomer(
        form.values.email,
        form.values.name
      )

      // Create checkout session
      const session = await stripeService.createCheckoutSession(
        plan.id,
        customer.id,
        plans.trial.days
      )

      // Redirect to Stripe Checkout
      await stripeService.redirectToCheckout(session.id)
    } catch (error) {
      setError(stripeService.handleStripeError(error))
    } finally {
      setPaymentProcessing(false)
    }
  }

  const startFreeTrial = async () => {
    setLoading(true)
    setError(null)

    try {
      // Create customer for trial
      const customer = await stripeService.createCustomer(
        form.values.email,
        form.values.name
      )

      // Set up trial subscription (no payment required)
      console.log('Starting free trial for customer:', customer.id)

      // Redirect to success page
      navigate('/signup/success?trial=true')
    } catch (error) {
      setError('Failed to start trial. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const PlanCard = ({ plan, planKey, isPopular = false }) => (
    <Card
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      style={{
        cursor: 'pointer',
        border: selectedPlan === planKey ? '2px solid #339af0' : undefined,
        position: 'relative'
      }}
      onClick={() => setSelectedPlan(planKey)}
    >
      {isPopular && (
        <Badge
          color="blue"
          variant="filled"
          style={{
            position: 'absolute',
            top: -8,
            right: 16,
            zIndex: 1
          }}
        >
          Most Popular
        </Badge>
      )}

      <Group position="apart" align="center" mb="md">
        <div>
          <Text weight={500} size="lg">{plan.name}</Text>
          <Text size="sm" color="dimmed">
            {stripeService.formatPrice(plan.price)} / {plan.interval}
          </Text>
          {plan.monthlyPrice && (
            <Text size="xs" color="green">
              ${plan.monthlyPrice}/month • Save {plan.savings}%
            </Text>
          )}
        </div>
        <Radio
          checked={selectedPlan === planKey}
          onChange={() => setSelectedPlan(planKey)}
          size="md"
        />
      </Group>

      <List
        spacing="xs"
        size="sm"
        center
        icon={
          <ThemeIcon color="teal" size={20} radius="xl">
            <IconCheck size={12} />
          </ThemeIcon>
        }
      >
        {plan.features.map((feature, index) => (
          <List.Item key={index}>{feature}</List.Item>
        ))}
      </List>
    </Card>
  )

  return (
    <Container size="md" py="xl" style={{
      minHeight: '100vh',
      backgroundImage: `url(${bg})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center'
    }}>
      <Paper shadow="xl" p="xl" radius="md" style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)' }}>
        <LoadingOverlay visible={loading || paymentProcessing} />

        <Title order={2} align="center" mb="xl">
          Join GE Metrics Premium
        </Title>

        <Stepper active={active} onStepClick={setActive} breakpoint="sm">
          {/* Step 1: Account Creation */}
          <Stepper.Step label="Account" description="Create your account" icon={<IconUser size={18} />}>
            <Stack spacing="md">
              <TextInput
                label="Full Name"
                placeholder="Your full name"
                required
                {...form.getInputProps('name')}
              />

              <TextInput
                label="Email Address"
                placeholder="your@email.com"
                required
                {...form.getInputProps('email')}
              />

              <TextInput
                label="RuneScape Username"
                placeholder="Your RuneScape username"
                required
                {...form.getInputProps('runescapeName')}
              />

              <PasswordInput
                label="Password"
                placeholder="Create a strong password"
                required
                {...form.getInputProps('password')}
              />

              <PasswordInput
                label="Confirm Password"
                placeholder="Confirm your password"
                required
                {...form.getInputProps('confirmPassword')}
              />

              <Checkbox
                label="I accept the Terms of Service and Privacy Policy"
                required
                {...form.getInputProps('acceptTerms', { type: 'checkbox' })}
              />

              <Checkbox
                label="Send me marketing emails about new features and updates"
                {...form.getInputProps('marketingEmails', { type: 'checkbox' })}
              />

              {error && (
                <Alert icon={<IconAlertCircle size={16} />} color="red">
                  {error}
                </Alert>
              )}
            </Stack>
          </Stepper.Step>

          {/* Step 2: Plan Selection */}
          <Stepper.Step label="Plan" description="Choose your plan" icon={<IconCreditCard size={18} />}>
            <Stack spacing="md">
              <Text size="lg" weight={500} align="center" mb="md">
                Choose Your Plan
              </Text>

              <Group grow spacing="md">
                <PlanCard plan={plans.monthly} planKey="monthly" />
                <PlanCard plan={plans.yearly} planKey="yearly" isPopular />
              </Group>

              <Card withBorder p="md" style={{ backgroundColor: '#f8f9fa' }}>
                <Group position="apart" align="center">
                  <div>
                    <Text weight={500}>Start with Free Trial</Text>
                    <Text size="sm" color="dimmed">
                      {plans.trial.days} days free, then ${plans.yearly.monthlyPrice}/month
                    </Text>
                  </div>
                  <Button variant="outline" onClick={startFreeTrial} loading={loading}>
                    Start Free Trial
                  </Button>
                </Group>

                <List
                  spacing="xs"
                  size="sm"
                  mt="md"
                  icon={
                    <ThemeIcon color="blue" size={16} radius="xl">
                      <IconCheck size={10} />
                    </ThemeIcon>
                  }
                >
                  {plans.trial.features.map((feature, index) => (
                    <List.Item key={index}>{feature}</List.Item>
                  ))}
                </List>
              </Card>

              {error && (
                <Alert icon={<IconAlertCircle size={16} />} color="red">
                  {error}
                </Alert>
              )}
            </Stack>
          </Stepper.Step>

          {/* Step 3: Payment */}
          <Stepper.Step label="Payment" description="Complete payment" icon={<IconCreditCard size={18} />}>
            <Stack spacing="md">
              <Text size="lg" weight={500} align="center">
                Complete Your Purchase
              </Text>

              <Card withBorder p="md">
                <Group position="apart" align="center" mb="md">
                  <Text weight={500}>
                    {plans[selectedPlan]?.name}
                  </Text>
                  <Text weight={500} size="lg">
                    {stripeService.formatPrice(plans[selectedPlan]?.price)}
                  </Text>
                </Group>

                <Text size="sm" color="dimmed">
                  Includes {plans.trial.days}-day free trial
                </Text>

                {plans[selectedPlan]?.savings && (
                  <Badge color="green" variant="light" mt="xs">
                    Save {plans[selectedPlan].savings}%
                  </Badge>
                )}
              </Card>

              <Alert icon={<IconShield size={16} />} color="blue">
                <Text size="sm">
                  Your payment is secured by Stripe. We never store your card details.
                </Text>
              </Alert>

              <Button
                size="lg"
                fullWidth
                onClick={handlePayment}
                loading={paymentProcessing}
                leftIcon={<IconCreditCard size={20} />}
              >
                {paymentProcessing ? 'Processing...' : 'Complete Purchase'}
              </Button>

              <Text size="xs" color="dimmed" align="center">
                By completing this purchase, you agree to our Terms of Service.
                You can cancel anytime from your account settings.
              </Text>

              {error && (
                <Alert icon={<IconAlertCircle size={16} />} color="red">
                  {error}
                </Alert>
              )}
            </Stack>
          </Stepper.Step>

          {/* Step 4: Confirmation */}
          <Stepper.Completed>
            <Center>
              <Stack align="center" spacing="md">
                <ThemeIcon color="green" size={60} radius="xl">
                  <IconCheck size={30} />
                </ThemeIcon>

                <Title order={3}>Welcome to GE Metrics!</Title>

                <Text align="center" color="dimmed">
                  Your account has been created successfully. You can now access all premium features.
                </Text>

                <Button size="lg" onClick={() => navigate('/')}>
                  Start Using GE Metrics
                </Button>
              </Stack>
            </Center>
          </Stepper.Completed>
        </Stepper>

        {/* Navigation Buttons */}
        <Group position="center" mt="xl">
          {active > 0 && active < 3 && (
            <Button variant="default" onClick={prevStep}>
              Back
            </Button>
          )}

          {active === 0 && (
            <Button onClick={handleAccountCreation} loading={loading}>
              Create Account
            </Button>
          )}

          {active === 1 && (
            <Button onClick={handlePlanSelection}>
              Continue to Payment
            </Button>
          )}
        </Group>

        {/* Progress Indicator */}
        <Progress
          value={(active / 3) * 100}
          mt="xl"
          size="sm"
          radius="xl"
          color="blue"
        />
      </Paper>
    </Container>
  )
}

export default SignupFlow
