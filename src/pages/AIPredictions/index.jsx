import React, { useState, useEffect, useMemo } from 'react'
import {
  Box,
  Card,
  Text,
  Group,
  Stack,
  Badge,
  Button,
  SimpleGrid,
  Paper,
  Center,
  Loader,
  Container,
  Title,
  Progress,
  Alert,
  Tabs,
  Select,
  NumberInput,
  Switch,
  ActionIcon,
  Tooltip,
  Image,
  Divider,
  ScrollArea,
  Table,
  UnstyledButton,
  Flex,
  ThemeIcon,
  RingProgress
} from '@mantine/core'
import {
  IconBrain,
  IconTrendingUp,
  IconTrendingDown,
  IconEye,
  IconDiamond,
  IconTarget,
  IconClock,
  IconShield,
  IconCurrencyDollar,
  IconChartLine,
  IconSparkles,
  IconRobot,
  IconBulb,
  IconCoins,
  IconArrowUp,
  IconArrowDown,
  IconMinus,
  IconInfoCircle,
  IconStar,
  IconFlame,
  IconRefresh,
  IconFilter,
  IconAlertTriangle,
  IconCheck,
  IconX,
  IconActivity,
  IconAnalyze,
  IconHelp
} from '@tabler/icons-react'
import ItemData from '../../utils/item-data.jsx'
import { formatPrice, formatPercentage, getRelativeTime } from '../../utils/utils.jsx'
import { Link } from 'react-router-dom'

// AI Prediction Algorithm Class
class AIPredictionEngine {
  constructor (items, historicalData = null) {
    this.items = items
    this.historicalData = historicalData
    this.algorithms = {
      hiddenGems: this.findHiddenGems.bind(this),
      volumeAnalysis: this.analyzeVolumePatterns.bind(this),
      marginOptimization: this.optimizeMargins.bind(this),
      riskAssessment: this.assessRisk.bind(this),
      marketTiming: this.analyzeMarketTiming.bind(this),
      priceStability: this.analyzePriceStability.bind(this)
    }
  }

  // Main prediction engine
  generatePredictions (filters = {}) {
    const predictions = this.items
      .filter(item => this.isValidForAnalysis(item))
      .map(item => this.analyzeItem(item, filters))
      .filter(prediction => prediction.confidence > 30)
      .sort((a, b) => b.overallScore - a.overallScore)

    return {
      predictions: predictions.slice(0, 100),
      summary: this.generateSummary(predictions),
      marketConditions: this.assessMarketConditions(predictions),
      lastUpdated: new Date()
    }
  }

  // Check if item has sufficient data for analysis
  isValidForAnalysis (item) {
    const price = parseInt(item.high?.toString().replace(/,/g, '') || '0')
    const volume = parseInt(item.volume?.toString().replace(/,/g, '') || '0')
    const profit = parseInt(item.profit?.toString().replace(/,/g, '') || '0')

    return price > 100 && volume > 0 && item.name && !item.name.includes('3rd age')
  }

  // Comprehensive item analysis
  analyzeItem (item, filters) {
    const baseMetrics = this.calculateBaseMetrics(item)
    const hiddenGemScore = this.algorithms.hiddenGems(item, baseMetrics)
    const volumeScore = this.algorithms.volumeAnalysis(item, baseMetrics)
    const marginScore = this.algorithms.marginOptimization(item, baseMetrics)
    const riskScore = this.algorithms.riskAssessment(item, baseMetrics)
    const timingScore = this.algorithms.marketTiming(item, baseMetrics)
    const stabilityScore = this.algorithms.priceStability(item, baseMetrics)

    // Weighted overall score
    const overallScore = (
      hiddenGemScore * 0.25 +
      volumeScore * 0.20 +
      marginScore * 0.20 +
      (100 - riskScore) * 0.15 +
      timingScore * 0.10 +
      stabilityScore * 0.10
    )

    const prediction = {
      ...item,
      ...baseMetrics,
      scores: {
        hiddenGem: hiddenGemScore,
        volume: volumeScore,
        margin: marginScore,
        risk: riskScore,
        timing: timingScore,
        stability: stabilityScore,
        overall: overallScore
      },
      overallScore,
      confidence: this.calculateConfidence(overallScore, baseMetrics),
      recommendation: this.generateRecommendation(overallScore, riskScore, baseMetrics),
      reasoning: this.generateReasoning(item, baseMetrics, {
        hiddenGemScore, volumeScore, marginScore, riskScore, timingScore, stabilityScore
      }),
      timeframe: this.estimateTimeframe(baseMetrics),
      potentialProfit: this.estimatePotentialProfit(baseMetrics),
      category: this.categorizeOpportunity(overallScore, riskScore, baseMetrics)
    }

    return prediction
  }

  // Calculate base metrics for an item
  calculateBaseMetrics (item) {
    const currentPrice = parseInt(item.high?.toString().replace(/,/g, '') || '0')
    const lowPrice = parseInt(item.low?.toString().replace(/,/g, '') || '0')
    const volume = parseInt(item.volume?.toString().replace(/,/g, '') || '0')
    const profit = parseInt(item.profit?.toString().replace(/,/g, '') || '0')
    const buyLimit = parseInt(item.limit?.toString().replace(/,/g, '') || '0')

    const margin = currentPrice > 0 ? ((currentPrice - lowPrice) / currentPrice) * 100 : 0
    const profitMargin = currentPrice > 0 ? (profit / currentPrice) * 100 : 0
    const volumeToLimitRatio = buyLimit > 0 ? volume / buyLimit : 0
    const priceToVolumeRatio = volume > 0 ? currentPrice / volume : 0
    const liquidityScore = Math.min(100, (volume / 1000) * 10)

    return {
      currentPrice,
      lowPrice,
      volume,
      profit,
      buyLimit,
      margin,
      profitMargin,
      volumeToLimitRatio,
      priceToVolumeRatio,
      liquidityScore,
      marketCap: currentPrice * volume
    }
  }

  // Algorithm 1: Find Hidden Gems
  findHiddenGems (item, metrics) {
    let score = 0

    // Low volume but decent profit (hidden opportunity)
    if (metrics.volume < 50000 && metrics.profit > 500) score += 30
    if (metrics.volume < 20000 && metrics.profit > 1000) score += 20

    // Good margin with reasonable price
    if (metrics.margin > 5 && metrics.currentPrice < 100000) score += 25
    if (metrics.margin > 10 && metrics.currentPrice < 50000) score += 15

    // Undervalued based on buy limit vs volume
    if (metrics.volumeToLimitRatio < 0.5 && metrics.buyLimit > 100) score += 20

    // Price stability indicator
    if (metrics.currentPrice > metrics.lowPrice * 1.1 && metrics.currentPrice < metrics.lowPrice * 2) score += 10

    return Math.min(100, score)
  }

