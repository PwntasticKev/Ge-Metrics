import React from 'react'
import { Accordion, Text, Code, List } from '@mantine/core'

export function CalculationExplainer () {
  return (
    <Accordion variant="separated" radius="md" defaultValue="customization">
      <Accordion.Item value="customization">
        <Accordion.Control>How are potion combinations calculated?</Accordion.Control>
        <Accordion.Panel>
          <Text size="sm" mb="md">
            This page helps you find the best potion decanting opportunities. Cards are sorted by a <strong>Profitability Score</strong>, which prioritizes items with both high profit and high trade volume.
          </Text>
          <Text size="sm" weight={500} mb="sm">Formulas:</Text>
          <List size="sm" spacing="xs">
            <List.Item>
              <Text>
                <Code>Profitability Score</Code> = Best Profit × Volume
              </Text>
              <Text size="xs" color="dimmed">
                This helps find liquid markets with good returns.
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
          <Text size="xs" mt="md">
            All buy prices are the equivalent cost to produce one 4-dose potion. The most profitable method is highlighted in green on each card.
          </Text>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  )
}
