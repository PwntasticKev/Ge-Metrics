// Pure helpers for the price charts (graph modal + /item/:id): ranges,
// series transforms, visible-range stats and news markers. No React.

export { CHART_RANGES, DEFAULT_RANGE, rangeConfig, rangeCutoff } from './ranges.js'
export {
  normalizeTimeseries,
  midPrice,
  sliceWindow,
  marginAfterTax,
  readout,
  nearestPoint,
  pointAtOrBefore,
  rangeStats,
  priceChangeAfter,
  stackedVolumeBars
} from './series.js'
export {
  MARKER_GROUPS,
  DEFAULT_MARKER_FILTER,
  markerGroupKey,
  markerGroup,
  toMarkers,
  filterMarkers,
  mentionsLast,
  toggleGroup,
  markerImpact,
  markersNear,
  groupMarkersByTime,
  safeUrl
} from './markers.js'
export {
  formatGp,
  formatCompact,
  formatSignedGp,
  formatPct,
  changeColor,
  formatDateTime,
  formatDate
} from './format.js'