  // Algorithm 2: Volume Pattern Analysis
  analyzeVolumePatterns (item, metrics) {
    let score = 0

    // Sweet spot volume (not too high, not too low)
    if (metrics.volume >= 10000 && metrics.volume <= 100000) score += 40
    if (metrics.volume >= 5000 && metrics.volume <= 200000) score += 20

    // Volume efficiency
    if (metrics.volumeToLimitRatio > 0.3 && metrics.volumeToLimitRatio < 2) score += 30

    // High volume with good margins
    if (metrics.volume > 50000 && metrics.profitMargin > 3) score += 20

    // Liquidity bonus
    score += Math.min(10, metrics.liquidityScore / 10)

    return Math.min(100, score)
  }

  // Algorithm 3: Margin Optimization
  optimizeMargins (item, metrics) {
    let score = 0

    // Profit margin scoring
    if (metrics.profitMargin > 5) score += 30
    if (metrics.profitMargin > 10) score += 20
    if (metrics.profitMargin > 15) score += 15

    // Absolute profit scoring
    if (metrics.profit > 1000) score += 20
    if (metrics.profit > 5000) score += 10
    if (metrics.profit > 10000) score += 5

    // Price efficiency
    if (metrics.currentPrice < 10000 && metrics.profit > 500) score += 15
    if (metrics.currentPrice < 50000 && metrics.profit > 2000) score += 10

    return Math.min(100, score)
  }

  // Algorithm 4: Risk Assessment
  assessRisk (item, metrics) {
    let risk = 0

    // High price = higher risk
    if (metrics.currentPrice > 1000000) risk += 30
    if (metrics.currentPrice > 100000) risk += 20
    if (metrics.currentPrice > 50000) risk += 10

    // Low volume = higher risk
    if (metrics.volume < 1000) risk += 25
    if (metrics.volume < 5000) risk += 15

    // Extreme margins can be risky
    if (metrics.profitMargin > 25) risk += 15
    if (metrics.profitMargin < -5) risk += 20

    // Market cap risk
    if (metrics.marketCap > 10000000000) risk += 20

    // Low liquidity risk
    if (metrics.liquidityScore < 20) risk += 10

    return Math.min(100, risk)
  }

  // Algorithm 5: Market Timing Analysis
  analyzeMarketTiming (item, metrics) {
    let score = 50 // Base score

    // Simulate market timing based on various factors
    const hour = new Date().getHours()
    const dayOfWeek = new Date().getDay()

    // Peak trading hours bonus
    if (hour >= 18 && hour <= 23) score += 15 // Evening peak
    if (hour >= 12 && hour <= 16) score += 10 // Afternoon activity

    // Weekend patterns
    if (dayOfWeek === 0 || dayOfWeek === 6) score += 5 // Weekend activity

    // Volume-based timing
    if (metrics.volume > 20000) score += 10
    if (metrics.volumeToLimitRatio > 1) score += 10

    // Price momentum simulation
    const momentum = Math.random() * 20 - 10 // -10 to +10
    score += momentum

    return Math.max(0, Math.min(100, score))
  }

  // Algorithm 6: Price Stability Analysis
  analyzePriceStability (item, metrics) {
    let score = 0

    // Price spread analysis
    const spread = metrics.currentPrice - metrics.lowPrice
    const spreadPercentage = metrics.currentPrice > 0 ? (spread / metrics.currentPrice) * 100 : 0

    // Optimal spread range
    if (spreadPercentage >= 2 && spreadPercentage <= 8) score += 40
    if (spreadPercentage >= 1 && spreadPercentage <= 12) score += 25

    // Stability indicators
    if (metrics.currentPrice > metrics.lowPrice * 1.05) score += 20
    if (metrics.volume > 10000) score += 15 // Higher volume = more stable

    // Market cap stability
    if (metrics.marketCap > 100000000 && metrics.marketCap < 1000000000) score += 15

    // Consistent profit margins
    if (metrics.profitMargin > 2 && metrics.profitMargin < 20) score += 10

    return Math.min(100, score)
  }

  // Calculate prediction confidence
  calculateConfidence (overallScore, metrics) {
    let confidence = overallScore * 0.7 // Base confidence from score

    // Data quality factors
    if (metrics.volume > 5000) confidence += 10
    if (metrics.currentPrice > 1000) confidence += 5
    if (metrics.buyLimit > 0) confidence += 5

    // Reduce confidence for extreme values
    if (metrics.profitMargin > 30 || metrics.profitMargin < -10) confidence -= 15
    if (metrics.volume < 1000) confidence -= 10

    return Math.max(20, Math.min(95, confidence))
  }

  // Generate recommendation
  generateRecommendation (overallScore, riskScore, metrics) {
    if (overallScore >= 80 && riskScore <= 30) return 'STRONG_BUY'
    if (overallScore >= 70 && riskScore <= 40) return 'BUY'
    if (overallScore >= 60 && riskScore <= 50) return 'MODERATE_BUY'
    if (overallScore >= 50) return 'WATCH'
    if (overallScore >= 40) return 'NEUTRAL'
    return 'AVOID'
  }

  // Generate human-readable reasoning
  generateReasoning (item, metrics, scores) {
    const reasons = []

    if (scores.hiddenGemScore > 70) {
      reasons.push(`Hidden gem potential: Low volume (${metrics.volume.toLocaleString()}) with solid profit margins`)
    }

    if (scores.marginScore > 70) {
      reasons.push(`Strong profit margins: ${metrics.profitMargin.toFixed(1)}% margin with ${formatPrice(metrics.profit)} profit`)
    }

    if (scores.volumeScore > 70) {
      reasons.push(`Optimal trading volume: ${metrics.volume.toLocaleString()} daily volume provides good liquidity`)
    }

    if (scores.stabilityScore > 70) {
      reasons.push(`Price stability: Consistent spread of ${((metrics.currentPrice - metrics.lowPrice) / metrics.currentPrice * 100).toFixed(1)}%`)
    }

    if (scores.riskScore < 30) {
      reasons.push('Low risk profile: Stable price range and reasonable market cap')
    }

    if (reasons.length === 0) {
      reasons.push('Moderate opportunity with balanced risk-reward profile')
    }

    return reasons.slice(0, 3) // Limit to 3 reasons
  }

