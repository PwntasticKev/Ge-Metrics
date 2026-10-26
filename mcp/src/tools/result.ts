// Tool result helpers: compact JSON text on success, a readable error
// message (never a stack trace) on failure.

import type { CallToolResult } from '@modelcontextprotocol/server'
import { ToolInputError } from '../analysis/resolve.js'
import { UpstreamError } from '../wiki/http.js'

export const json = (data: unknown): CallToolResult => ({
  content: [{ type: 'text', text: JSON.stringify(data) }]
})

const failure = (message: string): CallToolResult => ({ isError: true, content: [{ type: 'text', text: message }] })

export function guarded<A> (tool: string, run: (args: A) => Promise<unknown>) {
  return async (args: A): Promise<CallToolResult> => {
    try {
      return json(await run(args))
    } catch (error) {
      if (error instanceof ToolInputError) return failure(error.message)
      if (error instanceof UpstreamError) return failure(`Price data unavailable: ${error.message}. Try again shortly.`)
      console.error(`[ge-metrics-mcp] ${tool} failed:`, error)
      return failure(`${tool} failed unexpectedly. Check the server log.`)
    }
  }
}
