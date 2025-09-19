import React from 'react'
import { Accordion, Text, Code, List } from '@mantine/core'

export function CalculationExplainer ({ expanded = false, onToggle }) {
  return (
    <Accordion
      variant="separated"
      radius="md"
      value={expanded ? 'customization' : null}
      onChange={() => onToggle && onToggle()}
    >
      <Accordion.Item value="customization">
        <Accordion.Control>How are potion combinations calculated?</Accordion.Control>
        <Accordion.Panel>
              <Text size="sm" mb="md">
                This page helps you find the best potion decanting opportunities using <strong>real-time hourly volume data</strong> and <strong>market manipulation detection</strong>. Use the filter dropdown to focus on specific dose methods or overall profitability.
              </Text>
              <Text size="sm" weight={500} mb="sm">Volume & Outlier Detection:</Text>
              <List size="sm" spacing="xs" mb="md">
                <List.Item>
                  <Text>
                    <Code>Hourly Volume Priority</Code>: Uses most recent hour's trading activity (minimum 10 trades/hour)
                  </Text>
                  <Text size="xs" color="dimmed">
                    Fallback to daily volume if hourly insufficient (minimum 20 trades/day). This gives real-time market liquidity.
                  </Text>
                </List.Item>
                <List.Item>
                  <Text>
                    <Code>4x Volume Spike Detection</Code>: Flags potential market manipulation
                  </Text>
                  <Text size="xs" color="dimmed">
                    If hourly volume is 4x+ expected (daily÷24), shows red flag warning. Helps avoid artificial price pumps.
                  </Text>
                </List.Item>
              </List>
              <Text size="sm" weight={500} mb="sm">Scoring Formulas:</Text>
              <List size="sm" spacing="xs">
                <List.Item>
                  <Text>
                    <Code>Method Score</Code> = Profit × (Hourly Volume + 4-Dose Volume) × Weight Multiplier
                  </Text>
                  <Text size="xs" color="dimmed">
                    Weight multipliers: (1) dose = 0.1x, (2) dose = 0.2x, (3) dose = 3.0x. This heavily favors bulk trading viability over raw profit.
                  </Text>
                </List.Item>
                <List.Item>
                  <Text>
                    <Code>Profitability Score (1-10)</Code>: Normalized ranking based on best method score
                  </Text>
                  <Text size="xs" color="dimmed">
                    Uses real-time hourly volume data to rank trading opportunities. Higher scores = better bulk trading potential right now.
                  </Text>
                </List.Item>
            <List.Item>
              <Text>
                <Code>(1) to (4)</Code>: Buy 4x (1)-dose potions, sell 1x (4)-dose potion.
              </Text>
              <Text size="xs" color="dimmed">
                Profit = (Sell Price of 1x (4)) - (Buy Price of 4x (1))
              </Text>
            </List.Item>
            <List.Item>
              <Text>
                <Code>(2) to (4)</Code>: Buy 2x (2)-dose potions, sell 1x (4)-dose potion.
              </Text>
              <Text size="xs" color="dimmed">
                Profit = (Sell Price of 1x (4)) - (Buy Price of 2x (2))
              </Text>
            </List.Item>
            <List.Item>
              <Text>
                <Code>(3) to (4)</Code>: Buy 4x (3)-dose potions, sell 3x (4)-dose potions.
              </Text>
              <Text size="xs" color="dimmed">
                Profit per (4) dose = [ (Sell Price of 3x (4)) - (Buy Price of 4x (3)) ] / 3
              </Text>
            </List.Item>
              </List>
              <Text size="sm" weight={500} mb="sm" mt="md">Filter Modes:</Text>
              <List size="sm" spacing="xs">
                <List.Item>
                  <Text>
                    <Code>Best (3) Dose</Code>: Highlights only (3) dose methods, sorted by their profit (DEFAULT)
                  </Text>
                  <Text size="xs" color="dimmed">
                    Best for bulk trading due to high natural supply from herblore and drinking patterns.
                  </Text>
                </List.Item>
                <List.Item>
                  <Text>
                    <Code>Best (2) Dose / Best (1) Dose</Code>: Focus on specific dose methods
                  </Text>
                  <Text size="xs" color="dimmed">
                    Useful for niche trading or when specific doses have unusual market conditions.
                  </Text>
                </List.Item>
                <List.Item>
                  <Text>
                    <Code>Best Profit</Code>: Highlights method with highest profit (ignores volume)
                  </Text>
                  <Text size="xs" color="dimmed">
                    Focus purely on profit margins for maximum per-transaction returns.
                  </Text>
                </List.Item>
              </List>
              <Text size="xs" mt="md">
                The selected method type is highlighted in green on each card.
              </Text>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  )
}
