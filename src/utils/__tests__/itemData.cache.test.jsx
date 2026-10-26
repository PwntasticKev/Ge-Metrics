import { beforeEach, describe, expect, test, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import ItemData from '../item-data.jsx'
import { getMappingData, getPricingData, getVolumeData } from '../../api/rs-wiki-api'
import { PRICE_CACHE_KEY_PREFIX, pricesCache } from '../../services/local/pricesCache.js'

vi.mock('../../api/rs-wiki-api', () => ({
  getPricingData: vi.fn(),
  getMappingData: vi.fn(),
  getVolumeData: vi.fn()
}))

vi.mock('../../hooks/useTrashScoring.js', () => {
  const weight = () => 1
  const zero = () => 0
  const no = () => false
  return {
    useTrashScoring: () => ({ getTrashWeight: weight, getTrashPercentage: zero, getTrashCount: zero, hasUserVoted: no, isLoading: false })
  }
})

const MAPPING = [{ id: 4151, name: 'Abyssal whip', icon: 'Abyssal whip.png', limit: 70 }]
const CACHED_LATEST = { 4151: { high: 1_500_000, highTime: 1, low: 1_450_000, lowTime: 1 } }
const LIVE_LATEST = { 4151: { high: 1_600_000, highTime: 2, low: 1_550_000, lowTime: 2 } }
const VOLUMES = { 4151: 12_345 }
const never = () => new Promise(() => {})

const liveResponses = () => {
  getPricingData.mockResolvedValue({ success: true, data: { data: LIVE_LATEST } })
  getMappingData.mockResolvedValue(MAPPING)
  getVolumeData.mockResolvedValue({ success: true, data: { data: VOLUMES } })
}

const seedCache = () => {
  pricesCache.write('mapping', MAPPING)
  pricesCache.write('latest', CACHED_LATEST)
  pricesCache.write('volumes', VOLUMES)
  return pricesCache.read('latest').savedAt
}

describe('ItemData prices cache', () => {
  beforeEach(() => {
    // src/test/setup.ts stubs localStorage with no-op mocks; back them with a Map.
    const store = new Map()
    window.localStorage.getItem.mockImplementation(key => (store.has(key) ? store.get(key) : null))
    window.localStorage.setItem.mockImplementation((key, value) => { store.set(key, String(value)) })
    window.localStorage.removeItem.mockImplementation(key => { store.delete(key) })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  test('paints the saved prices before the network answers', async () => {
    const savedAt = seedCache()
    getPricingData.mockImplementation(never)
    getMappingData.mockImplementation(never)
    getVolumeData.mockImplementation(never)

    const { result } = renderHook(() => ItemData())

    await waitFor(() => expect(result.current.items).toHaveLength(1))
    expect(result.current.priceStatus).toBe('success')
    expect(result.current.items[0]).toMatchObject({ id: 4151, high: 1_500_000, low: 1_450_000, volume: 12_345 })
    expect(result.current.pricesUpdatedAt).toBe(savedAt)
  })

  test('refreshes in the background and skips /mapping while the saved copy is fresh', async () => {
    seedCache()
    liveResponses()

    const { result } = renderHook(() => ItemData())

    await waitFor(() => expect(result.current.items[0]?.high).toBe(1_600_000))
    expect(getMappingData).not.toHaveBeenCalled()
    expect(pricesCache.read('latest').data).toEqual(LIVE_LATEST)
  })

  test('first visit: loads, then saves what the next visit needs', async () => {
    liveResponses()

    const { result } = renderHook(() => ItemData())

    expect(result.current.priceStatus).toBe('loading')
    await waitFor(() => expect(result.current.priceStatus).toBe('success'))
    expect(getMappingData).toHaveBeenCalledTimes(1)
    expect(pricesCache.readSnapshot()).toMatchObject({ mapping: MAPPING, latest: LIVE_LATEST, volumes: VOLUMES })
  })

  test('a failed refresh keeps the saved prices on screen', async () => {
    seedCache()
    getPricingData.mockResolvedValue({ success: false, error: new Error('offline') })
    getMappingData.mockResolvedValue([])
    getVolumeData.mockResolvedValue({ success: false, error: new Error('offline') })

    const { result } = renderHook(() => ItemData())

    await waitFor(() => expect(getPricingData).toHaveBeenCalled())
    await waitFor(() => expect(console.error).toHaveBeenCalled())
    expect(result.current.priceStatus).toBe('success')
    expect(result.current.items[0].high).toBe(1_500_000)
  })

  test('a corrupted cache is ignored and the page loads normally', async () => {
    window.localStorage.setItem(`${PRICE_CACHE_KEY_PREFIX}latest`, '{broken')
    liveResponses()

    const { result } = renderHook(() => ItemData())

    expect(result.current.priceStatus).toBe('loading')
    await waitFor(() => expect(result.current.items[0]?.high).toBe(1_600_000))
  })
})
