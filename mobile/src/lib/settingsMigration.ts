// Versioned migrations for stored settings. Settings are saved whole, so a
// changed default never reaches existing installs on its own; a migration
// moves a value that is still exactly the old default, once. Pure.
import { DEFAULT_MAX_SELL_HOURS } from './fillAware.ts'

/**
 * Stored settings version. Settings saved before versioning have none and
 * count as 1.
 * 2: "slowest sell to show" default 1h → 30m (PR #34, walk-forward PR #33).
 */
export const SETTINGS_VERSION = 2
export const UNVERSIONED = 1
/** The "slowest sell to show" default before version 2. */
export const OLD_DEFAULT_MAX_SELL_HOURS = 1

export interface VersionedSettings {
  version?: unknown
  maxSellHours?: unknown
}

/** The stored version; absent or invalid means saved before versioning. */
export function storedVersion (stored: VersionedSettings): number {
  const v = stored.version
  return typeof v === 'number' && Number.isInteger(v) && v >= UNVERSIONED ? v : UNVERSIONED
}

type Migration = <T extends VersionedSettings>(stored: T) => T

/** version → the step that brings settings from it to version + 1. */
const MIGRATIONS: Readonly<Record<number, Migration>> = {
  // Only a value equal to the old default moves: anyone who picked 1h on
  // purpose after the change is already on version 2 and keeps it.
  1: stored => (stored.maxSellHours === OLD_DEFAULT_MAX_SELL_HOURS ? { ...stored, maxSellHours: DEFAULT_MAX_SELL_HOURS } : stored)
}

export interface Migrated<T> {
  settings: T & { version: number }
  /** True when anything moved or the version changed: save it back once. */
  changed: boolean
}

/**
 * Runs every migration from the stored version up to SETTINGS_VERSION and
 * stamps the version. A newer stored version (a downgrade) is left alone.
 */
export function migrateSettings<T extends VersionedSettings> (stored: T): Migrated<T> {
  const from = storedVersion(stored)
  let current: T = stored
  for (let v = from; v < SETTINGS_VERSION; v += 1) {
    const step = MIGRATIONS[v]
    current = step ? step(current) : current
  }
  const version = Math.max(from, SETTINGS_VERSION)
  return { settings: { ...current, version }, changed: version !== stored.version || current !== stored }
}
