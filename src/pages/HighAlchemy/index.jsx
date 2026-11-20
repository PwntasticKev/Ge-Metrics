import { Box, Text } from '@mantine/core'
import WikiMethods from '../RecipesHub/WikiMethods.jsx'

// High Alchemy uses the shared processing engine (same numbers as Recipes and
// the app): items and nature runes bought at the instant-buy price, coins
// untaxed, ranked by GP/hour capped at 1,200 casts an hour, buy limits and volume.
export default function HighAlchemy () {
  return (
    <Box sx={{ py: 4 }}>
      <Text size="xl" weight={700}>High Alchemy Profit</Text>
      <Text size="sm" color="dimmed" mb="md">
        Profit = high alch value − instant-buy price − nature rune. Missing prices are left out, never counted as free.
      </Text>
      <WikiMethods methodKey="high-alchemy" lockMethod />
    </Box>
  )
}
