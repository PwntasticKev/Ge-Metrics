import { useState } from 'react'
import { Button, Card, Checkbox, createStyles, Group, NumberInput, rem, Text, useMantineTheme } from '@mantine/core'
import { DateInput } from '@mantine/dates'

const useStyles = createStyles((theme) => ({
  card: {
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0],
    overflow: 'visible'
  },

  title: {
    fontFamily: `Greycliff CF, ${theme.fontFamily}`,
    fontWeight: 700
  },

  item: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    borderRadius: theme.radius.md,
    height: rem(90),
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.white,
    transition: 'box-shadow 150ms ease, transform 100ms ease',

    '&:hover': {
      boxShadow: theme.shadows.md,
      transform: 'scale(1.05)'
    }
  },
  button: {
    marginTop: '8px'
  },
  transactionInput: {
    marginTop: '8px'
  },
  checkbox: {
    margin: '8px 0'
  }
}))

export function ProfitModifier () {
  const theme = useMantineTheme()
  const { classes } = useStyles()
  const [dateValue, setDate] = useState(null)
  const [dateInput, setShowDateInput] = useState(true)

  const handleCheckBoxChange = () => {
    setShowDateInput(!dateInput)
    setDate(null)
  }

  return (
        <Card withBorder radius="md" className={classes.card}>
            <Group position="apart">
                <Text className={classes.title}>Add Transaction</Text>
            </Group>
            <NumberInput
                label="Price"
                parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
            />

            <Checkbox
                label="Item Sold Today"
                checked={dateInput}
                onChange={handleCheckBoxChange}
                className={classes.checkbox}
            />

            {
                dateInput === false && (
                    <DateInput
                        value={dateValue}
                        onChange={setDate}
                        label="Date input"
                        placeholder="Date input"
                        mx="auto"
                    />
                )
            }

            <Button variant="outline" className={classes.button}>
                Add Transaction
            </Button>
        </Card>
  )
}

export default ProfitModifier
