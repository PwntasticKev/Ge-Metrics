// Shapes returned by the OSRS Wiki real-time prices API, after validation.

export interface MappingEntry {
  readonly id: number
  readonly name: string
  readonly examine: string | null
  readonly members: boolean
  readonly limit: number | null
  readonly value: number | null
  readonly highalch: number | null
  readonly lowalch: number | null
  readonly icon: string | null
}

export interface LatestPrice {
  readonly high: number | null
  readonly highTime: number | null
  readonly low: number | null
  readonly lowTime: number | null
}

export interface AveragePrice {
  readonly avgHighPrice: number | null
  readonly highPriceVolume: number
  readonly avgLowPrice: number | null
  readonly lowPriceVolume: number
}

export interface TimeseriesPoint extends AveragePrice {
  readonly timestamp: number
}

export type AverageWindow = '5m' | '1h' | '24h'
export type Timestep = '5m' | '1h' | '6h' | '24h'
export const TIMESTEPS: readonly Timestep[] = ['5m', '1h', '6h', '24h']
export const TIMESTEP_SECONDS: Readonly<Record<Timestep, number>> = { '5m': 300, '1h': 3600, '6h': 21_600, '24h': 86_400 }

export type IdMap<T> = ReadonlyMap<number, T>
