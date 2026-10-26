// Palette A (light) and B (dark) from docs/design/mobile-app-blue.html.
// Profit is always the brand blue; nothing in the app is red.

export interface Palette {
  bg: string
  card: string
  well: string
  ink: string
  muted: string
  rule: string
  brand: string
  profit: string
  bar: string
  onBrand: string
  /** Second chart series (buy / low price); the sell line uses `brand`. */
  buyLine: string
}

export const LIGHT: Palette = {
  bg: '#F5F6FA',
  card: '#FFFFFF',
  well: '#ECEEF5',
  ink: '#151829',
  muted: '#6B7088',
  rule: '#E3E5EE',
  brand: '#3355FF',
  profit: '#2541E8',
  bar: '#FFFFFF',
  onBrand: '#FFFFFF',
  buyLine: '#1A9BD7'
}

export const DARK: Palette = {
  bg: '#0E1430',
  card: '#18214A',
  well: '#1F2A58',
  ink: '#EEF0FF',
  muted: '#8A93BD',
  rule: '#222C57',
  brand: '#8EA2FF',
  profit: '#A9B8FF',
  bar: '#121A3D',
  onBrand: '#0E1430',
  buyLine: '#5CC8F5'
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const
export const radius = { sm: 7, md: 10 } as const
export const type = {
  title: { fontSize: 32, fontWeight: '700', letterSpacing: -0.6 },
  name: { fontSize: 15, fontWeight: '600' },
  meta: { fontSize: 12.5 },
  profit: { fontSize: 16, fontWeight: '700' },
  line: { fontSize: 14 }
} as const
