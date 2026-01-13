import * as Sentry from '@sentry/react'
import { BrowserTracing } from '@sentry/tracing'

export const initMonitoring = () => {
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      integrations: [
        new BrowserTracing(),
        new Sentry.Replay({
          maskAllText: false,
          blockAllMedia: false
        })
      ],
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      environment: import.meta.env.MODE,
      beforeSend(event, hint) {
        if (event.exception) {
          console.error('Sentry captured:', hint.originalException)
        }
        return event
      }
    })
  }
}

export const captureException = (error: Error, context?: Record<string, any>) => {
  console.error('Error captured:', error, context)
  
  if (import.meta.env.PROD) {
    Sentry.captureException(error, {
      extra: context
    })
  }
}

export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info') => {
  if (import.meta.env.PROD) {
    Sentry.captureMessage(message, level)
  }
}

export const setUser = (user: { id: string; email?: string }) => {
  Sentry.setUser(user)
}

export const clearUser = () => {
  Sentry.setUser(null)
}

export const measurePerformance = (name: string, fn: () => void | Promise<void>) => {
  const transaction = Sentry.startTransaction({
    op: 'function',
    name
  })
  
  Sentry.getCurrentHub().configureScope(scope => scope.setSpan(transaction))
  
  const result = fn()
  
  if (result instanceof Promise) {
    return result.finally(() => {
      transaction.finish()
    })
  } else {
    transaction.finish()
    return result
  }
}

export class PerformanceMonitor {
  private marks = new Map<string, number>()
  
  mark(name: string) {
    this.marks.set(name, performance.now())
  }
  
  measure(name: string, startMark: string, endMark?: string) {
    const start = this.marks.get(startMark)
    if (!start) {
      console.warn(`No mark found for ${startMark}`)
      return
    }
    
    const end = endMark ? this.marks.get(endMark) : performance.now()
    if (!end) {
      console.warn(`No mark found for ${endMark}`)
      return
    }
    
    const duration = end - start
    
    if (import.meta.env.DEV) {
      console.log(`Performance: ${name} took ${duration.toFixed(2)}ms`)
    }
    
    if (import.meta.env.PROD) {
      Sentry.addBreadcrumb({
        category: 'performance',
        message: name,
        level: 'info',
        data: { duration }
      })
    }
    
    return duration
  }
  
  clear() {
    this.marks.clear()
  }
}