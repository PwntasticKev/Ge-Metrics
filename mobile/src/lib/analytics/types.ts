// The wiki /timeseries row, as parsed by api/wiki.ts. Declared here so the
// analytics stay free of app imports and run under `node --test`.
export interface TimeseriesPoint {
  /** Period start, UTC seconds. */
  timestamp: number
  /** Average price of instant-buys (trades at the high end). */
  avgHighPrice: number | null
  /** Average price of instant-sells (trades at the low end). */
  avgLowPrice: number | null
  /** Items instant-bought: they filled sell offers. */
  highPriceVolume: number
  /** Items instant-sold: they filled buy offers. */
  lowPriceVolume: number
}

/** The wiki /1h and /24h averages for one item. */
export interface AverageLike {
  avgHighPrice: number | null
  avgLowPrice: number | null
  highPriceVolume: number
  lowPriceVolume: number
}

/** GE tax for one item sold at `price`. Passed in so this module needs no engine import. */
export type TaxOf = (price: number) => number
