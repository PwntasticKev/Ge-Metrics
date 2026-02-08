import type { VercelRequest, VercelResponse } from '@vercel/node'

let appPromise: Promise<any> | null = null

function getApp() {
  if (!appPromise) {
    appPromise = import('../server/dist/index.js').then(mod => mod.default || mod)
  }
  return appPromise
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const app = await getApp()
    return app(req, res)
  } catch (error: any) {
    console.error('Function error:', error)
    res.status(500).json({ error: error?.message ?? 'Unknown error' })
  }
}
