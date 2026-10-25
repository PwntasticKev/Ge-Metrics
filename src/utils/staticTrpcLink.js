// Terminating tRPC link used when the site runs without a backend.
// `items.*` price/mapping/volume procedures are served in the browser from the
// OSRS Wiki API, and `favorites.*` from localStorage. Every other procedure fails fast with a clear error instead of
// hitting a server that does not exist.

import { observable } from '@trpc/server/observable'
import { TRPCClientError } from '@trpc/client'
import { wikiItemsService } from '../services/wiki/wikiItemsService.js'
import { localFavoritesStore } from '../services/local/localFavoritesStore.js'

export const BACKEND_UNAVAILABLE_MESSAGE = 'This feature needs an account and is not available right now.'

export function createStaticHandlers (service, favorites) {
  return {
    'favorites.getAll': input => favorites.getAll(input),
    'favorites.add': input => favorites.add(input),
    'favorites.remove': input => favorites.remove(input),
    'items.getAllItems': () => service.getLatest(),
    'items.getItemMapping': () => service.getMapping(),
    'items.getAllVolumes': () => service.getVolumes(),
    'items.getVolumesLastUpdated': () => service.getVolumesLastUpdated(),
    'items.getPotionFamilies': async () => [],
    // Volumes are always fetched live, so there is nothing to backfill.
    'items.populateItemVolumes': async () => ({ success: true })
  }
}

export function staticTrpcLink ({ service = wikiItemsService, favorites = localFavoritesStore } = {}) {
  const handlers = createStaticHandlers(service, favorites)

  return () => ({ op }) => observable(observer => {
    const handler = handlers[op.path]
    if (!handler) {
      observer.error(new TRPCClientError(`${BACKEND_UNAVAILABLE_MESSAGE} (${op.path})`))
      return
    }

    let cancelled = false
    handler(op.input)
      .then(data => {
        if (cancelled) return
        observer.next({ result: { type: 'data', data } })
        observer.complete()
      })
      .catch(error => {
        if (cancelled) return
        console.error(`[staticTrpcLink] ${op.path} failed`, error)
        observer.error(TRPCClientError.from(error))
      })

    return () => { cancelled = true }
  })
}
