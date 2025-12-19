import React, { useState } from 'react'
import { Stack, Group, Text, Switch, NumberInput, Button, Collapse, Divider } from '@mantine/core'
import { IconChevronDown, IconChevronUp, IconChartLine } from '@tabler/icons-react'

/**
 * IndicatorPanel - Panel for configuring technical indicators
 * 
 * @param {Object} props
 * @param {Object} props.indicators - Current indicator states { sma: { enabled, period }, ema: { enabled, period }, rsi: { enabled, period }, macd: { enabled }, bollinger: { enabled, period, stdDev } }
 * @param {Function} props.onIndicatorChange - Callback when indicator settings change
 */
export default function IndicatorPanel({ indicators = {}, onIndicatorChange }) {
  const [opened, setOpened] = useState(false)

  const defaultIndicators = {
    sma: { enabled: false, period: 20 },
    ema: { enabled: false, period: 20 },
    rsi: { enabled: false, period: 14 },
    macd: { enabled: false },
    bollinger: { enabled: false, period: 20, stdDev: 2 }
  }

  const currentIndicators = { ...defaultIndicators, ...indicators }

  const handleToggle = (indicatorName) => {
    const current = currentIndicators[indicatorName] || {}
    onIndicatorChange?.(indicatorName, {
      ...current,
      enabled: !current.enabled
    })
  }

  const handlePeriodChange = (indicatorName, period) => {
    const current = currentIndicators[indicatorName] || {}
    onIndicatorChange?.(indicatorName, {
      ...current,
      period: period || current.period
    })
  }

  const handleStdDevChange = (stdDev) => {
    const current = currentIndicators.bollinger || {}
    onIndicatorChange?.('bollinger', {
      ...current,
      stdDev: stdDev || current.stdDev
    })
  }

  return (
    <div style={{ borderTop: '1px solid #373A40', padding: '12px' }}>
      <Button
        variant="subtle"
        fullWidth
        leftIcon={<IconChartLine size={16} />}
        rightIcon={opened ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
        onClick={() => setOpened(!opened)}
        styles={{
          root: {
            color: '#C1C2C5',
            '&:hover': {
              backgroundColor: '#25262b'
            }
          }
        }}
      >
        Technical Indicators
      </Button>

      <Collapse in={opened}>
        <Stack spacing="md" mt="md">
          {/* SMA */}
          <Group position="apart">
            <Group spacing="xs">
              <Switch
                checked={currentIndicators.sma?.enabled || false}
                onChange={() => handleToggle('sma')}
                size="sm"
              />
              <Text size="sm">SMA</Text>
            </Group>
            {currentIndicators.sma?.enabled && (
              <NumberInput
                value={currentIndicators.sma?.period || 20}
                onChange={(value) => handlePeriodChange('sma', value)}
                min={1}
                max={200}
                size="xs"
                style={{ width: 80 }}
                styles={{
                  input: {
                    backgroundColor: '#25262b',
                    borderColor: '#373A40',
                    color: '#C1C2C5'
                  }
                }}
              />
            )}
          </Group>

          {/* EMA */}
          <Group position="apart">
            <Group spacing="xs">
              <Switch
                checked={currentIndicators.ema?.enabled || false}
                onChange={() => handleToggle('ema')}
                size="sm"
              />
              <Text size="sm">EMA</Text>
            </Group>
            {currentIndicators.ema?.enabled && (
              <NumberInput
                value={currentIndicators.ema?.period || 20}
                onChange={(value) => handlePeriodChange('ema', value)}
                min={1}
                max={200}
                size="xs"
                style={{ width: 80 }}
                styles={{
                  input: {
                    backgroundColor: '#25262b',
                    borderColor: '#373A40',
                    color: '#C1C2C5'
                  }
                }}
              />
            )}
          </Group>

          {/* RSI */}
          <Group position="apart">
            <Group spacing="xs">
              <Switch
                checked={currentIndicators.rsi?.enabled || false}
                onChange={() => handleToggle('rsi')}
                size="sm"
              />
              <Text size="sm">RSI</Text>
            </Group>
            {currentIndicators.rsi?.enabled && (
              <NumberInput
                value={currentIndicators.rsi?.period || 14}
                onChange={(value) => handlePeriodChange('rsi', value)}
                min={1}
                max={50}
                size="xs"
                style={{ width: 80 }}
                styles={{
                  input: {
                    backgroundColor: '#25262b',
                    borderColor: '#373A40',
                    color: '#C1C2C5'
                  }
                }}
              />
            )}
          </Group>

          {/* MACD */}
          <Group position="apart">
            <Group spacing="xs">
              <Switch
                checked={currentIndicators.macd?.enabled || false}
                onChange={() => handleToggle('macd')}
                size="sm"
              />
              <Text size="sm">MACD</Text>
            </Group>
          </Group>

          {/* Bollinger Bands */}
          <Group position="apart">
            <Group spacing="xs">
              <Switch
                checked={currentIndicators.bollinger?.enabled || false}
                onChange={() => handleToggle('bollinger')}
                size="sm"
              />
              <Text size="sm">Bollinger Bands</Text>
            </Group>
            {currentIndicators.bollinger?.enabled && (
              <Group spacing="xs">
                <NumberInput
                  value={currentIndicators.bollinger?.period || 20}
                  onChange={(value) => handlePeriodChange('bollinger', value)}
                  min={1}
                  max={200}
                  size="xs"
                  style={{ width: 70 }}
                  placeholder="Period"
                  styles={{
                    input: {
                      backgroundColor: '#25262b',
                      borderColor: '#373A40',
                      color: '#C1C2C5'
                    }
                  }}
                />
                <NumberInput
                  value={currentIndicators.bollinger?.stdDev || 2}
                  onChange={handleStdDevChange}
                  min={0.5}
                  max={5}
                  step={0.5}
                  size="xs"
                  style={{ width: 70 }}
                  placeholder="Std Dev"
                  styles={{
                    input: {
                      backgroundColor: '#25262b',
                      borderColor: '#373A40',
                      color: '#C1C2C5'
                    }
                  }}
                />
              </Group>
            )}
          </Group>
        </Stack>
      </Collapse>
    </div>
  )
}

