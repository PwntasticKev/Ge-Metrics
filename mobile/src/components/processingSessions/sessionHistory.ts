interface HistorySession {
  id: string
  label?: string | null
  recipe: { name: string }
  status: string
  processingStartedAt?: number | null
}

export function mergeSessionHistory<T extends HistorySession>(durable: readonly T[], pending: readonly T[]): T[] {
  return [...new Map([...durable, ...pending].map(session => [session.id, session])).values()]
    .sort((a, b) => Number(b.status === 'processing') - Number(a.status === 'processing') || (b.processingStartedAt ?? 0) - (a.processingStartedAt ?? 0))
}

export function sessionHistoryPage<T extends HistorySession>(sessions: readonly T[], query: string, requestedPage: number) {
  const needle = query.trim().toLowerCase()
  const matches = sessions.filter(s => [s.label ?? '', s.recipe.name, s.id].some(value => value.toLowerCase().includes(needle)))
  const pages = Math.max(1, Math.ceil(matches.length / 8))
  const page = Math.max(0, Math.min(pages - 1, requestedPage))
  return { rows: matches.slice(page * 8, page * 8 + 8), total: matches.length, page, pages }
}

type Navigation = { query: string; page: number }
type NavigationAction = { type: 'query'; query: string } | { type: 'load' } | { type: 'page'; page: number }
export function historyNavigation(state: Navigation, action: NavigationAction): Navigation {
  if (action.type === 'query') return { query: action.query, page: 0 }
  if (action.type === 'load') return { ...state, page: 0 }
  return { ...state, page: action.page }
}
