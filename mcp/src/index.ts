// ge-metrics-mcp: stdio entry point. stdout carries the protocol, so all
// diagnostics go to stderr.

import { serveStdio } from '@modelcontextprotocol/server/stdio'
import { createDeps, createServer } from './server.js'

const deps = createDeps()
serveStdio(() => createServer(deps), {
  onerror: error => console.error('[ge-metrics-mcp]', error.message)
})
