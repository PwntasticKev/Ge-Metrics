import { config } from '../config/index.js'

export function absoluteUrl (path: string) {
  return `${config.FRONTEND_URL}${path}`
}
