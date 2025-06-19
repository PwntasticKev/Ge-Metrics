import { useState } from 'react'
import {
  Button,
  Card,
  Checkbox,
  createStyles,
  Group,
  NumberInput,
  rem,
  Text,
  useMantineTheme,
  Stack,
  Badge,
  ActionIcon,
  Tooltip,
  Divider
} from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { IconTrendingUp, IconTrendingDown, IconPlus, IconMinus, IconCalendar, IconCoins } from '@tabler/icons-react'

const useStyles = createStyles((theme) => ({
  card: {
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0],
    overflow: 'visible',
    border: `1px solid ${theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]}`,
    transition: 'all 0.2s ease',
    '&:hover': {
      borderColor: theme.colors.blue[4],
      boxShadow: theme.shadows.sm
    }
  },

  title: {
    fontFamily: `Greycliff CF, ${theme.fontFamily}`,
    fontWeight: 700,
    color: theme.colorScheme === 'dark' ? theme.colors.gray[1] : theme.colors.gray[8]
  },

  profitInput: {
    '& .mantine-NumberInput-input': {
      fontSize: rem(16),
      fontWeight: 600,
      textAlign: 'center',
      border: `2px solid ${theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]}`,
      '&:focus': {
        borderColor: theme.colors.green[5],
        boxShadow: `0 0 0 2px ${theme.colors.green[1]}`
      }
    }
  },

  lossInput: {
    '& .mantine-NumberInput-input': {
      fontSize: rem(16),
      fontWeight: 600,
      textAlign: 'center',
      border: `2px solid ${theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]}`,
      '&:focus': {
        borderColor: theme.colors.red[5],
        boxShadow: `0 0 0 2px ${theme.colors.red[1]}`
      }
    }
  },

  actionButton: {
    height: rem(42),
    fontWeight: 600,
    fontSize: rem(14),
    transition: 'all 0.2s ease',
    '&:hover': {
      transform: 'translateY(-1px)',
      boxShadow: theme.shadows.md
    }
  },

  profitButton: {
    background: `linear-gradient(45deg, ${theme.colors.green[6]}, ${theme.colors.green[5]})`,
    border: 'none',
    '&:hover': {
      background: `linear-gradient(45deg, ${theme.colors.green[7]}, ${theme.colors.green[6]})`
    }
  },

  lossButton: {
    background: `linear-gradient(45deg, ${theme.colors.red[6]}, ${theme.colors.red[5]})`,
    border: 'none',
    '&:hover': {
      background: `linear-gradient(45deg, ${theme.colors.red[7]}, ${theme.colors.red[6]})`
    }
  },

  transactionType: {
    padding: rem(8),
    borderRadius: theme.radius.md,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: '2px solid transparent',
    '&:hover': {
      backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[1]
    }
  },

  selectedType: {
    borderColor: theme.colors.blue[5],
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.blue[0]
  },

  statsContainer: {
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.colors.gray[1],
    padding: rem(12),
    borderRadius: theme.radius.md,
    marginTop: rem(8)
  }
}))