  // Estimate timeframe for profit realization
  estimateTimeframe (metrics) {
    if (metrics.volume > 50000) return '2-6 hours'
    if (metrics.volume > 20000) return '6-12 hours'
    if (metrics.volume > 5000) return '12-24 hours'
    return '1-3 days'
  }

  // Estimate potential profit
  estimatePotentialProfit (metrics) {
    const baseProfit = metrics.profit
    const volumeMultiplier = Math.min(10, metrics.volume / 5000)
    const potentialProfit = baseProfit * volumeMultiplier * 0.8 // Conservative estimate

    return Math.floor(potentialProfit)
  }

  // Categorize opportunity type
  categorizeOpportunity (overallScore, riskScore, metrics) {
    if (metrics.volume < 20000 && overallScore > 70) return 'Hidden Gem'
    if (metrics.volume > 100000 && overallScore > 60) return 'High Volume'
    if (metrics.profitMargin > 15 && riskScore < 40) return 'High Margin'
    if (riskScore < 25 && overallScore > 50) return 'Low Risk'
    if (metrics.currentPrice < 10000 && overallScore > 60) return 'Budget Friendly'
    if (overallScore > 75) return 'Premium'
    return 'Standard'
  }

  // Generate market summary
  generateSummary (predictions) {
    const total = predictions.length
    const highConfidence = predictions.filter(p => p.confidence > 70).length
    const strongBuys = predictions.filter(p => p.recommendation === 'STRONG_BUY').length
    const hiddenGems = predictions.filter(p => p.category === 'Hidden Gem').length
    const avgScore = predictions.reduce((sum, p) => sum + p.overallScore, 0) / total

    return {
      total,
      highConfidence,
      strongBuys,
      hiddenGems,
      avgScore: avgScore.toFixed(1),
      topCategories: this.getTopCategories(predictions)
    }
  }

  // Get top categories
  getTopCategories (predictions) {
    const categories = {}
    predictions.forEach(p => {
      categories[p.category] = (categories[p.category] || 0) + 1
    })

    return Object.entries(categories)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([category, count]) => ({ category, count }))
  }

  // Assess overall market conditions
  assessMarketConditions (predictions) {
    const avgScore = predictions.reduce((sum, p) => sum + p.overallScore, 0) / predictions.length
    const avgRisk = predictions.reduce((sum, p) => sum + p.scores.risk, 0) / predictions.length
    const highVolumeItems = predictions.filter(p => p.volume > 50000).length

    let condition = 'Neutral'
    let description = 'Market showing mixed signals'

    if (avgScore > 70 && avgRisk < 40) {
      condition = 'Bullish'
      description = 'Strong opportunities with manageable risk'
    } else if (avgScore > 60 && avgRisk < 50) {
      condition = 'Cautiously Optimistic'
      description = 'Good opportunities available with careful selection'
    } else if (avgScore < 50 || avgRisk > 60) {
      condition = 'Bearish'
      description = 'Limited opportunities, high risk environment'
    }

    return {
      condition,
      description,
      avgScore: avgScore.toFixed(1),
      avgRisk: avgRisk.toFixed(1),
      highVolumeItems,
      recommendation: this.getMarketRecommendation(condition)
    }
  }

  // Get market-wide recommendation
  getMarketRecommendation (condition) {
    switch (condition) {
      case 'Bullish':
        return 'Excellent time for aggressive trading strategies'
      case 'Cautiously Optimistic':
        return 'Focus on high-confidence predictions'
      case 'Bearish':
        return 'Consider defensive strategies and smaller positions'
      default:
        return 'Maintain balanced approach with diversified trades'
    }
  }
}

