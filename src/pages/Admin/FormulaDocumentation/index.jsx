import React, { useState } from 'react'
import {
  Container,
  Title,
  Text,
  Card,
  Stack,
  Group,
  Badge,
  Tabs,
  Alert,
  Code,
  Divider,
  Button,
  ActionIcon,
  Tooltip,
  SimpleGrid,
  List,
  ThemeIcon,
  Accordion,
  Paper
} from '@mantine/core'
import {
  IconMathSymbols,
  IconBrain,
  IconCalculator,
  IconChartLine,
  IconTarget,
  IconAlertCircle,
  IconInfoCircle,
  IconEdit,
  IconCheck,
  IconX,
  IconMath,
  IconTrendingUp,
  IconCoins,
  IconDiamond,
  IconClock,
  IconShield
} from '@tabler/icons-react'

const FormulaDocumentation = () => {
  const [activeTab, setActiveTab] = useState('ai-predictions')

  const FormulaCard = ({ title, description, formula, variables, example, lastUpdated, complexity, icon: Icon }) => (
    <Card withBorder p="md" mb="md">
      <Group justify="space-between" mb="sm">
        <Group>
          <ThemeIcon color="blue" variant="light" size="lg">
            <Icon size={20} />
          </ThemeIcon>
          <div>
            <Text weight={600} size="lg">{title}</Text>
            <Text size="xs" color="dimmed">Last updated: {lastUpdated}</Text>
          </div>
        </Group>
        <Badge color={complexity === 'Simple' ? 'green' : complexity === 'Medium' ? 'yellow' : 'red'} variant="light">
          {complexity}
        </Badge>
      </Group>

      <Text mb="md">{description}</Text>

      {formula && (
        <Paper withBorder p="sm" mb="md" style={{ backgroundColor: '#f8f9fa' }}>
          <Text size="sm" weight={500} mb="xs">Formula:</Text>
          <Code block>{formula}</Code>
        </Paper>
      )}

      {variables && (
        <div style={{ marginBottom: '1rem' }}>
          <Text size="sm" weight={500} mb="xs">Variables:</Text>
          <List size="sm">
            {variables.map((variable, index) => (
              <List.Item key={index}>{variable}</List.Item>
            ))}
          </List>
        </div>
      )}

      {example && (
        <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
          <Text size="sm" weight={500}>Example:</Text>
          <Text size="sm">{example}</Text>
        </Alert>
      )}
    </Card>
  )

  return (
    <Container size="xl" py="md">
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={1}>📚 Formula Documentation</Title>
          <Text color="dimmed" size="lg">
            Simple explanations of all algorithms and formulas used in Ge-Metrics
          </Text>
        </div>
        <Group>
          <Badge color="orange" variant="light" size="lg">
            🚨 Update Required After Changes
          </Badge>
          <Button leftSection={<IconEdit size={16} />} variant="light">
            Edit Documentation
          </Button>
        </Group>
      </Group>

      <Alert icon={<IconAlertCircle size={16} />} color="red" mb="xl">
        <Text weight={500}>📝 IMPORTANT REMINDER:</Text>
        <Text>This documentation MUST be updated every time we make changes to formulas, algorithms, or calculations on any page. Keep this as your single source of truth!</Text>
      </Alert>

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="ai-predictions" leftSection={<IconBrain size={16} />}>
            AI Predictions
          </Tabs.Tab>
          <Tabs.Tab value="profit-calculations" leftSection={<IconCoins size={16} />}>
            Profit Calculations
          </Tabs.Tab>
          <Tabs.Tab value="market-analysis" leftSection={<IconChartLine size={16} />}>
            Market Analysis
          </Tabs.Tab>
          <Tabs.Tab value="risk-assessment" leftSection={<IconShield size={16} />}>
            Risk Assessment
          </Tabs.Tab>
          <Tabs.Tab value="other-formulas" leftSection={<IconCalculator size={16} />}>
            Other Formulas
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="ai-predictions" pt="md">
          <Stack spacing="md">
            <FormulaCard
              title="Overall AI Score"
              icon={IconBrain}
              description="The main score that determines how good an item is for trading. Combines multiple factors into one easy number."
              formula="Overall Score = (Confidence × 0.3) + (Profit Potential × 0.25) + (Volume Score × 0.2) + (Risk Score × 0.15) + (Market Timing × 0.1)"
              variables={[
                'Confidence: How sure we are about the prediction (0-100%)',
                'Profit Potential: Expected profit margin (0-100%)',
                'Volume Score: How much the item trades (0-100%)',
                'Risk Score: How risky the trade is (0-100%, inverted)',
                'Market Timing: How good the timing is right now (0-100%)'
              ]}
              example="Item with 85% confidence, 60% profit potential, 70% volume, 20% risk (80% risk score), 90% timing = (85×0.3) + (60×0.25) + (70×0.2) + (80×0.15) + (90×0.1) = 74.5 overall score"
              lastUpdated="Dec 2024"
              complexity="Medium"
            />

            <FormulaCard
              title="Hidden Gems Detection"
              icon={IconDiamond}
              description="Finds items that are profitable but not many people are trading them yet. These are the secret money makers!"
              formula="Hidden Gem Score = (Profit Margin × Volume Scarcity × Trend Strength) / Competition Level"
              variables={[
                'Profit Margin: How much money you can make (%)',
                'Volume Scarcity: How few people are trading it (lower = better)',
                'Trend Strength: How much the price is going up',
                'Competition Level: How many other traders are already doing this'
              ]}
              example="Item with 45% profit margin, low volume (score 80), strong upward trend (score 75), low competition (score 90) = Hidden Gem candidate"
              lastUpdated="Dec 2024"
              complexity="Medium"
            />

            <FormulaCard
              title="Whale Activity Detection"
              icon={IconTrendingUp}
              description="Spots when big traders (whales) are buying or selling lots of an item. When whales move, prices usually follow!"
              formula="Whale Activity = Large Transactions (>10M GP) + Volume Spikes (>200% normal) + Price Impact Analysis"
              variables={[
                'Large Transactions: Single trades over 10M GP',
                'Volume Spikes: When trading volume goes 2x normal or higher',
                'Price Impact: How much the price moved after big trades',
                '24h Whale Volume: Total GP moved by whales in 24 hours'
              ]}
              example="If we see 3 trades over 10M GP, volume is 300% of normal, and price moved 15% after = High whale activity detected"
              lastUpdated="Dec 2024"
              complexity="Simple"
            />

            <FormulaCard
              title="Market Timing Score"
              icon={IconClock}
              description="Tells you if NOW is a good time to buy or sell an item based on patterns and trends."
              formula="Timing Score = (Trend Direction × 0.4) + (Volume Momentum × 0.3) + (Price Stability × 0.3)"
              variables={[
                'Trend Direction: Is price going up or down? (up = good for selling)',
                'Volume Momentum: Is trading volume increasing?',
                'Price Stability: Is the price steady or jumping around?',
                'Time of Day: Some items trade better at certain times'
              ]}
              example="Strong upward trend (90), increasing volume (75), stable price (80) = 82 timing score = Great time to sell!"
              lastUpdated="Dec 2024"
              complexity="Medium"
            />

            <FormulaCard
              title="Algorithm Success Rates"
              icon={IconTarget}
              description="These are the success rates we show for each AI algorithm. Based on historical performance."
              formula="Success Rate = (Profitable Predictions / Total Predictions) × 100"
              variables={[
                'Hidden Gem Detection: 87.3% success rate',
                'Volume Analysis: 91.7% accuracy',
                'Margin Optimization: 84.2% success rate',
                'Risk Assessment: 89.5% accuracy',
                'Market Timing: 76.8% accuracy',
                'Price Stability: 82.4% success rate'
              ]}
              example="Out of 100 Hidden Gem predictions, 87 were profitable = 87% success rate"
              lastUpdated="Dec 2024"
              complexity="Simple"
            />
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="profit-calculations" pt="md">
          <Stack spacing="md">
            <FormulaCard
              title="Basic Profit Calculation"
              icon={IconCoins}
              description="The simple formula for calculating profit on any trade. This is used everywhere in the app."
              formula="Profit = (Sell Price - Buy Price - Tax) × Quantity"
              variables={[
                'Sell Price: What you sell the item for',
                'Buy Price: What you bought it for',
                'Tax: Grand Exchange tax (usually 1% on sales)',
                "Quantity: How many items you're trading"
              ]}
              example="Buy 100 Dragon Bones at 2,500 GP each, sell at 2,800 GP each: (2,800 - 2,500 - 28) × 100 = 27,200 GP profit"
              lastUpdated="Dec 2024"
              complexity="Simple"
            />

            <FormulaCard
              title="Profit Margin Percentage"
              icon={IconCalculator}
              description="Shows what percentage profit you're making. Higher percentages = better deals!"
              formula="Profit Margin % = ((Sell Price - Buy Price - Tax) / Buy Price) × 100"
              variables={[
                'Uses same variables as basic profit calculation',
                'Result is a percentage (like 15% profit margin)'
              ]}
              example="Buy at 2,500 GP, sell at 2,800 GP with 28 GP tax: ((2,800 - 2,500 - 28) / 2,500) × 100 = 10.88% profit margin"
              lastUpdated="Dec 2024"
              complexity="Simple"
            />

            <FormulaCard
              title="ROI (Return on Investment)"
              icon={IconTrendingUp}
              description="How much money you make compared to how much you invested. Similar to profit margin but includes all costs."
              formula="ROI % = (Total Profit / Total Investment) × 100"
              variables={[
                'Total Profit: All money made minus all costs',
                'Total Investment: All money you put in (including taxes, fees, etc.)'
              ]}
              example="Invest 250,000 GP total, make 35,000 GP profit: (35,000 / 250,000) × 100 = 14% ROI"
              lastUpdated="Dec 2024"
              complexity="Simple"
            />
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="market-analysis" pt="md">
          <Stack spacing="md">
            <FormulaCard
              title="Volume Analysis"
              icon={IconChartLine}
              description="Measures how much an item is being traded. High volume = easier to buy/sell, low volume = might be harder to trade."
              formula="Volume Score = (Current 24h Volume / Average 30-day Volume) × 100"
              variables={[
                'Current 24h Volume: How much traded in last 24 hours',
                'Average 30-day Volume: Normal trading amount over 30 days',
                'Score over 100 = higher than normal volume',
                'Score under 100 = lower than normal volume'
              ]}
              example="Item normally trades 500 per day, today it traded 750: (750 / 500) × 100 = 150 volume score (50% higher than normal)"
              lastUpdated="Dec 2024"
              complexity="Simple"
            />

            <FormulaCard
              title="Price Stability Index"
              icon={IconShield}
              description="Measures how stable an item's price is. Stable prices = less risky, unstable prices = more risky but potentially more profitable."
              formula="Stability Index = 100 - (Standard Deviation of Prices / Average Price × 100)"
              variables={[
                'Standard Deviation: How much prices jump around',
                'Average Price: The typical price over time period',
                'Higher index = more stable (safer)',
                'Lower index = less stable (riskier)'
              ]}
              example="Item averages 1,000 GP with 50 GP standard deviation: 100 - (50/1000 × 100) = 95 stability index (very stable)"
              lastUpdated="Dec 2024"
              complexity="Medium"
            />

            <FormulaCard
              title="Market Opportunity Score"
              icon={IconTarget}
              description="Combines multiple factors to find the best trading opportunities right now."
              formula="Opportunity Score = (Price Efficiency × 0.4) + (Volume Trend × 0.3) + (Timing × 0.3)"
              variables={[
                "Price Efficiency: How far current price is from 'fair' price",
                'Volume Trend: Is trading volume going up or down?',
                'Timing: Based on historical patterns, is now a good time?',
                'Score 0-100: Higher = better opportunity'
              ]}
              example="Underpriced item (90), increasing volume (75), good timing (80) = (90×0.4) + (75×0.3) + (80×0.3) = 82.5 opportunity score"
              lastUpdated="Dec 2024"
              complexity="Medium"
            />
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="risk-assessment" pt="md">
          <Stack spacing="md">
            <FormulaCard
              title="Risk Score Calculation"
              icon={IconShield}
              description="Measures how risky a trade is. Lower risk = safer but less profit, higher risk = more dangerous but potentially more profit."
              formula="Risk Score = (Price Volatility × 0.4) + (Volume Risk × 0.3) + (Market Risk × 0.3)"
              variables={[
                'Price Volatility: How much the price jumps around',
                'Volume Risk: Risk from low trading volume',
                'Market Risk: General market conditions and trends',
                'Score 0-100: Lower = safer, Higher = riskier'
              ]}
              example="Stable price (20), good volume (15), stable market (25) = (20×0.4) + (15×0.3) + (25×0.3) = 19.5 risk score (low risk)"
              lastUpdated="Dec 2024"
              complexity="Medium"
            />

            <FormulaCard
              title="Loss Prevention Algorithm"
              icon={IconX}
              description="Tries to prevent you from making bad trades by warning about high-risk situations."
              formula="Warning Trigger = Risk Score > 70 OR Price Drop > 15% OR Volume Drop > 50%"
              variables={[
                'Risk Score: From risk calculation above',
                'Price Drop: How much price fell recently',
                'Volume Drop: How much trading volume decreased',
                'Any condition = warning shown'
              ]}
              example="If risk score is 75 OR price dropped 20% OR volume dropped 60% = Show warning to user"
              lastUpdated="Dec 2024"
              complexity="Simple"
            />
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="other-formulas" pt="md">
          <Stack spacing="md">
            <FormulaCard
              title="Item Popularity Score"
              icon={IconTrendingUp}
              description="Measures how popular an item is for trading. More popular = easier to buy/sell."
              formula="Popularity = (Search Volume + Trade Volume + Price Checks) / 3"
              variables={[
                'Search Volume: How often people search for this item',
                "Trade Volume: How much it's actually traded",
                'Price Checks: How often people check its price',
                'All normalized to 0-100 scale'
              ]}
              example="High search (85), medium trades (60), lots of price checks (90) = (85+60+90)/3 = 78.3 popularity score"
              lastUpdated="Dec 2024"
              complexity="Simple"
            />

            <FormulaCard
              title="Trend Strength Indicator"
              icon={IconChartLine}
              description="Shows how strong a price trend is. Strong upward trend = good for selling, strong downward trend = good for buying."
              formula="Trend Strength = (Current Price - Price 7 Days Ago) / Price 7 Days Ago × 100"
              variables={[
                "Current Price: Today's price",
                'Price 7 Days Ago: Price from a week ago',
                'Positive result = upward trend',
                'Negative result = downward trend'
              ]}
              example="Price was 1,000 GP a week ago, now 1,150 GP: (1,150 - 1,000) / 1,000 × 100 = +15% trend strength"
              lastUpdated="Dec 2024"
              complexity="Simple"
            />

            <FormulaCard
              title="Competition Level"
              icon={IconTarget}
              description="Measures how many other traders are competing for the same opportunities. Lower competition = better for you!"
              formula="Competition Level = (Active Traders + Price Watchers + Similar Strategies) / Market Size"
              variables={[
                'Active Traders: How many people are actively trading this item',
                'Price Watchers: How many have price alerts set',
                'Similar Strategies: How many using same trading approach',
                'Market Size: Total potential market for this item'
              ]}
              example="50 active traders, 200 watchers, 30 similar strategies, market size 1000 = (50+200+30)/1000 = 0.28 = Low competition"
              lastUpdated="Dec 2024"
              complexity="Medium"
            />
          </Stack>
        </Tabs.Panel>
      </Tabs>

      <Alert icon={<IconInfoCircle size={16} />} color="blue" mt="xl">
        <Text weight={500}>💡 How to Keep This Updated:</Text>
        <List size="sm" mt="xs">
          <List.Item>Every time you change a formula or algorithm, update this page</List.Item>
          <List.Item>Add new formulas when you create new features</List.Item>
          <List.Item>Update the "Last Updated" dates when you make changes</List.Item>
          <List.Item>Keep the explanations simple - anyone should be able to understand them</List.Item>
          <List.Item>Include real examples with actual numbers</List.Item>
        </List>
      </Alert>
    </Container>
  )
}

export default FormulaDocumentation
