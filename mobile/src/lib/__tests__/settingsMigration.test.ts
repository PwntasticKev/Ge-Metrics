/// <reference types="node" />
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_MAX_SELL_HOURS } from '../fillAware.ts'
import { migrateSettings, OLD_DEFAULT_MAX_SELL_HOURS, SETTINGS_VERSION, storedVersion } from '../settingsMigration.ts'

describe('settings migration', () => {
  it('moves the old 1h default to 30m when no version is stored', () => {
    const { settings, changed } = migrateSettings({ theme: 'dark', maxSellHours: OLD_DEFAULT_MAX_SELL_HOURS })
    assert.equal(settings.maxSellHours, DEFAULT_MAX_SELL_HOURS)
    assert.equal(settings.maxSellHours, 0.5)
    assert.equal(settings.version, SETTINGS_VERSION)
    assert.equal(settings.theme, 'dark')
    assert.equal(changed, true)
  })

  it('treats an explicit version 1 like an unversioned install', () => {
    assert.equal(migrateSettings({ version: 1, maxSellHours: 1 }).settings.maxSellHours, 0.5)
  })

  it('keeps any other value the trader picked', () => {
    for (const hours of [0.5, 2, 4, 8]) {
      const { settings } = migrateSettings({ maxSellHours: hours })
      assert.equal(settings.maxSellHours, hours)
      assert.equal(settings.version, SETTINGS_VERSION)
    }
  })

  it('keeps 1h chosen after the change (already on the current version)', () => {
    const { settings, changed } = migrateSettings({ version: SETTINGS_VERSION, maxSellHours: 1 })
    assert.equal(settings.maxSellHours, 1)
    assert.equal(changed, false)
  })

  it('runs once: migrating the result again changes nothing', () => {
    const once = migrateSettings({ maxSellHours: 1 })
    const twice = migrateSettings(once.settings)
    assert.equal(twice.changed, false)
    assert.deepEqual(twice.settings, once.settings)
  })

  it('stamps the version on old settings without the field and does not mutate them', () => {
    const stored: { budget: number; version?: number } = Object.freeze({ budget: 5_000_000 })
    const { settings, changed } = migrateSettings(stored)
    assert.deepEqual(settings, { budget: 5_000_000, version: SETTINGS_VERSION })
    assert.equal(changed, true)
    assert.deepEqual(stored, { budget: 5_000_000 })
  })

  it('leaves settings from a newer app version alone', () => {
    const { settings, changed } = migrateSettings({ version: SETTINGS_VERSION + 1, maxSellHours: 1 })
    assert.equal(settings.maxSellHours, 1)
    assert.equal(settings.version, SETTINGS_VERSION + 1)
    assert.equal(changed, false)
  })

  it('reads a missing or bad version as unversioned', () => {
    assert.equal(storedVersion({}), 1)
    assert.equal(storedVersion({ version: '2' }), 1)
    assert.equal(storedVersion({ version: 0 }), 1)
    assert.equal(storedVersion({ version: 2 }), 2)
  })
})