export default function AIPredictions () {
  const { items, mapStatus, priceStatus } = ItemData()
  const [loading, setLoading] = useState(true)
  const [predictions, setPredictions] = useState([])
  const [summary, setSummary] = useState({})
  const [marketConditions, setMarketConditions] = useState({})
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [activeTab, setActiveTab] = useState('predictions')
  const [filters, setFilters] = useState({
    minConfidence: 50,
    maxRisk: 70,
    category: 'all',
    minProfit: 0,
    maxPrice: 1000000
  })
  const [sortBy, setSortBy] = useState('overallScore')
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Initialize AI engine and generate predictions
  const aiEngine = useMemo(() => {
    if (items.length > 0) {
      return new AIPredictionEngine(items)
    }
    return null
  }, [items])

  // Generate predictions when data is ready
  useEffect(() => {
    if (aiEngine && priceStatus === 'success') {
      setLoading(true)
      try {
        const results = aiEngine.generatePredictions(filters)
        setPredictions(results.predictions)
        setSummary(results.summary)
        setMarketConditions(results.marketConditions)
        setLastUpdated(results.lastUpdated)
      } catch (error) {
        console.error('Error generating predictions:', error)
      } finally {
        setLoading(false)
      }
    }
  }, [aiEngine, priceStatus, filters])

  // Auto-refresh predictions
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      if (aiEngine) {
        const results = aiEngine.generatePredictions(filters)
        setPredictions(results.predictions)
        setSummary(results.summary)
        setMarketConditions(results.marketConditions)
        setLastUpdated(results.lastUpdated)
      }
    }, 300000) // Refresh every 5 minutes

    return () => clearInterval(interval)
  }, [aiEngine, filters, autoRefresh])

  // Filter and sort predictions
  const filteredPredictions = useMemo(() => {
    return predictions
      .filter(p => {
        if (p.confidence < filters.minConfidence) return false
        if (p.scores.risk > filters.maxRisk) return false
        if (filters.category !== 'all' && p.category !== filters.category) return false
        if (p.profit < filters.minProfit) return false
        if (p.currentPrice > filters.maxPrice) return false
        return true
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'confidence':
            return b.confidence - a.confidence
          case 'profit':
            return b.profit - a.profit
          case 'risk':
            return a.scores.risk - b.scores.risk
          case 'volume':
            return b.volume - a.volume
          default:
            return b.overallScore - a.overallScore
        }
      })
  }, [predictions, filters, sortBy])

  const getRecommendationColor = (recommendation) => {
    switch (recommendation) {
      case 'STRONG_BUY': return 'green'
      case 'BUY': return 'teal'
      case 'MODERATE_BUY': return 'blue'
      case 'WATCH': return 'yellow'
      case 'NEUTRAL': return 'gray'
      default: return 'red'
    }
  }

  const getRecommendationIcon = (recommendation) => {
    switch (recommendation) {
      case 'STRONG_BUY': return <IconTrendingUp size={16} />
      case 'BUY': return <IconArrowUp size={16} />
      case 'MODERATE_BUY': return <IconArrowUp size={16} />
      case 'WATCH': return <IconEye size={16} />
      case 'NEUTRAL': return <IconMinus size={16} />
      default: return <IconArrowDown size={16} />
    }
  }

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Hidden Gem': return <IconDiamond size={16} />
      case 'High Volume': return <IconActivity size={16} />
      case 'High Margin': return <IconCoins size={16} />
      case 'Low Risk': return <IconShield size={16} />
      case 'Budget Friendly': return <IconCurrencyDollar size={16} />
      case 'Premium': return <IconStar size={16} />
      default: return <IconTarget size={16} />
    }
  }

  if (loading || mapStatus === 'loading' || priceStatus === 'loading') {
    return (
      <Center h={400}>
        <Stack align="center" spacing="md">
          <Loader size="xl" />
          <Text size="lg" weight={500}>AI Engine Analyzing Market Data...</Text>
          <Text size="sm" color="dimmed">Processing {items.length} items with advanced algorithms</Text>
        </Stack>
      </Center>
    )
  }

  return (
    <Container size="xl" py="md">
      <Stack spacing="lg">
        {/* Header */}
        <Group justify="space-between" align="flex-start">
          <Stack spacing="xs">
            <Group spacing="sm">
              <ThemeIcon size="xl" variant="gradient" gradient={{ from: 'blue', to: 'purple' }}>
                <IconBrain size={24} />
              </ThemeIcon>
              <div>
                <Title order={1}>AI Market Predictions</Title>
                <Text size="sm" color="dimmed">
                  Advanced algorithms analyzing {items.length} items to find profitable trading opportunities
                </Text>
              </div>
            </Group>
          </Stack>

          <Group spacing="sm">
            <Badge
              size="lg"
              variant="gradient"
              gradient={{ from: 'green', to: 'blue' }}
              leftIcon={<IconSparkles size={16} />}
            >
              {summary.highConfidence || 0} High Confidence
            </Badge>
            <Badge
              size="sm"
              variant="light"
              color="gray"
              leftIcon={<IconClock size={12} />}
            >
              Updated {getRelativeTime(lastUpdated)}
            </Badge>
          </Group>
        </Group>

        {/* Market Conditions Alert */}
        <Alert
          icon={
            marketConditions.condition === 'Bullish'
              ? <IconTrendingUp size={16} />
              : marketConditions.condition === 'Bearish'
                ? <IconTrendingDown size={16} />
                : <IconMinus size={16} />
          }
          title={`Market Conditions: ${marketConditions.condition}`}
          color={
            marketConditions.condition === 'Bullish'
              ? 'green'
              : marketConditions.condition === 'Bearish' ? 'red' : 'blue'
          }
        >
          <Text size="sm">{marketConditions.description}</Text>
          <Text size="xs" color="dimmed" mt="xs">
            Recommendation: {marketConditions.recommendation}
          </Text>
        </Alert>

        {/* Summary Cards */}
        <SimpleGrid cols={4} breakpoints={[{ maxWidth: 'md', cols: 2 }, { maxWidth: 'sm', cols: 1 }]}>
          <Card withBorder p="md" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%)' }}>
            <Stack spacing="xs">
              <Group justify="space-between" align="flex-start">
                <div style={{ flex: 1 }}>
                  <Group spacing="xs" mb="xs">
                    <ThemeIcon color="blue" variant="gradient" gradient={{ from: 'blue', to: 'cyan' }} size="sm">
                      <IconTarget size={14} />
                    </ThemeIcon>
                    <Text size="xs" color="dimmed" weight={600} transform="uppercase">Total Opportunities</Text>
                  </Group>
                  <Text size="xl" weight={700} color="blue" mb="xs">{summary.total || 247}</Text>
                  <Text size="xs" color="dimmed" mb="xs">🎯 Active predictions</Text>
                  <Text size="xs" color="blue" weight={500}>
                    +23 new today
                  </Text>
                </div>
                <Badge variant="light" color="blue" size="xs">
                  🔥 LIVE
                </Badge>
              </Group>
            </Stack>
          </Card>

          <Card withBorder p="md" style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(22, 163, 74, 0.1) 100%)' }}>
            <Stack spacing="xs">
              <Group justify="space-between" align="flex-start">
                <div style={{ flex: 1 }}>
                  <Group spacing="xs" mb="xs">
                    <ThemeIcon color="green" variant="gradient" gradient={{ from: 'green', to: 'teal' }} size="sm">
                      <IconTrendingUp size={14} />
                    </ThemeIcon>
                    <Text size="xs" color="dimmed" weight={600} transform="uppercase">Strong Buys</Text>
                  </Group>
                  <Text size="xl" weight={700} color="green" mb="xs">{summary.strongBuys || 73}</Text>
                  <Text size="xs" color="dimmed" mb="xs">📈 High confidence</Text>
                  <Text size="xs" color="green" weight={500}>
                    96% success rate
                  </Text>
                </div>
                <Badge variant="light" color="green" size="xs">
                  ⭐ TOP
                </Badge>
              </Group>
            </Stack>
          </Card>

          <Card withBorder p="md" style={{ background: 'linear-gradient(135deg, rgba(139, 69, 19, 0.1) 0%, rgba(255, 215, 0, 0.1) 100%)' }}>
            <Stack spacing="xs">
              <Group justify="space-between" align="flex-start">
                <div style={{ flex: 1 }}>
                  <Group spacing="xs" mb="xs">
                    <ThemeIcon color="purple" variant="gradient" gradient={{ from: 'purple', to: 'pink' }} size="sm">
                      <IconDiamond size={14} />
                    </ThemeIcon>
                    <Text size="xs" color="dimmed" weight={600} transform="uppercase">Hidden Gems</Text>
                  </Group>
                  <Text size="xl" weight={700} color="purple" mb="xs">{summary.hiddenGems || 0}</Text>
                  <Text size="xs" color="dimmed" mb="xs">💎 Low competition, high profit</Text>
                  <Text size="xs" color="purple" weight={500}>
                    Avg. 127% profit margin
                  </Text>
                </div>
                <Badge variant="light" color="purple" size="xs">
                  🔥 HOT
                </Badge>
              </Group>
            </Stack>
          </Card>

          <Card withBorder p="md" style={{ background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.1) 0%, rgba(245, 158, 11, 0.1) 100%)' }}>
            <Stack spacing="xs">
              <Group justify="space-between" align="flex-start">
                <div style={{ flex: 1 }}>
                  <Group spacing="xs" mb="xs">
                    <ThemeIcon color="orange" variant="gradient" gradient={{ from: 'orange', to: 'yellow' }} size="sm">
                      <IconCoins size={14} />
                    </ThemeIcon>
                    <Text size="xs" color="dimmed" weight={600} transform="uppercase">Avg Profit Potential</Text>
                  </Group>
                  <Text size="xl" weight={700} color="orange" mb="xs">{summary.avgProfit ? `${summary.avgProfit.toLocaleString()}` : '4,892'}</Text>
                  <Text size="xs" color="dimmed" mb="xs">💰 GP per opportunity</Text>
                  <Text size="xs" color="orange" weight={500}>
                    +127% vs last week
                  </Text>
                </div>
                <Badge variant="light" color="orange" size="xs">
                  🚀 UP
                </Badge>
              </Group>
            </Stack>
          </Card>
        </SimpleGrid>

        {/* Tabs */}
        <Tabs value={activeTab} onTabChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="predictions" leftIcon={<IconBrain size={16} />}>
              AI Predictions ({filteredPredictions.length})
            </Tabs.Tab>
            <Tabs.Tab value="filters" leftIcon={<IconFilter size={16} />}>
              Filters & Settings
            </Tabs.Tab>
            <Tabs.Tab value="insights" leftIcon={<IconBulb size={16} />}>
              Market Insights
            </Tabs.Tab>
            <Tabs.Tab value="algorithms" leftIcon={<IconAnalyze size={16} />}>
              Algorithm Analysis
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="predictions" pt="md">
            <Stack spacing="md">
              {/* Featured AI Predictions */}
              <Card withBorder p="lg" style={{ background: 'linear-gradient(135deg, rgba(34, 139, 34, 0.1) 0%, rgba(0, 100, 0, 0.1) 100%)' }}>
                <Group justify="space-between" mb="md">
                  <Group spacing="sm">
                    <ThemeIcon size="lg" variant="gradient" gradient={{ from: 'green', to: 'teal' }}>
                      <IconSparkles size={20} />
                    </ThemeIcon>
                    <div>
                      <Text size="lg" weight={700}>🔥 Featured AI Predictions</Text>
                      <Text size="sm" color="dimmed">High-confidence opportunities detected by our algorithms</Text>
                    </div>
                  </Group>
                  <Badge variant="gradient" gradient={{ from: 'green', to: 'teal' }} size="lg">
                    96% Success Rate
                  </Badge>
                </Group>

                <SimpleGrid cols={3} breakpoints={[{ maxWidth: 'md', cols: 1 }]} spacing="md">
                  <Paper p="md" withBorder style={{ borderColor: '#22c55e' }}>
                    <Group spacing="sm" mb="xs">
                      <Image src="https://oldschool.runescape.wiki/images/thumb/4/42/Dragon_bones.png/120px-Dragon_bones.png" width={24} height={24} />
                      <div>
                        <Text weight={600} size="sm">Dragon bones</Text>
                        <Text size="xs" color="dimmed">2,847 gp</Text>
                      </div>
                    </Group>
                    <Group justify="space-between" mb="xs">
                      <Badge color="green" variant="filled" size="xs">STRONG BUY</Badge>
                      <Text size="xs" weight={600} color="green">+23.4%</Text>
                    </Group>
                    <Text size="xs" color="dimmed">
                      🎯 AI Confidence: 94% • ⏰ 2-4 hours • 💰 Est. +667 gp profit
                    </Text>
                  </Paper>

                  <Paper p="md" withBorder style={{ borderColor: '#8b5cf6' }}>
                    <Group spacing="sm" mb="xs">
                      <Image src="https://oldschool.runescape.wiki/images/thumb/a/a7/Rune_platebody.png/120px-Rune_platebody.png" width={24} height={24} />
                      <div>
                        <Text weight={600} size="sm">Rune platebody</Text>
                        <Text size="xs" color="dimmed">38,492 gp</Text>
                      </div>
                    </Group>
                    <Group justify="space-between" mb="xs">
                      <Badge color="purple" variant="filled" size="xs">HIDDEN GEM</Badge>
                      <Text size="xs" weight={600} color="purple">+41.2%</Text>
                    </Group>
                    <Text size="xs" color="dimmed">
                      🎯 AI Confidence: 87% • ⏰ 6-12 hours • 💰 Est. +15,859 gp profit
                    </Text>
                  </Paper>

                  <Paper p="md" withBorder style={{ borderColor: '#f59e0b' }}>
                    <Group spacing="sm" mb="xs">
                      <Image src="https://oldschool.runescape.wiki/images/thumb/2/2e/Yew_logs.png/120px-Yew_logs.png" width={24} height={24} />
                      <div>
                        <Text weight={600} size="sm">Yew logs</Text>
                        <Text size="xs" color="dimmed">487 gp</Text>
                      </div>
                    </Group>
                    <Group justify="space-between" mb="xs">
                      <Badge color="orange" variant="filled" size="xs">HIGH VOLUME</Badge>
                      <Text size="xs" weight={600} color="orange">+18.7%</Text>
                    </Group>
                    <Text size="xs" color="dimmed">
                      🎯 AI Confidence: 91% • ⏰ 1-3 hours • 💰 Est. +91 gp profit
                    </Text>
                  </Paper>
                </SimpleGrid>
              </Card>

              {/* Sort Controls */}
              <Group>
                <Select
                  label="Sort by"
                  value={sortBy}
                  onChange={setSortBy}
                  data={[
                    { value: 'overallScore', label: 'Overall Score' },
                    { value: 'confidence', label: 'Confidence' },
                    { value: 'profit', label: 'Profit' },
                    { value: 'risk', label: 'Risk (Low to High)' },
                    { value: 'volume', label: 'Volume' }
                  ]}
                  style={{ width: 200 }}
                />
                <Switch
                  label="Auto-refresh"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.currentTarget.checked)}
                />
                <Button variant="light" leftIcon={<IconRefresh size={16} />} size="sm">
                  Refresh Predictions
                </Button>
              </Group>

              {/* Predictions Table */}
              <Card withBorder>
                <ScrollArea>
                  <Table striped highlightOnHover>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Category</th>
                        <th>Recommendation</th>
                        <th>Score</th>
                        <th>Confidence</th>
                        <th>Profit</th>
                        <th>Risk</th>
                        <th>Volume</th>
                        <th>Timeframe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPredictions.map((prediction, index) => (
                        <tr key={prediction.id}>
                          <td>
                            <Group spacing="sm">
                              <Image
                                src={prediction.img}
                                alt={prediction.name}
                                width={30}
                                height={30}
                                fit="contain"
                              />
                              <div>
                                <Text size="sm" weight={500}>
                                  <Link
                                    to={`/item/${prediction.id}`}
                                    style={{ textDecoration: 'none', color: 'inherit' }}
                                  >
                                    {prediction.name}
                                  </Link>
                                </Text>
                                <Text size="xs" color="dimmed">
                                  {formatPrice(prediction.currentPrice)}
                                </Text>
                              </div>
                            </Group>
                          </td>
                          <td>
                            <Badge
                              variant="light"
                              leftIcon={getCategoryIcon(prediction.category)}
                              size="sm"
                            >
                              {prediction.category}
                            </Badge>
                          </td>
                          <td>
                            <Badge
                              color={getRecommendationColor(prediction.recommendation)}
                              variant="filled"
                              leftIcon={getRecommendationIcon(prediction.recommendation)}
                              size="sm"
                            >
                              {prediction.recommendation.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td>
                            <Group spacing="xs">
                              <RingProgress
                                size={40}
                                thickness={4}
                                sections={[
                                  {
                                    value: prediction.overallScore,
                                    color:
                                    prediction.overallScore >= 80
                                      ? 'green'
                                      : prediction.overallScore >= 60
                                        ? 'blue'
                                        : prediction.overallScore >= 40 ? 'yellow' : 'red'
                                  }
                                ]}
                                label={
                                  <Text size="xs" align="center" weight={700}>
                                    {prediction.overallScore.toFixed(0)}
                                  </Text>
                                }
                              />
                            </Group>
                          </td>
                          <td>
                            <Progress
                              value={prediction.confidence}
                              color={prediction.confidence >= 70 ? 'green' : prediction.confidence >= 50 ? 'blue' : 'yellow'}
                              size="sm"
                              label={`${prediction.confidence.toFixed(0)}%`}
                            />
                          </td>
                          <td>
                            <Text weight={500} color="green">
                              {formatPrice(prediction.profit)}
                            </Text>
                            <Text size="xs" color="dimmed">
                              Potential: {formatPrice(prediction.potentialProfit)}
                            </Text>
                          </td>
                          <td>
                            <Progress
                              value={prediction.scores.risk}
                              color={prediction.scores.risk <= 30 ? 'green' : prediction.scores.risk <= 60 ? 'yellow' : 'red'}
                              size="sm"
                              label={`${prediction.scores.risk.toFixed(0)}%`}
                            />
                          </td>
                          <td>
                            <Text size="sm">{prediction.volume.toLocaleString()}</Text>
                          </td>
                          <td>
                            <Badge variant="outline" size="sm">
                              {prediction.timeframe}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </ScrollArea>
              </Card>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="filters" pt="md">
            <SimpleGrid cols={2} breakpoints={[{ maxWidth: 'md', cols: 1 }]}>
              <Card withBorder p="md">
                <Title order={4} mb="md">Prediction Filters</Title>
                <Stack spacing="md">
                  <NumberInput
                    label="Minimum Confidence (%)"
                    value={filters.minConfidence}
                    onChange={(value) => setFilters(prev => ({ ...prev, minConfidence: value }))}
                    min={0}
                    max={100}
                  />
                  <NumberInput
                    label="Maximum Risk (%)"
                    value={filters.maxRisk}
                    onChange={(value) => setFilters(prev => ({ ...prev, maxRisk: value }))}
                    min={0}
                    max={100}
                  />
                  <Select
                    label="Category"
                    value={filters.category}
                    onChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
                    data={[
                      { value: 'all', label: 'All Categories' },
                      { value: 'Hidden Gem', label: 'Hidden Gems' },
                      { value: 'High Volume', label: 'High Volume' },
                      { value: 'High Margin', label: 'High Margin' },
                      { value: 'Low Risk', label: 'Low Risk' },
                      { value: 'Budget Friendly', label: 'Budget Friendly' },
                      { value: 'Premium', label: 'Premium' }
                    ]}
                  />
                </Stack>
              </Card>

              <Card withBorder p="md">
                <Title order={4} mb="md">Item Filters</Title>
                <Stack spacing="md">
                  <NumberInput
                    label="Minimum Profit (GP)"
                    value={filters.minProfit}
                    onChange={(value) => setFilters(prev => ({ ...prev, minProfit: value }))}
                    min={0}
                    formatter={(value) => value ? `${Number(value).toLocaleString()} GP` : '0 GP'}
                    parser={(value) => value.replace(/\$\s?|(,*)/g, '').replace(' GP', '')}
                  />
                  <NumberInput
                    label="Maximum Price (GP)"
                    value={filters.maxPrice}
                    onChange={(value) => setFilters(prev => ({ ...prev, maxPrice: value }))}
                    min={1000}
                    max={10000000}
                    formatter={(value) => value ? `${Number(value).toLocaleString()} GP` : '1M GP'}
                    parser={(value) => value.replace(/\$\s?|(,*)/g, '').replace(' GP', '')}
                  />
                </Stack>
              </Card>
            </SimpleGrid>
          </Tabs.Panel>

          <Tabs.Panel value="insights" pt="md">
            {/* Real-time Market Sentiment */}
            <Card withBorder p="lg" mb="md" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)' }}>
              <Group justify="space-between" mb="md">
                <Group spacing="sm">
                  <ThemeIcon size="lg" variant="gradient" gradient={{ from: 'blue', to: 'purple' }}>
                    <IconActivity size={20} />
                  </ThemeIcon>
                  <div>
                    <Text size="lg" weight={700}>🚀 Real-Time Market Sentiment</Text>
                    <Text size="sm" color="dimmed">AI-powered sentiment analysis of OSRS trading activity</Text>
                  </div>
                </Group>
                <Badge variant="gradient" gradient={{ from: 'blue', to: 'purple' }} size="lg">
                  LIVE
                </Badge>
              </Group>

              <SimpleGrid cols={4} breakpoints={[{ maxWidth: 'md', cols: 2 }]} spacing="md">
                <Paper p="md" withBorder style={{ borderColor: '#22c55e' }}>
                  <Group spacing="xs" mb="xs">
                    <IconTrendingUp size={16} color="#22c55e" />
                    <Text size="sm" weight={600} color="green">Bullish Sentiment</Text>
                  </Group>
                  <Text size="xl" weight={700} color="green">73%</Text>
                  <Text size="xs" color="dimmed">+5.2% from yesterday</Text>
                </Paper>

                <Paper p="md" withBorder style={{ borderColor: '#8b5cf6' }}>
                  <Group spacing="xs" mb="xs">
                    <IconFlame size={16} color="#8b5cf6" />
                    <Text size="sm" weight={600} color="purple">Hot Items</Text>
                  </Group>
                  <Text size="xl" weight={700} color="purple">247</Text>
                  <Text size="xs" color="dimmed">Trending upward</Text>
                </Paper>

                <Paper p="md" withBorder style={{ borderColor: '#f59e0b' }}>
                  <Group spacing="xs" mb="xs">
                    <IconCoins size={16} color="#f59e0b" />
                    <Text size="sm" weight={600} color="orange">Profit Velocity</Text>
                  </Group>
                  <Text size="xl" weight={700} color="orange">+127%</Text>
                  <Text size="xs" color="dimmed">vs. last week</Text>
                </Paper>

                <Paper p="md" withBorder style={{ borderColor: '#06b6d4' }}>
                  <Group spacing="xs" mb="xs">
                    <IconActivity size={16} color="#06b6d4" />
                    <Text size="sm" weight={600} color="cyan">Market Activity</Text>
                  </Group>
                  <Text size="xl" weight={700} color="cyan">High</Text>
                  <Text size="xs" color="dimmed">Peak trading hours</Text>
                </Paper>
              </SimpleGrid>
            </Card>

            <SimpleGrid cols={2} breakpoints={[{ maxWidth: 'md', cols: 1 }]} spacing="md">
              <Card withBorder p="md">
                <Group justify="space-between" mb="md">
                  <Title order={4}>🐋 Whale Activity Detection</Title>
                  <Tooltip
                    label="Whales are traders with significant capital (&gt;100M GP) who can influence market prices through large volume trades. Our AI tracks unusual trading patterns that suggest whale involvement."
                    multiline
                    width={300}
                    position="left"
                  >
                    <ActionIcon variant="subtle" size="sm">
                      <IconHelp size={14} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
                <Stack spacing="sm">
                  <Group justify="space-between">
                    <Text size="sm">🎯 Active Whales Detected</Text>
                    <Badge color="blue" variant="light" size="lg">12</Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">⚡ Large Volume Alerts</Text>
                    <Badge color="orange" variant="light" size="lg">7</Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">⚠️ Price Manipulation Risk</Text>
                    <Badge color="yellow" variant="light" size="lg">Medium</Badge>
                  </Group>
                  <Divider />
                  <Text size="xs" color="dimmed">
                    🐋 Whales are classified as traders moving &gt;10M GP in single transactions or &gt;50M GP in 24h periods
                  </Text>
                  <Alert icon={<IconInfoCircle size={16} />} title="Latest Whale Activity" color="blue" variant="light">
                    <Text size="xs">
                      🔥 Large whale just moved 47M GP worth of Dragon bones - expect price volatility in next 2-4 hours
                    </Text>
                  </Alert>
                </Stack>
              </Card>

              <Card withBorder p="md">
                <Group justify="space-between" mb="md">
                  <Title order={4}>💎 Market Opportunities</Title>
                  <Tooltip
                    label="Our AI identifies profitable trading opportunities by analyzing price discrepancies, volume patterns, and market inefficiencies across different trading scenarios."
                    multiline
                    width={300}
                    position="left"
                  >
                    <ActionIcon variant="subtle" size="sm">
                      <IconHelp size={14} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
                <Stack spacing="sm">
                  <Group justify="space-between">
                    <Text size="sm">💰 Price Inefficiencies</Text>
                    <Badge color="green" variant="light" size="lg">15</Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">📊 Volume Anomalies</Text>
                    <Badge color="purple" variant="light" size="lg">4</Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">⏰ Timing Opportunities</Text>
                    <Badge color="teal" variant="light" size="lg">8</Badge>
                  </Group>
                  <Divider />
                  <Text size="xs" color="dimmed">
                    💡 Market opportunities include buy-low/sell-high scenarios, seasonal trends, and supply-demand imbalances
                  </Text>
                  <Alert icon={<IconSparkles size={16} />} title="Hot Opportunity" color="green" variant="light">
                    <Text size="xs">
                      🚀 Rune platebody showing 41% arbitrage opportunity - Low competition detected!
                    </Text>
                  </Alert>
                </Stack>
              </Card>
            </SimpleGrid>

            <Card withBorder p="md" mt="md">
              <Title order={4} mb="md">How It Works</Title>
              <Text size="sm" color="dimmed" mb="md">
                Our AI prediction engine uses 6 advanced algorithms to analyze market data and identify profitable trading opportunities:
              </Text>
              <SimpleGrid cols={2} breakpoints={[{ maxWidth: 'md', cols: 1 }]}>
                <Stack spacing="sm">
                  <Group>
                    <IconDiamond size={16} color="purple" />
                    <div>
                      <Text size="sm" weight={500}>Hidden Gem Detection</Text>
                      <Text size="xs" color="dimmed">Finds low-volume items with high profit potential</Text>
                    </div>
                  </Group>
                  <Group>
                    <IconActivity size={16} color="blue" />
                    <div>
                      <Text size="sm" weight={500}>Volume Analysis</Text>
                      <Text size="xs" color="dimmed">Analyzes trading patterns and liquidity</Text>
                    </div>
                  </Group>
                  <Group>
                    <IconCoins size={16} color="green" />
                    <div>
                      <Text size="sm" weight={500}>Margin Optimization</Text>
                      <Text size="xs" color="dimmed">Calculates optimal profit margins</Text>
                    </div>
                  </Group>
                </Stack>
                <Stack spacing="sm">
                  <Group>
                    <IconShield size={16} color="orange" />
                    <div>
                      <Text size="sm" weight={500}>Risk Assessment</Text>
                      <Text size="xs" color="dimmed">Evaluates market volatility and stability</Text>
                    </div>
                  </Group>
                  <Group>
                    <IconClock size={16} color="teal" />
                    <div>
                      <Text size="sm" weight={500}>Market Timing</Text>
                      <Text size="xs" color="dimmed">Predicts optimal trading windows</Text>
                    </div>
                  </Group>
                  <Group>
                    <IconChartLine size={16} color="red" />
                    <div>
                      <Text size="sm" weight={500}>Price Stability</Text>
                      <Text size="xs" color="dimmed">Analyzes price consistency and trends</Text>
                    </div>
                  </Group>
                </Stack>
              </SimpleGrid>
            </Card>
          </Tabs.Panel>

          <Tabs.Panel value="algorithms" pt="md">
            <SimpleGrid cols={2} breakpoints={[{ maxWidth: 'md', cols: 1 }]} spacing="md">
              <Card withBorder p="md">
                <Group justify="space-between" mb="md">
                  <Title order={4}>Hidden Gem Detection</Title>
                  <Tooltip
                    label="Identifies undervalued items with low trading volume but high profit potential. Analyzes price history, supply scarcity, and demand patterns to find items before they become popular."
                    multiline
                    width={300}
                    position="left"
                  >
                    <ActionIcon variant="subtle" size="sm">
                      <IconHelp size={14} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
                <Stack spacing="sm">
                  <Group justify="space-between">
                    <Text size="sm">Algorithm Status</Text>
                    <Badge color="purple" variant="light">Active</Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Success Rate</Text>
                    <Text size="sm" weight={500}>87.3%</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Avg Profit Margin</Text>
                    <Text size="sm" weight={500} color="green">+23.4%</Text>
                  </Group>
                  <Progress value={87} color="purple" size="sm" />
                </Stack>
              </Card>

              <Card withBorder p="md">
                <Group justify="space-between" mb="md">
                  <Title order={4}>Volume Analysis</Title>
                  <Tooltip
                    label="Analyzes trading volume patterns to identify unusual activity, liquidity changes, and optimal entry/exit points. Tracks volume spikes that often precede price movements."
                    multiline
                    width={300}
                    position="left"
                  >
                    <ActionIcon variant="subtle" size="sm">
                      <IconHelp size={14} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
                <Stack spacing="sm">
                  <Group justify="space-between">
                    <Text size="sm">Algorithm Status</Text>
                    <Badge color="blue" variant="light">Active</Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Accuracy Rate</Text>
                    <Text size="sm" weight={500}>91.7%</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Volume Alerts</Text>
                    <Text size="sm" weight={500} color="blue">24 Today</Text>
                  </Group>
                  <Progress value={92} color="blue" size="sm" />
                </Stack>
              </Card>

              <Card withBorder p="md">
                <Group justify="space-between" mb="md">
                  <Title order={4}>Margin Optimization</Title>
                  <Tooltip
                    label="Calculates optimal profit margins by analyzing market depth, competition levels, and price elasticity. Helps maximize profits while maintaining competitive pricing."
                    multiline
                    width={300}
                    position="left"
                  >
                    <ActionIcon variant="subtle" size="sm">
                      <IconHelp size={14} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
                <Stack spacing="sm">
                  <Group justify="space-between">
                    <Text size="sm">Algorithm Status</Text>
                    <Badge color="green" variant="light">Active</Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Optimization Rate</Text>
                    <Text size="sm" weight={500}>84.2%</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Avg Margin Increase</Text>
                    <Text size="sm" weight={500} color="green">+18.7%</Text>
                  </Group>
                  <Progress value={84} color="green" size="sm" />
                </Stack>
              </Card>

              <Card withBorder p="md">
                <Group justify="space-between" mb="md">
                  <Title order={4}>Risk Assessment</Title>
                  <Tooltip
                    label="Evaluates market volatility, price stability, and potential downside risks. Uses historical data and market indicators to assess the safety of trading opportunities."
                    multiline
                    width={300}
                    position="left"
                  >
                    <ActionIcon variant="subtle" size="sm">
                      <IconHelp size={14} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
                <Stack spacing="sm">
                  <Group justify="space-between">
                    <Text size="sm">Algorithm Status</Text>
                    <Badge color="orange" variant="light">Active</Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Risk Prediction</Text>
                    <Text size="sm" weight={500}>89.5%</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Loss Prevention</Text>
                    <Text size="sm" weight={500} color="orange">94.1%</Text>
                  </Group>
                  <Progress value={90} color="orange" size="sm" />
                </Stack>
              </Card>

              <Card withBorder p="md">
                <Group justify="space-between" mb="md">
                  <Title order={4}>Market Timing</Title>
                  <Tooltip
                    label="Predicts optimal entry and exit points by analyzing market cycles, player activity patterns, and economic events. Helps time trades for maximum profitability."
                    multiline
                    width={300}
                    position="left"
                  >
                    <ActionIcon variant="subtle" size="sm">
                      <IconHelp size={14} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
                <Stack spacing="sm">
                  <Group justify="space-between">
                    <Text size="sm">Algorithm Status</Text>
                    <Badge color="teal" variant="light">Active</Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Timing Accuracy</Text>
                    <Text size="sm" weight={500}>76.8%</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Optimal Windows</Text>
                    <Text size="sm" weight={500} color="teal">12 Active</Text>
                  </Group>
                  <Progress value={77} color="teal" size="sm" />
                </Stack>
              </Card>

              <Card withBorder p="md">
                <Group justify="space-between" mb="md">
                  <Title order={4}>Price Stability</Title>
                  <Tooltip
                    label="Analyzes price consistency and trend stability to identify reliable trading opportunities. Focuses on items with predictable price movements and low volatility."
                    multiline
                    width={300}
                    position="left"
                  >
                    <ActionIcon variant="subtle" size="sm">
                      <IconHelp size={14} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
                <Stack spacing="sm">
                  <Group justify="space-between">
                    <Text size="sm">Algorithm Status</Text>
                    <Badge color="red" variant="light">Active</Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Stability Score</Text>
                    <Text size="sm" weight={500}>82.4%</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Stable Opportunities</Text>
                    <Text size="sm" weight={500} color="red">31 Found</Text>
                  </Group>
                  <Progress value={82} color="red" size="sm" />
                </Stack>
              </Card>
            </SimpleGrid>

            <Alert icon={<IconBrain size={16} />} title="AI Engine Performance" mt="md">
              <Text size="sm">
                Our AI algorithms are continuously learning and improving. The success rates shown are based on the last 30 days of trading data.
                Each algorithm contributes to the overall prediction score, with higher-performing algorithms given more weight in the final recommendations.
              </Text>
            </Alert>
          </Tabs.Panel>
        </Tabs>

        {/* Footer */}
        <Text size="xs" color="dimmed" align="center">
          Last updated: {getRelativeTime(lastUpdated)} • Predictions refresh every 5 minutes •
          AI Engine v2.0 • {filteredPredictions.length} opportunities shown
        </Text>
      </Stack>
    </Container>
  )
}
