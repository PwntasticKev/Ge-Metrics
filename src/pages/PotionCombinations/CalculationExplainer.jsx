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
            This page helps you find the best potion decanting opportunities. Cards are sorted by a <strong>Profitability Score</strong>, which prioritizes items with both high profit and high trade volume.
          </Text>
          <Text size="sm" weight={500} mb="sm">Formulas:</Text>
          <List size="sm" spacing="xs">
            <List.Item>
              <Text>
                <Code>Method Score</Code> = Profit × (Ingredient Volume + 4-Dose Volume)
              </Text>
              <Text size="xs" color="dimmed">
                Each decanting method gets its own score. The page is sorted by the highest possible score from any method.
              </Text>
            </List.Item>
            <List.Item>
              <Text>
                <Code>Profitability Score (1-10)</Code>
              </Text>
              <Text size="xs" color="dimmed">
                A ranked score from 1 (worst) to 10 (best). The score is calculated as (Best Profit × 4-Dose Volume). It helps find liquid markets but relies on volume data from the `/latest` API, which can sometimes be unavailable.
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
            The most profitable method (based on pure profit) is highlighted in green on each card.
          </Text>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  )
}
