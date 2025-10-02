import { config } from '../config/index.js'

export function absoluteUrl (path: string) {
  return `${config.PUBLIC_URL}${path}`
}