export function ProfitModifier ({ item }) {
  const theme = useMantineTheme()
  const { classes } = useStyles()
  const [transactionAmount, setTransactionAmount] = useState(0)
  const [transactionType, setTransactionType] = useState('profit') // 'profit' or 'loss'
  const [dateValue, setDate] = useState(new Date())
  const [useCurrentDate, setUseCurrentDate] = useState(true)
  const [quantity, setQuantity] = useState(1)

  // Mock data for demonstration
  const [totalProfit, setTotalProfit] = useState(125430)
  const [totalTransactions, setTotalTransactions] = useState(47)

  const handleTransactionSubmit = () => {
    if (!transactionAmount || transactionAmount === 0) return

    const amount = transactionType === 'profit' ? transactionAmount : -transactionAmount
    setTotalProfit(prev => prev + (amount * quantity))
    setTotalTransactions(prev => prev + 1)

    // Reset form
    setTransactionAmount(0)
    setQuantity(1)
    setDate(new Date())

    console.log('Transaction recorded:', {
      item: item?.name,
      amount: amount * quantity,
      quantity,
      date: useCurrentDate ? new Date() : dateValue,
      type: transactionType
    })
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value).replace('$', '')
  }

  return (
    <Card withBorder radius="md" className={classes.card}>
      <Group position="apart" mb="md">
        <Group spacing="xs">
          <IconCoins size={20} color={theme.colors.yellow[6]} />
          <Text className={classes.title}>Track Profit</Text>
        </Group>
        <Badge
          color={totalProfit >= 0 ? 'green' : 'red'}
          variant="light"
          leftSection={totalProfit >= 0 ? <IconTrendingUp size={12} /> : <IconTrendingDown size={12} />}
        >
          {formatCurrency(totalProfit)} GP
        </Badge>
      </Group>

      {/* Transaction Type Selection */}
      <Group grow mb="md">
        <div
          className={`${classes.transactionType} ${transactionType === 'profit' ? classes.selectedType : ''}`}
          onClick={() => setTransactionType('profit')}
        >
          <Group position="center" spacing="xs">
            <IconTrendingUp size={16} color={theme.colors.green[6]} />
            <Text size="sm" weight={500}>Profit</Text>
          </Group>
        </div>
        <div
          className={`${classes.transactionType} ${transactionType === 'loss' ? classes.selectedType : ''}`}
          onClick={() => setTransactionType('loss')}
        >
          <Group position="center" spacing="xs">
            <IconTrendingDown size={16} color={theme.colors.red[6]} />
            <Text size="sm" weight={500}>Loss</Text>
          </Group>
        </div>
      </Group>

      <Stack spacing="md">
        {/* Amount Input */}
        <NumberInput
          label="Amount (GP)"
          placeholder="Enter profit/loss amount"
          value={transactionAmount}
          onChange={setTransactionAmount}
          className={transactionType === 'profit' ? classes.profitInput : classes.lossInput}
          parser={(value) => value ? value.replace(/\$\s?|(,*)/g, '') : '0'}
          formatter={(value) => value && !Number.isNaN(parseFloat(value))
            ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
            : '0'
          }
          icon={transactionType === 'profit' ? <IconPlus size={16} /> : <IconMinus size={16} />}
          rightSection={
            <Text size="xs" color="dimmed" pr="sm">GP</Text>
          }
        />

        {/* Quantity Input */}
        <NumberInput
          label="Quantity"
          placeholder="Number of items"
          value={quantity}
          onChange={setQuantity}
          min={1}
          max={1000000}
          icon={<IconCoins size={16} />}
        />

        {/* Date Selection */}
        <Stack spacing="xs">
          <Checkbox
            label="Transaction happened today"
            checked={useCurrentDate}
            onChange={(event) => setUseCurrentDate(event.currentTarget.checked)}
          />

          {!useCurrentDate && (
            <DateInput
              value={dateValue}
              onChange={setDate}
              label="Transaction Date"
              placeholder="Select date"
              icon={<IconCalendar size={16} />}
              maxDate={new Date()}
            />
          )}
        </Stack>

        {/* Submit Button */}
        <Button
          variant="filled"
          className={`${classes.actionButton} ${transactionType === 'profit' ? classes.profitButton : classes.lossButton}`}
          onClick={handleTransactionSubmit}
          disabled={!transactionAmount || transactionAmount === 0}
          leftIcon={transactionType === 'profit' ? <IconTrendingUp size={16} /> : <IconTrendingDown size={16} />}
          fullWidth
        >
          Record {transactionType === 'profit' ? 'Profit' : 'Loss'}
        </Button>
      </Stack>

      {/* Quick Stats */}
      <div className={classes.statsContainer}>
        <Group position="apart">
          <div>
            <Text size="xs" color="dimmed">Total Transactions</Text>
            <Text size="sm" weight={600}>{totalTransactions}</Text>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Text size="xs" color="dimmed">Avg per Transaction</Text>
            <Text size="sm" weight={600}>
              {totalTransactions > 0 ? formatCurrency(Math.round(totalProfit / totalTransactions)) : '0'} GP
            </Text>
          </div>
        </Group>
      </div>
    </Card>
  )
}

export default ProfitModifier
