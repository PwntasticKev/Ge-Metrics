// Display formatting for chart readouts.

const fullFormat = new Intl.NumberFormat('en-US')
const compactFormat = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 2 })

export function formatGp (value) {
  return Number.isFinite(value) ? fullFormat.format(Math.round(value)) : '—'
}

export function formatCompact (value) {
  return Number.isFinite(value) ? compactFormat.format(value) : '—'
}

export function formatSignedGp (value) {
  if (!Number.isFinite(value)) return '—'
  const rounded = Math.round(value)
  return `${rounded > 0 ? '+' : ''}${fullFormat.format(rounded)}`
}

export function formatPct (value) {
  if (!Number.isFinite(value)) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(Math.abs(value) >= 10 ? 1 : 2)}%`
}

export function changeColor (value) {
  if (!Number.isFinite(value) || value === 0) return '#909296'
  return value > 0 ? '#10b981' : '#ef4444'
}

export function formatDateTime (unixSec) {
  if (!Number.isFinite(unixSec)) return ''
  return new Date(unixSec * 1000).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

export function formatDate (unixSec) {
  if (!Number.isFinite(unixSec)) return ''
  return new Date(unixSec * 1000).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC'
  })
}
