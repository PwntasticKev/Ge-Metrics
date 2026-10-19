import React, { useState } from 'react'
import { Drawer, Stack, Group, Text, Badge, Box, UnstyledButton } from '@mantine/core'

const MobileInfoDrawer = ({ data, seriesVisibility, COLORS }) => {
  const [opened, setOpened] = useState(false)

  const formatNumber = (val) => new Intl.NumberFormat().format(val)

  return (
    <>
      {/* Tap target to open drawer */}
      <UnstyledButton
        onClick={() => setOpened(true)}
        sx={{
          position: 'absolute',
          bottom: 8,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 20,
          padding: '4px 16px',
          borderRadius: 12,
          backgroundColor: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(4px)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        <Text size="xs" color="dimmed" align="center">
          Tap for details
        </Text>
      </UnstyledButton>

      <Drawer
        opened={opened}
        onClose={() => setOpened(false)}
        position="bottom"
        size="40%"
        withCloseButton={false}
        overlayProps={{ opacity: 0.3, blur: 2 }}
        styles={{
          body: { backgroundColor: '#1A1B1E', padding: 16 },
          content: { borderTopLeftRadius: 16, borderTopRightRadius: 16 }
        }}
      >
        {/* Pull handle */}
        <Box sx={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <Box sx={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)' }} />
        </Box>

        {data ? (
          <Stack spacing="md">
            <div>
              <Text size="xs" color="dimmed" transform="uppercase" weight={700}>Date</Text>
              <Text size="md" weight={600} color="white">{data.dateFormatted}</Text>
            </div>

            <Group grow>
              {seriesVisibility.highPrice && data.high !== undefined && (
                <div>
                  <Text size="xs" color={COLORS.sell} weight={600}>Sell</Text>
                  <Text size="sm" weight={700} color="white">{formatNumber(data.high)}</Text>
                </div>
              )}
              {seriesVisibility.lowPrice && data.low !== undefined && (
                <div>
                  <Text size="xs" color={COLORS.buy} weight={600}>Buy</Text>
                  <Text size="sm" weight={700} color="white">{formatNumber(data.low)}</Text>
                </div>
              )}
            </Group>

            <Group grow>
              {seriesVisibility.sellVolume && data.sellVolume !== undefined && (
                <div>
                  <Text size="xs" color={COLORS.sell} weight={600}>Sell Vol</Text>
                  <Text size="sm" weight={600} color="white">{formatNumber(data.sellVolume)}</Text>
                </div>
              )}
              {seriesVisibility.buyVolume && data.buyVolume !== undefined && (
                <div>
                  <Text size="xs" color={COLORS.buy} weight={600}>Buy Vol</Text>
                  <Text size="sm" weight={600} color="white">{formatNumber(data.buyVolume)}</Text>
                </div>
              )}
            </Group>

            {(seriesVisibility.sma20 || seriesVisibility.ema20) && (
              <Group grow>
                {seriesVisibility.sma20 && data.sma20 && (
                  <div>
                    <Text size="xs" color="#22d3ee" weight={600}>SMA(20)</Text>
                    <Text size="sm" weight={600} color="white">{formatNumber(Math.round(data.sma20))}</Text>
                  </div>
                )}
                {seriesVisibility.ema20 && data.ema20 && (
                  <div>
                    <Text size="xs" color="#a78bfa" weight={600}>EMA(20)</Text>
                    <Text size="sm" weight={600} color="white">{formatNumber(Math.round(data.ema20))}</Text>
                  </div>
                )}
              </Group>
            )}

            {data.updateData && (
              <Box p="xs" sx={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 4 }}>
                <Badge
                  color={data.updateData.type === 'blog' ? 'blue' : 'orange'}
                  variant="filled"
                  size="sm"
                  mb={4}
                >
                  {data.updateData.type}
                </Badge>
                <Text size="sm" weight={600} color="white">{data.updateData.title}</Text>
              </Box>
            )}
          </Stack>
        ) : (
          <Text color="dimmed" size="sm" align="center">Hover chart for details</Text>
        )}
      </Drawer>
    </>
  )
}

export default MobileInfoDrawer
