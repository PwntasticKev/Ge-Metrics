import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  BarChart,
  Bar,
  ComposedChart,
  Area,
  AreaChart,
  ReferenceArea,
  Scatter
} from 'recharts'
import {
  Card,
  Group,
  Button,
  Select,
  Badge,
  Text,
  ActionIcon,
  Menu,
  TextInput,
  ColorPicker,
  Switch,
  Stack,
  Divider,
  Tooltip as MantineTooltip,
  Modal,
  Textarea,
  Box,
  Flex,
  Checkbox,
  Popover
} from '@mantine/core'
import {
  IconSettings,
  IconTag,
  IconDownload,
  IconMaximize,
  IconRefresh,
  IconZoomIn,
  IconZoomOut,
  IconFilter
} from '@tabler/icons-react'
import { useQuery } from 'react-query'
import { getItemHistoryById } from '../../api/rs-wiki-api.jsx'
import { getItemById } from '../../utils/utils.jsx'
import { calculateSMA, calculateEMA } from '../../utils/indicators.js'
import { trpc } from '../../utils/trpc.jsx'

// Color Constants
const COLORS = {
  sell: '#f59e0b', // Orange (High Price / Sell Volume)
  buy: '#3b82f6',  // Blue (Low Price / Buy Volume)
  sma: '#22d3ee',  // Cyan
  ema: '#a78bfa',  // Purple
  grid: 'rgba(55, 65, 81, 0.1)', 
  crosshair: '#6B7280',
  text: '#C1C2C5',
  blog: '#3b82f6', // Blue for blogs
  update: '#f59e0b' // Orange for updates
}

