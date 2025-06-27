import { useMediaQuery } from '@mantine/hooks'
import {
  createStyles,
  Modal,
  useMantineTheme,
  Card,
  Group,
  Stack,
  Badge,
  Button,
  Text,
  Title,
  Divider,
  Loader,
  Alert,
  Select,
  TextInput
} from '@mantine/core'
import { IconCrown, IconCreditCard, IconCheck, IconX, IconArrowUp, IconArrowDown, IconClock, IconInfoCircle } from '@tabler/icons-react'
import { useState } from 'react'

const useStyles = createStyles((theme) => ({
  editIcon: {
    marginLeft: '4px',
    position: 'absolute',
    right: '5px',
    top: '5px'
  }
}))

// Only allow monthly/yearly for users (no trial)
const USER_PLANS = [
  { value: 'monthly', label: 'Monthly (4.99 USD/mo)' },
  { value: 'yearly', label: 'Yearly (39.99 USD/yr, 33% off)' }
]

function isExpired (expiry) {
  if (!expiry) return true
  return new Date(expiry) < new Date()
}

export default function UserSubscription ({ open, handleChange, plan = 'yearly', status = 'active', expiry = '2025-01-15' }) {
  const theme = useMantineTheme()
  const isMobile = useMediaQuery('(max-width: 50em)')
  const { classes } = useStyles()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [selectedPlan, setSelectedPlan] = useState(plan)
  const [action, setAction] = useState('')
  const [info, setInfo] = useState('')
  // Payment method state
  const [editingPayment, setEditingPayment] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState('')
  const [paymentError, setPaymentError] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvc, setCardCvc] = useState('')

  const expired = isExpired(expiry)
  const planLabel = USER_PLANS.find(p => p.value === plan)?.label || 'Unknown Plan'
  const statusColor = status === 'active' ? 'green' : status === 'trial' ? 'blue' : 'red'

  const handleAction = (type) => {
    setLoading(true)
    setSuccess('')
    setError('')
    setInfo('')
    setAction(type)
    setTimeout(() => {
      setLoading(false)
      if (type === 'cancel') {
        setSuccess('Subscription cancelled. You will retain access until expiry.')
      } else if (type === 'upgrade') {
        if (plan === 'monthly' && !expired) {
          setInfo('You will not be charged until ' + expiry + '. Your subscription will remain active until then.')
        } else {
          setSuccess('Upgraded to yearly plan!')
        }
      } else if (type === 'downgrade') {
        if (plan === 'yearly' && !expired) {
          setInfo('You will not be charged until ' + expiry + '. Your subscription will remain active until then.')
        } else {
          setSuccess('Downgraded to monthly plan!')
        }
      }
    }, 1200)
  }

  const handleSavePayment = () => {
    setPaymentLoading(true)
    setPaymentSuccess('')
    setPaymentError('')
    setTimeout(() => {
      setPaymentLoading(false)
      setEditingPayment(false)
      setPaymentSuccess('Payment method updated!')
      setCardNumber('')
      setCardExpiry('')
      setCardCvc('')
    }, 1200)
  }

  // Downgrade button logic: only allow if expired or not yearly
  const canDowngrade = plan === 'yearly' ? expired : plan === 'monthly' && selectedPlan === 'monthly'

  return (
    <Modal
      opened={open}
      onClose={() => handleChange(null)}
      title="Manage Subscription"
      fullScreen={isMobile}
      transitionProps={{ transition: 'fade', duration: 200 }}
    >
      <Stack spacing="md">
        <Title order={4}>Your Subscription</Title>
        <Card withBorder>
          <Group position="apart" mb="xs">
            <Group>
              <Badge color={statusColor} leftIcon={<IconCrown size={14} />}>{status.toUpperCase()}</Badge>
              <Text weight={600}>{planLabel}</Text>
            </Group>
            <Badge color="gray" leftIcon={<IconClock size={12} />}>Expires: {expiry}</Badge>
          </Group>
          <Divider my="xs" />
          <Text size="sm" color="dimmed">Enjoy full access to all premium features. Manage your plan below.</Text>
        </Card>

        <Title order={5} mt="md">Change Plan</Title>
        <Select
          data={USER_PLANS}
          value={selectedPlan}
          onChange={setSelectedPlan}
          disabled={loading}
        />
        <Group spacing="xs">
          <Button
            leftIcon={<IconArrowUp size={16} />}
            onClick={() => handleAction('upgrade')}
            disabled={loading || selectedPlan === plan || selectedPlan === 'monthly'}
            variant="light"
          >
            Upgrade
          </Button>
          <Button
            leftIcon={<IconArrowDown size={16} />}
            onClick={() => handleAction('downgrade')}
            disabled={loading || selectedPlan === plan || selectedPlan === 'yearly' || (plan === 'yearly' && !expired)}
            variant="light"
          >
            Downgrade
          </Button>
          <Button
            leftIcon={<IconX size={16} />}
            color="red"
            onClick={() => handleAction('cancel')}
            disabled={loading || status === 'expired'}
            variant="light"
          >
            Cancel
          </Button>
        </Group>
        {info && <Alert color="blue" icon={<IconInfoCircle size={16} />}>{info}</Alert>}
        <Divider my="md" />
        <Title order={5}>Payment Method</Title>
        <Card withBorder>
          {!editingPayment
            ? (
            <Group position="apart">
              <Group>
                <IconCreditCard size={20} />
                <Text>Visa **** 4242</Text>
              </Group>
              <Button size="xs" variant="light" onClick={() => setEditingPayment(true)}>
                Change
              </Button>
            </Group>
              )
            : (
            <Stack spacing="xs">
              <TextInput
                label="Card Number"
                placeholder="1234 5678 9012 3456"
                value={cardNumber}
                onChange={e => setCardNumber(e.target.value.replace(/[^0-9 ]/g, ''))}
                maxLength={19}
                disabled={paymentLoading}
              />
              <Group grow>
                <TextInput
                  label="Expiry"
                  placeholder="MM/YY"
                  value={cardExpiry}
                  onChange={e => setCardExpiry(e.target.value.replace(/[^0-9/]/g, ''))}
                  maxLength={5}
                  disabled={paymentLoading}
                />
                <TextInput
                  label="CVC"
                  placeholder="123"
                  value={cardCvc}
                  onChange={e => setCardCvc(e.target.value.replace(/[^0-9]/g, ''))}
                  maxLength={4}
                  disabled={paymentLoading}
                />
              </Group>
              <Group spacing="xs" mt="xs">
                <Button size="xs" variant="light" onClick={() => setEditingPayment(false)} disabled={paymentLoading}>
                  Cancel
                </Button>
                <Button size="xs" variant="filled" onClick={handleSavePayment} loading={paymentLoading}>
                  Save Payment Method
                </Button>
              </Group>
            </Stack>
              )}
        </Card>
        {paymentSuccess && <Alert color="green" icon={<IconCheck size={16} />}>{paymentSuccess}</Alert>}
        {paymentError && <Alert color="red" icon={<IconX size={16} />}>{paymentError}</Alert>}
      </Stack>
    </Modal>
  )
}
