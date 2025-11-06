// Risk scoring service
// Input: historyData: Array<{ timestamp:number, avgHighPrice:number|null, avgLowPrice:number|null, lowPriceVolume?:number, highPriceVolume?:number }>
// Output: { score:number (0-100), label:'Stable'|'Moderate'|'Volatile'|'Risky', breakdown:{ liquidity:number, volatility:number, spikes:number, gaps:number }, meta:{ spikes:number, bars:number } }

const clamp01 = (x) => Math.max(0, Math.min(1, x))
const pct = (num, den) => (den > 0 ? num / den : 0)

// Simple robust statistics helpers
function median(arr) {
  if (!arr.length) return 0
  const a = [...arr].sort((x, y) => x - y)
  const i = Math.floor(a.length / 2)
  return a.length % 2 ? a[i] : (a[i - 1] + a[i]) / 2
}
function mad(arr, med) {
  if (!arr.length) return 0
  const m = med ?? median(arr)
  const d = arr.map((x) => Math.abs(x - m))
  return median(d) || 0
}

// Label thresholds
const LABELS = [
  { name: 'Stable', max: 25 },
  { name: 'Moderate', max: 50 },
  { name: 'Volatile', max: 70 },
  { name: 'Risky', max: 101 },
]

// Default weights
const DEFAULT_WEIGHTS = {
  liquidity: 0.30,
  volatility: 0.35,
  spikes: 0.20,
  gaps: 0.15,
}

// Volume scale guesses (tuneable)
const VOLUME_SCALES = {
  '5m': 2_000_000, // 12h window expected small sums per item
  '1h': 10_000_000,
  '6h': 50_000_000,
  '24h': 200_000_000,
}

// Spike absolute trigger per the user: 2,000,000 change in volume
const ABS_VOL_SPIKE = 2_000_000

export function computeRiskFromHistory({ historyData, timeframe = '1h', weights = DEFAULT_WEIGHTS }) {
  const bars = Array.isArray(historyData) ? historyData.filter(b => b && (b.avgHighPrice != null || b.avgLowPrice != null)) : []
  const n = bars.length
  if (n < 10) {
    return { score: 0, label: 'Stable', breakdown: { liquidity: 0, volatility: 0, spikes: 0, gaps: 0 }, meta: { spikes: 0, bars: n } }
  }

  // Build mid price and per-bar volume
  const mids = []
  const vols = []
  for (const b of bars) {
    const high = b.avgHighPrice ?? b.avgLowPrice
    const low = b.avgLowPrice ?? b.avgHighPrice
    const mid = high && low ? (high + low) / 2 : (high || low || 0)
    mids.push(mid)
    const v = (b.lowPriceVolume || 0) + (b.highPriceVolume || 0)
    vols.push(v)
  }

  // Liquidity risk
  const volSum = vols.reduce((a, v) => a + v, 0)
  const scale = VOLUME_SCALES[timeframe] ?? VOLUME_SCALES['1h']
  const liquidity = clamp01(0.7 * (1 - clamp01(volSum / scale)) + 0.3 * pct(vols.filter(v => v === 0).length, n))

  // Volatility risk
  const rets = []
  for (let i = 1; i < n; i++) {
    const p0 = mids[i - 1]
    const p1 = mids[i]
    if (p0 > 0 && p1 > 0) {
      rets.push(Math.log(p1 / p0))
    }
  }
  const medPrice = median(mids)
  const sigma = Math.sqrt(rets.reduce((a, r) => a + r * r, 0) / Math.max(1, rets.length))
  const spread = median(bars.map(b => {
    const h = b.avgHighPrice ?? 0
    const l = b.avgLowPrice ?? 0
    const m = (h + l) / 2 || medPrice || 1
    return m ? Math.abs(h - l) / m : 0
  }))
  const normSigma = clamp01((sigma / 0.05)) // 5% std as upper scale
  const normSpread = clamp01(spread / 0.05)
  const volatility = clamp01(0.6 * normSigma + 0.4 * normSpread)

  // Spike risk (vol + price)
  const volMed = median(vols)
  const volMad = mad(vols, volMed) || 1
  let spikeCount = 0
  for (let i = 1; i < n; i++) {
    const dv = Math.abs(vols[i] - vols[i - 1])
    const zv = Math.abs((vols[i] - volMed) / (volMad || 1))
    const ret = i < rets.length + 1 ? Math.abs(rets[i - 1]) : 0
    const spike = (dv >= ABS_VOL_SPIKE || zv >= 3) && ret >= 0.03 // 3% price move
    if (spike) spikeCount++
  }
  const spikes = clamp01(spikeCount / Math.max(1, n) * 5) // scale up to matter

  // Gap risk
  let maxGapPct = 0
  let missing = 0
  for (let i = 1; i < n; i++) {
    const p0 = mids[i - 1]
    const p1 = mids[i]
    if (p0 > 0 && p1 > 0) {
      maxGapPct = Math.max(maxGapPct, Math.abs(p1 - p0) / p0)
    }
    if ((bars[i].timestamp - bars[i - 1].timestamp) > 2 * (bars[1].timestamp - bars[0].timestamp)) missing++
  }
  const gaps = clamp01(0.5 * clamp01(maxGapPct / 0.1) + 0.5 * pct(missing, n)) // 10% max gap scale

  // Composite
  const score01 = clamp01(
    weights.liquidity * liquidity +
    weights.volatility * volatility +
    weights.spikes * spikes +
    weights.gaps * gaps
  )
  const score = Math.round(score01 * 100)
  const label = LABELS.find(l => score < l.max)?.name || 'Risky'

  return {
    score,
    label,
    breakdown: {
      liquidity: Math.round(liquidity * 100),
      volatility: Math.round(volatility * 100),
      spikes: Math.round(spikes * 100),
      gaps: Math.round(gaps * 100),
    },
    meta: { spikes: spikeCount, bars: n }
  }
}

export default { computeRiskFromHistory }
