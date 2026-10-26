// Blend two #RRGGBB colours: t = 0 gives `from`, t = 1 gives `to`.
export function mixHex (from: string, to: string, t: number): string {
  const parse = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
  const a = parse(from)
  const b = parse(to)
  const k = Math.min(1, Math.max(0, Number.isFinite(t) ? t : 0))
  return `#${a.map((v, i) => Math.round(v + (b[i] - v) * k).toString(16).padStart(2, '0')).join('')}`
}
