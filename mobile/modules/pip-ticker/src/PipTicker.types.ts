import type { StyleProp, ViewStyle } from 'react-native'

export interface TickerRow {
  /** OSRS item id; the native side re-fetches its price while PiP is up. */
  id: number
  name: string
  /** 'flip': buy/sell are live low/high. 'holding': buy is what you paid. */
  kind: 'flip' | 'holding'
  buy: number
  sell: number
  /** Flips: margin per item after tax. Holdings: profit on the stack if sold now. */
  margin: number
  /** Fraction (0.012 = +1.2%), or null to hide. */
  change: number | null
  qty: number
  taxExempt: boolean
  /** Flips: 24h average mid price that `change` compares against. */
  base: number | null
}

export interface TickerPayload {
  title: string
  /** ms since epoch */
  updatedAt: number
  rows: TickerRow[]
}

export type PipTickerModuleEvents = {
  onStart: () => void
  onStop: () => void
  onError: (event: { message: string }) => void
}

export interface PipTickerViewProps {
  style?: StyleProp<ViewStyle>
}
