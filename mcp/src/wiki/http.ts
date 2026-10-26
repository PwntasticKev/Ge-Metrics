import { REQUEST_TIMEOUT_MS, USER_AGENT } from '../config.js'

export class UpstreamError extends Error {
  constructor (message: string, readonly status?: number) {
    super(message)
    this.name = 'UpstreamError'
  }
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

// GET a JSON document with our User-Agent and a timeout. Errors carry a
// message that is safe to show to the model (no headers, no stack).
export async function getJson (url: string, fetchImpl: FetchLike = fetch): Promise<unknown> {
  const host = new URL(url).host
  let response: Response
  try {
    response = await fetchImpl(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    })
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')
    throw new UpstreamError(timedOut ? `${host} timed out` : `Could not reach ${host}`)
  }
  if (!response.ok) throw new UpstreamError(`${host} returned HTTP ${response.status}`, response.status)
  try {
    return await response.json()
  } catch {
    throw new UpstreamError(`${host} returned invalid JSON`)
  }
}
