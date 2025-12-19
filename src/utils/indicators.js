/**
 * Technical indicator calculations for charts
 */

/**
 * Calculate Simple Moving Average (SMA)
 * @param {Array} data - Array of { time, value }
 * @param {number} period - Period for SMA calculation
 * @returns {Array} Array of { time, value }
 */
export function calculateSMA(data, period) {
  if (!Array.isArray(data) || data.length < period) {
    return []
  }

  const result = []
  let sum = 0

  for (let i = 0; i < data.length; i++) {
    const point = data[i]
    sum += point.value

    if (i >= period - 1) {
      result.push({
        time: point.time,
        value: sum / period
      })

      // Remove the oldest value from sum
      sum -= data[i - period + 1].value
    }
  }

  return result
}

/**
 * Calculate Exponential Moving Average (EMA)
 * @param {Array} data - Array of { time, value }
 * @param {number} period - Period for EMA calculation
 * @returns {Array} Array of { time, value }
 */
export function calculateEMA(data, period) {
  if (!Array.isArray(data) || data.length < period) {
    return []
  }

  const result = []
  const k = 2 / (period + 1)
  let ema = null

  for (let i = 0; i < data.length; i++) {
    const point = data[i]

    if (ema === null) {
      // Initialize EMA with first value
      ema = point.value
    } else {
      // Calculate EMA
      ema = point.value * k + ema * (1 - k)
    }

    if (i >= period - 1) {
      result.push({
        time: point.time,
        value: ema
      })
    }
  }

  return result
}

/**
 * Calculate Relative Strength Index (RSI)
 * @param {Array} data - Array of { time, value }
 * @param {number} period - Period for RSI calculation (default 14)
 * @returns {Array} Array of { time, value } where value is RSI (0-100)
 */
export function calculateRSI(data, period = 14) {
  if (!Array.isArray(data) || data.length < period + 1) {
    return []
  }

  const result = []
  const gains = []
  const losses = []

  // Calculate initial average gain and loss
  for (let i = 1; i <= period; i++) {
    const change = data[i].value - data[i - 1].value
    gains.push(change > 0 ? change : 0)
    losses.push(change < 0 ? Math.abs(change) : 0)
  }

  let avgGain = gains.reduce((sum, val) => sum + val, 0) / period
  let avgLoss = losses.reduce((sum, val) => sum + val, 0) / period

  // Calculate RSI for remaining points
  for (let i = period + 1; i < data.length; i++) {
    const change = data[i].value - data[i - 1].value
    const gain = change > 0 ? change : 0
    const loss = change < 0 ? Math.abs(change) : 0

    // Use Wilder's smoothing method
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
    const rsi = 100 - (100 / (1 + rs))

    result.push({
      time: data[i].time,
      value: rsi
    })
  }

  return result
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 * @param {Array} data - Array of { time, value }
 * @param {number} fastPeriod - Fast EMA period (default 12)
 * @param {number} slowPeriod - Slow EMA period (default 26)
 * @param {number} signalPeriod - Signal line EMA period (default 9)
 * @returns {Object} { macd: Array, signal: Array, histogram: Array }
 */
export function calculateMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  if (!Array.isArray(data) || data.length < slowPeriod + signalPeriod) {
    return { macd: [], signal: [], histogram: [] }
  }

  const fastEMA = calculateEMA(data, fastPeriod)
  const slowEMA = calculateEMA(data, slowPeriod)

  // Calculate MACD line (fast EMA - slow EMA)
  const macdLine = []
  const minLength = Math.min(fastEMA.length, slowEMA.length)

  for (let i = 0; i < minLength; i++) {
    const fastIdx = fastEMA.length - minLength + i
    const slowIdx = slowEMA.length - minLength + i

    if (fastEMA[fastIdx].time === slowEMA[slowIdx].time) {
      macdLine.push({
        time: fastEMA[fastIdx].time,
        value: fastEMA[fastIdx].value - slowEMA[slowIdx].value
      })
    }
  }

  // Calculate signal line (EMA of MACD line)
  const signalLine = calculateEMA(macdLine, signalPeriod)

  // Calculate histogram (MACD - Signal)
  const histogram = []
  const signalLength = signalLine.length
  const macdStartIdx = macdLine.length - signalLength

  for (let i = 0; i < signalLength; i++) {
    const macdIdx = macdStartIdx + i
    histogram.push({
      time: signalLine[i].time,
      value: macdLine[macdIdx].value - signalLine[i].value
    })
  }

  return {
    macd: macdLine,
    signal: signalLine,
    histogram
  }
}

/**
 * Calculate Bollinger Bands
 * @param {Array} data - Array of { time, value }
 * @param {number} period - Period for SMA calculation (default 20)
 * @param {number} stdDev - Standard deviation multiplier (default 2)
 * @returns {Object} { upper: Array, middle: Array, lower: Array }
 */
export function calculateBollingerBands(data, period = 20, stdDev = 2) {
  if (!Array.isArray(data) || data.length < period) {
    return { upper: [], middle: [], lower: [] }
  }

  const sma = calculateSMA(data, period)
  const result = {
    upper: [],
    middle: sma,
    lower: []
  }

  // Calculate standard deviation for each SMA point
  for (let i = 0; i < sma.length; i++) {
    const smaTime = sma[i].time
    const smaIdx = data.findIndex(d => d.time === smaTime)
    
    if (smaIdx >= period - 1) {
      // Calculate standard deviation for the period
      const periodData = data.slice(smaIdx - period + 1, smaIdx + 1)
      const mean = sma[i].value
      const variance = periodData.reduce((sum, point) => {
        const diff = point.value - mean
        return sum + (diff * diff)
      }, 0) / period
      const standardDeviation = Math.sqrt(variance)

      result.upper.push({
        time: smaTime,
        value: mean + (standardDeviation * stdDev)
      })

      result.lower.push({
        time: smaTime,
        value: mean - (standardDeviation * stdDev)
      })
    }
  }

  return result
}

