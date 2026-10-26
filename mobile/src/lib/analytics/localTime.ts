// The wiki's hourly buckets start on UTC hours. These map them to the
// phone's clock, including half-hour time zones (India, parts of Australia).

const DAY_MIN = 1440

/** Minutes past local midnight at which UTC hour `utcHour` starts. */
export function localStartMinutes (utcHour: number, offsetMinutes: number): number {
  return (((utcHour * 60 + offsetMinutes) % DAY_MIN) + DAY_MIN) % DAY_MIN
}

/** UTC hours in local clock order, starting with the first one at or after local midnight. */
export function localHourOrder (offsetMinutes: number): number[] {
  const first = (((Math.ceil(-offsetMinutes / 60) % 24) + 24) % 24)
  return Array.from({ length: 24 }, (_, i) => (first + i) % 24)
}

/** "14:00" or "05:30": when UTC hour `utcHour` starts on the local clock. */
export function localClock (utcHour: number, offsetMinutes: number): string {
  const m = localStartMinutes(utcHour, offsetMinutes)
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const