const AdvancedChart = ({ itemId, items, item: itemProp, height = 600, showControls = true }) => {
  const [timeframe, setTimeframe] = useState('24h') // API Timestep
  const [range, setRange] = useState('1D') // View Range
  const [chartType, setChartType] = useState('line')
  
  // Visibility State
  const [seriesVisibility, setSeriesVisibility] = useState({
    highPrice: true,
    lowPrice: true,
    buyVolume: true,
    sellVolume: true,
    sma20: false,
    ema20: false,
    updates: true
  })

  // Zoom State
  const [left, setLeft] = useState('dataMin')
  const [right, setRight] = useState('dataMax')
  const [refAreaLeft, setRefAreaLeft] = useState('')
  const [refAreaRight, setRefAreaRight] = useState('')
  const [top, setTop] = useState('auto')
  const [bottom, setBottom] = useState('auto')
  
  // Hover State for Info Panel
  const [hoverData, setHoverData] = useState(null)

  const [annotations, setAnnotations] = useState([])
  const [selectedAnnotation, setSelectedAnnotation] = useState(null)
  const [annotationModalOpen, setAnnotationModalOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const chartRef = useRef(null)
  
  // Resolve item
  const item = useMemo(() => {
    if (itemProp) return itemProp;
    if (itemId && items) return getItemById(Number(itemId), items);
    return { name: 'Unknown Item', id: itemId };
  }, [itemId, items, itemProp]);

  // Fetch History Data
  const { data: historyData, isLoading } = useQuery({
    queryKey: ['advancedChart', itemId, timeframe],
    queryFn: async () => {
      if (!itemId) return []
      const result = await getItemHistoryById(timeframe, itemId)
      return result?.data?.data || []
    },
    enabled: !!itemId,
    refetchInterval: 30000
  })

  // Fetch Game Updates (Blogs/Updates)
  const blogsQuery = trpc.gameEvents.getByDateRange.useQuery({
    startDate: historyData?.length > 0 
      ? new Date(Math.min(...historyData.map(d => d.timestamp * 1000)))
      : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), 
    endDate: new Date()
  }, {
    enabled: !!historyData && seriesVisibility.updates,
    staleTime: 5 * 60 * 1000
  })

  const gameUpdates = useMemo(() => {
    const blogs = blogsQuery.data?.data?.blogs || []
    const updates = blogsQuery.data?.data?.updates || []
    
    const combined = [
        ...blogs.map(b => ({
            id: `blog_${b.date}`,
            date: new Date(b.date),
            title: b.title || 'Developer Blog',
            description: 'Read more on the OSRS homepage',
            type: 'blog',
            color: COLORS.blog
        })),
        ...updates.map(u => ({
            id: `update_${u.updateDate || u.date}`,
            date: new Date(u.updateDate || u.date),
            title: u.title || 'Game Update',
            description: u.category || 'Game Update',
            type: 'update',
            color: COLORS.update
        }))
    ]
    
    // Sort by date
    return combined.sort((a, b) => a.date - b.date)
  }, [blogsQuery.data])

  // Map Range to Timestep
  useEffect(() => {
    switch (range) {
      case '1D': setTimeframe('5m'); break;
      case '1W': setTimeframe('1h'); break;
      case '1M': setTimeframe('1h'); break;
      case '3M': setTimeframe('6h'); break;
      case '6M': setTimeframe('6h'); break;
      case '1Y': setTimeframe('24h'); break;
      case 'All': setTimeframe('24h'); break;
      default: setTimeframe('24h');
    }
    zoomOut()
  }, [range])

  // Process data for chart
  const chartData = useMemo(() => {
    if (!historyData || historyData.length === 0) return []

    const now = Date.now();
    let cutoff = 0;
    switch (range) {
      case '1D': cutoff = now - 24 * 60 * 60 * 1000; break;
      case '1W': cutoff = now - 7 * 24 * 60 * 60 * 1000; break;
      case '1M': cutoff = now - 30 * 24 * 60 * 60 * 1000; break;
      case '3M': cutoff = now - 90 * 24 * 60 * 60 * 1000; break;
      case '6M': cutoff = now - 180 * 24 * 60 * 60 * 1000; break;
      case '1Y': cutoff = now - 365 * 24 * 60 * 60 * 1000; break;
      default: cutoff = 0;
    }

    // Filter and basic mapping
    let processed = historyData
      .filter(d => {
        const ts = d.timestamp * 1000;
        return ts >= cutoff && (d.avgHighPrice !== null || d.avgLowPrice !== null);
      })
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(d => {
        const date = new Date(d.timestamp * 1000)
        const high = d.avgHighPrice || d.avgLowPrice || 0
        const low = d.avgLowPrice || d.avgHighPrice || 0
        
        // Find update (snap to nearest day/hour within reasonable window)
        // Since chart points are discrete, we associate the update with the closest point
        // Or we just find if an update occurred on this "day" or timeframe bucket.
        const update = gameUpdates.find(u => {
             // Match strictly by date for daily data, or within window for others
             const diff = Math.abs(u.date.getTime() - date.getTime())
             // If timeframe is 24h, match same day. If 5m, match within an hour?
             // Simple approach: within 12 hours for daily, or match closest point.
             // Let's use 12h window.
             return diff < 12 * 60 * 60 * 1000
        })

        return {
          timestamp: d.timestamp,
          time: d.timestamp, // for indicators
          value: high,       // for indicators (using high price)
          date: date.toISOString(),
          dateObj: date,
          dateFormatted: formatDateForTimeframe(date, range),
          high,
          low,
          buyVolume: d.lowPriceVolume || 0,
          sellVolume: d.highPriceVolume || 0,
          update: update ? 1 : null, // Marker value for Y-axis
          updateData: update
        }
      })

    // Calculate Indicators
    if (processed.length > 0) {
        const sma20 = calculateSMA(processed, 20)
        const ema20 = calculateEMA(processed, 20)

        // Merge indicators back
        processed = processed.map(p => {
            const smaPoint = sma20.find(s => s.time === p.time)
            const emaPoint = ema20.find(e => e.time === p.time)
            return {
                ...p,
                sma20: smaPoint ? smaPoint.value : null,
                ema20: emaPoint ? emaPoint.value : null
            }
        })
    }

    return processed
  }, [historyData, range, timeframe, gameUpdates])

  // Update hover data
  useEffect(() => {
    if (chartData.length > 0 && !hoverData) {
      setHoverData(chartData[chartData.length - 1])
    }
  }, [chartData])

  function formatDateForTimeframe(date, rng) {
    switch (rng) {
      case '1D': return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      case '1W': return date.toLocaleDateString('en-US', { weekday: 'short', hour: '2-digit' })
      case '1M': case '3M': return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      default: return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    }
  }

  // Zoom Logic
  const zoom = () => {
    if (refAreaLeft === refAreaRight || refAreaRight === '') {
      setRefAreaLeft('')
      setRefAreaRight('')
      return
    }

    let leftX = refAreaLeft
    let rightX = refAreaRight
    if (leftX > rightX) [leftX, rightX] = [rightX, leftX]

    const zoomedData = chartData.filter(d => d.timestamp >= leftX && d.timestamp <= rightX)
    if (zoomedData.length > 0) {
        // Calculate new Y domain based on visible lines
        const activeValues = []
        zoomedData.forEach(d => {
            if (seriesVisibility.highPrice) activeValues.push(d.high)
            if (seriesVisibility.lowPrice) activeValues.push(d.low)
            if (seriesVisibility.sma20 && d.sma20) activeValues.push(d.sma20)
            if (seriesVisibility.ema20 && d.ema20) activeValues.push(d.ema20)
        })
        
        if (activeValues.length > 0) {
            const minP = Math.min(...activeValues)
            const maxP = Math.max(...activeValues)
            const padding = (maxP - minP) * 0.1
            setBottom(minP - padding)
            setTop(maxP + padding)
        }
    }

    setLeft(leftX)
    setRight(rightX)
    setRefAreaLeft('')
    setRefAreaRight('')
  }

  const zoomOut = () => {
    setLeft('dataMin')
    setRight('dataMax')
    setTop('auto')
    setBottom('auto')
    setRefAreaLeft('')
    setRefAreaRight('')
  }

  const commonChartProps = {
    data: chartData,
    margin: { top: 10, right: 0, left: 0, bottom: 0 },
    onMouseDown: (e) => setRefAreaLeft(e?.activePayload?.[0]?.payload?.timestamp),
    onMouseMove: (e) => refAreaLeft && setRefAreaRight(e?.activePayload?.[0]?.payload?.timestamp),
    onMouseUp: zoom,
    onMouseLeave: () => {}
  }

  const handleMouseMove = (e) => {
    if (e?.activePayload?.[0]?.payload) {
        setHoverData(e.activePayload[0].payload)
        if (refAreaLeft) setRefAreaRight(e.activePayload[0].payload.timestamp)
    }
  }

  // Controls UI
  const renderControls = () => (
    <Group spacing="md" noWrap>
        <Popover position="bottom" withArrow shadow="md">
            <Popover.Target>
                <Button variant="subtle" size="xs" leftIcon={<IconFilter size={14} />} compact>
                    Indicators
                </Button>
            </Popover.Target>
            <Popover.Dropdown>
                <Stack spacing="xs">
                    <Checkbox 
                        label={<Text size="sm" color={COLORS.sell}>Sell Price</Text>}
                        checked={seriesVisibility.highPrice}
                        onChange={(e) => setSeriesVisibility(p => ({ ...p, highPrice: e.currentTarget.checked }))}
                    />
                    <Checkbox 
                        label={<Text size="sm" color={COLORS.buy}>Buy Price</Text>}
                        checked={seriesVisibility.lowPrice}
                        onChange={(e) => setSeriesVisibility(p => ({ ...p, lowPrice: e.currentTarget.checked }))}
                    />
                    <Divider my={4} />
                    <Checkbox 
                        label={<Text size="sm" color={COLORS.sma}>SMA (20)</Text>}
                        checked={seriesVisibility.sma20}
                        onChange={(e) => setSeriesVisibility(p => ({ ...p, sma20: e.currentTarget.checked }))}
                    />
                    <Checkbox 
                        label={<Text size="sm" color={COLORS.ema}>EMA (20)</Text>}
                        checked={seriesVisibility.ema20}
                        onChange={(e) => setSeriesVisibility(p => ({ ...p, ema20: e.currentTarget.checked }))}
                    />
                    <Divider my={4} />
                    <Checkbox 
                        label={<Text size="sm" color={COLORS.buy}>Buy Volume</Text>}
                        checked={seriesVisibility.buyVolume}
                        onChange={(e) => setSeriesVisibility(p => ({ ...p, buyVolume: e.currentTarget.checked }))}
                    />
                    <Checkbox 
                        label={<Text size="sm" color={COLORS.sell}>Sell Volume</Text>}
                        checked={seriesVisibility.sellVolume}
                        onChange={(e) => setSeriesVisibility(p => ({ ...p, sellVolume: e.currentTarget.checked }))}
                    />
                    <Divider my={4} />
                    <Checkbox 
                        label={<Text size="sm">Game Updates</Text>}
                        checked={seriesVisibility.updates}
                        onChange={(e) => setSeriesVisibility(p => ({ ...p, updates: e.currentTarget.checked }))}
                    />
                </Stack>
            </Popover.Dropdown>
        </Popover>
    </Group>
  )

  const renderMainChart = () => {
    const yDomain = [bottom === 'auto' ? 'dataMin' : bottom, top === 'auto' ? 'dataMax' : top]

    return (
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart {...commonChartProps} onMouseMove={handleMouseMove}>
            <defs>
              <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.sell} stopOpacity={0.1} />
                <stop offset="95%" stopColor={COLORS.sell} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={COLORS.grid} vertical={false} />
            <XAxis
                dataKey="timestamp" 
                type="number" 
                domain={[left, right]} 
                hide 
                allowDataOverflow
            />
            <YAxis
              orientation="right" 
              domain={yDomain} 
              tick={{ fontSize: 10, fill: COLORS.crosshair }}
              tickFormatter={(value) => new Intl.NumberFormat('en', { notation: 'compact' }).format(value)}
              axisLine={false}
              tickLine={false}
              padding={{ top: 20, bottom: 20 }}
              allowDataOverflow
            />
            <Tooltip content={<></>} cursor={{ stroke: COLORS.crosshair, strokeWidth: 1, strokeDasharray: '4 4' }} />

            {/* High Price (Sell) */}
            {seriesVisibility.highPrice && (
            <Line
              type="monotone"
              dataKey="high"
                    stroke={COLORS.sell}
              strokeWidth={2}
              dot={false}
                    activeDot={{ r: 4, stroke: COLORS.sell, fill: '#1A1B1E' }}
                    isAnimationActive={false}
            />
            )}

            {/* Low Price (Buy) */}
            {seriesVisibility.lowPrice && (
            <Line
              type="monotone"
              dataKey="low"
                    stroke={COLORS.buy}
              strokeWidth={2}
              dot={false}
                    activeDot={{ r: 4, stroke: COLORS.buy, fill: '#1A1B1E' }}
                    isAnimationActive={false}
                />
            )}

            {/* SMA 20 */}
            {seriesVisibility.sma20 && (
                <Line
                    type="monotone"
                    dataKey="sma20"
                    stroke={COLORS.sma}
                    strokeWidth={1.5}
                    dot={false}
                    activeDot={false}
                    isAnimationActive={false}
                />
            )}

            {/* EMA 20 */}
            {seriesVisibility.ema20 && (
                <Line
                    type="monotone"
                    dataKey="ema20"
                    stroke={COLORS.ema}
                    strokeWidth={1.5}
                    dot={false}
                    activeDot={false}
                    isAnimationActive={false}
                />
            )}

             {/* Game Updates (Dots at bottom) */}
             {seriesVisibility.updates && (
                <Scatter 
                    dataKey="update" 
                    fill="#fff"
                    shape={(props) => {
                        const { cx, cy, payload } = props
                        if (!payload.updateData) return null
        return (
                            <circle 
                                cx={cx} 
                                cy={cy} 
                                r={4} 
                                fill={payload.updateData.color} 
                                stroke="#1A1B1E"
                                strokeWidth={1}
                            />
                        )
                    }}
                    yAxisId="updates"
                />
            )}
            
            {/* Hidden Y-Axis for Updates to keep them fixed at the bottom */}
            {/* Domain [0, 10], update=1, so it plots at bottom 10% */}
            <YAxis yAxisId="updates" domain={[0, 10]} hide />

            {refAreaLeft && refAreaRight ? (
              <ReferenceArea x1={refAreaLeft} x2={refAreaRight} strokeOpacity={0.3} fill="#3B82F6" fillOpacity={0.1} />
            ) : null}
          </ComposedChart>
      </ResponsiveContainer>
        )
  }

  const renderVolumeChart = () => {
        return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart {...commonChartProps} onMouseMove={handleMouseMove}>
          <CartesianGrid stroke={COLORS.grid} vertical={false} />
            <XAxis
            dataKey="timestamp" 
            type="number"
            domain={[left, right]}
            tick={{ fontSize: 10, fill: COLORS.crosshair }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(unix) => formatDateForTimeframe(new Date(unix * 1000), range)}
            allowDataOverflow
            minTickGap={30}
            />
            <YAxis
            orientation="right" 
            tick={{ fontSize: 10, fill: COLORS.crosshair }}
            tickFormatter={(value) => new Intl.NumberFormat('en', { notation: 'compact' }).format(value)}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<></>} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
          
          {seriesVisibility.sellVolume && (
            <Bar dataKey="sellVolume" fill={COLORS.sell} stackId="a" opacity={0.8} />
          )}
          {seriesVisibility.buyVolume && (
            <Bar dataKey="buyVolume" fill={COLORS.buy} stackId="a" opacity={0.8} />
          )}
        </BarChart>
      </ResponsiveContainer>
    )
  }

  // Info Panel
  const InfoPanel = ({ data }) => {
    if (!data) return (
        <Stack spacing="xs" p="md" align="center" justify="center" h="100%">
            <Text color="dimmed" size="sm">Hover chart for details</Text>
        </Stack>
    )

    return (
      <Stack spacing="md" p="md" h="100%" style={{ borderLeft: '1px solid rgba(255,255,255,0.05)', overflowY: 'auto' }}>
        <div>
            <Text size="xs" color="dimmed" transform="uppercase" weight={700} spacing={1}>Date</Text>
            <Text size="lg" weight={600} color="white">{data.dateFormatted}</Text>
            <Text size="xs" color="dimmed">{data.dateObj.toLocaleTimeString()}</Text>
        </div>

        <div>
            <Text size="xs" color="dimmed" transform="uppercase" weight={700} spacing={1}>Price</Text>
            <Stack spacing={4}>
                {seriesVisibility.highPrice && (
                    <Group position="apart">
                        <Text size="sm" color={COLORS.sell}>Sell:</Text>
                        <Text size="sm" weight={700} color={COLORS.sell}>
                            {new Intl.NumberFormat().format(data.high)}
                        </Text>
                    </Group>
                )}
                {seriesVisibility.lowPrice && (
                    <Group position="apart">
                        <Text size="sm" color={COLORS.buy}>Buy:</Text>
                        <Text size="sm" weight={700} color={COLORS.buy}>
                            {new Intl.NumberFormat().format(data.low)}
                        </Text>
                    </Group>
                )}
            </Stack>
        </div>

        {(seriesVisibility.sma20 || seriesVisibility.ema20) && (
            <div>
                <Text size="xs" color="dimmed" transform="uppercase" weight={700} spacing={1}>Indicators</Text>
                <Stack spacing={4}>
                    {seriesVisibility.sma20 && data.sma20 && (
                        <Group position="apart">
                            <Text size="sm" color={COLORS.sma}>SMA(20):</Text>
                            <Text size="sm" weight={600} color="white">
                                {new Intl.NumberFormat().format(Math.round(data.sma20))}
                            </Text>
                        </Group>
                    )}
                    {seriesVisibility.ema20 && data.ema20 && (
                        <Group position="apart">
                            <Text size="sm" color={COLORS.ema}>EMA(20):</Text>
                            <Text size="sm" weight={600} color="white">
                                {new Intl.NumberFormat().format(Math.round(data.ema20))}
                            </Text>
                        </Group>
                    )}
                </Stack>
            </div>
        )}

        <div>
            <Text size="xs" color="dimmed" transform="uppercase" weight={700} spacing={1}>Volume</Text>
             <Stack spacing={4}>
                {seriesVisibility.sellVolume && (
                    <Group position="apart">
                        <Text size="sm" color={COLORS.sell}>Sell Vol:</Text>
                        <Text size="sm" weight={600} color="white">
                            {new Intl.NumberFormat().format(data.sellVolume)}
                        </Text>
                    </Group>
                )}
                {seriesVisibility.buyVolume && (
                    <Group position="apart">
                        <Text size="sm" color={COLORS.buy}>Buy Vol:</Text>
                        <Text size="sm" weight={600} color="white">
                            {new Intl.NumberFormat().format(data.buyVolume)}
                        </Text>
                    </Group>
                )}
            </Stack>
        </div>

        {data.updateData && (
            <Box mt="sm" p="xs" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 4 }}>
                <Badge 
                    color={data.updateData.color === COLORS.blog ? 'blue' : 'orange'} 
                    variant="filled" 
                    size="sm" 
                    mb={4}
                >
                    {data.updateData.type}
                </Badge>
                <Text size="sm" weight={600} color="white">{data.updateData.title}</Text>
                <Text size="xs" color="dimmed" mt={2}>{data.updateData.description}</Text>
            </Box>
        )}
      </Stack>
    )
  }

  const rangeOptions = [
    { value: '1D', label: '1D' },
    { value: '1W', label: '1W' },
    { value: '1M', label: '1M' },
    { value: '3M', label: '3M' },
    { value: '6M', label: '6M' },
    { value: '1Y', label: '1Y' },
    { value: 'All', label: 'All' }
  ]

  return (
    <Card shadow="sm" p={0} style={{ height: isFullscreen ? '100vh' : height, backgroundColor: '#1A1B1E' }}>
      <Stack spacing={0} h="100%">
        {/* Header / Controls */}
      {showControls && (
            <Group position="apart" p="xs" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <Group spacing="xs">
                <Text size="sm" weight={600} color="white" mr="xs">
                {item?.name || 'Loading...'}
                </Text>
                {left !== 'dataMin' && (
                    <Button 
                        leftIcon={<IconZoomOut size={12} />} 
                        size="xs" 
                        variant="light" 
                        color="orange" 
                        compact 
                        onClick={zoomOut}
                    >
                        Reset
                    </Button>
                )}
          </Group>

            <Group spacing={4}>
                {rangeOptions.map((opt) => (
                <Button 
                    key={opt.value}
                    size="xs" 
                    variant={range === opt.value ? 'filled' : 'subtle'} 
                    color={range === opt.value ? 'blue' : 'gray'}
                    compact
                    onClick={() => setRange(opt.value)}
                    styles={{ root: { padding: '0 8px', height: 24 } }}
                >
                    {opt.label}
                </Button>
                ))}
                
                <Divider orientation="vertical" h={20} mx={4} />
                
                {renderControls()}

                <Menu shadow="md" width={150} position="bottom-end">
              <Menu.Target>
                    <ActionIcon size="sm" variant="subtle" color="gray">
                  <IconSettings size={16} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  icon={<IconTag size={14} />}
                  onClick={() => setAnnotationModalOpen(true)}
                >
                  Add Annotation
                </Menu.Item>
                <Menu.Item
                  icon={<IconMaximize size={14} />}
                  onClick={() => setIsFullscreen(!isFullscreen)}
                >
                  {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      )}

        {/* Charts Area with Side Panel */}
        <Flex style={{ flex: 1, minHeight: 0 }}>
            {/* Charts Column */}
            <Stack spacing={0} style={{ flex: 1, minHeight: 0, minWidth: 0 }}>
                {/* Price Chart (Top) */}
                <div style={{ flex: 3, width: '100%', minHeight: 0, padding: '10px 0 0 0' }}>
                    {isLoading ? (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Text size="xs" color="dimmed">Loading data...</Text>
        </div>
                    ) : historyData.length === 0 ? (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Text size="xs" color="dimmed">No data available</Text>
          </div>
                    ) : (
                        renderMainChart()
              )}
      </div>

                {/* Volume Chart (Bottom) */}
                <div style={{ flex: 1, width: '100%', minHeight: 0, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    {isLoading ? null : renderVolumeChart()}
                </div>
            </Stack>

            {/* Side Info Panel (Fixed Width) */}
            <Box w={200} style={{ flexShrink: 0, backgroundColor: 'rgba(0,0,0,0.2)' }}>
                <InfoPanel data={hoverData || (chartData.length > 0 ? chartData[chartData.length - 1] : null)} />
            </Box>
        </Flex>
      </Stack>

      <Modal
        opened={annotationModalOpen}
        onClose={() => setAnnotationModalOpen(false)}
        title="Add Annotation"
        size="sm"
        zIndex={200}
      >
        <Stack spacing="sm">
          <TextInput
            label="Title"
            placeholder="Annotation title"
            value={selectedAnnotation?.title ?? ''}
            onChange={(e) => setSelectedAnnotation({ ...selectedAnnotation, title: e.target.value })}
          />
          <Textarea
            label="Description"
            placeholder="Details..."
            value={selectedAnnotation?.description ?? ''}
            onChange={(e) => setSelectedAnnotation({ ...selectedAnnotation, description: e.target.value })}
          />
            <ColorPicker
            value={selectedAnnotation?.color ?? '#339af0'}
            onChange={(color) => setSelectedAnnotation({ ...selectedAnnotation, color })}
          />
          <Group position="right">
            <Button variant="default" onClick={() => setAnnotationModalOpen(false)}>Cancel</Button>
            <Button onClick={() => setAnnotationModalOpen(false)}>Save</Button>
          </Group>
        </Stack>
      </Modal>
    </Card>
  )
}

export default AdvancedChart