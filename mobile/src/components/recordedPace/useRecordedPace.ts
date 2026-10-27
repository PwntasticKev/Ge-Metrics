import { useCallback, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import type { ProcessingSession } from '../../lib/processingSessions'
import { processingSessionRepository } from '../processingSessions/repository'

/** Only durable saved sessions are evidence; pending edits never enter the summary. */
export function useRecordedPace() {
  const [sessions, setSessions] = useState<ProcessingSession[]>([])
  const [now, setNow] = useState(0)
  const [message, setMessage] = useState('Loading saved pace…')
  const [choices, setChoices] = useState<Record<string, number>>({})
  const [revision, setRevision] = useState(0)
  const refresh = useCallback(() => setRevision(value => value + 1), [])
  useFocusEffect(useCallback(() => {
    void revision // A manual refresh reruns the focused load.
    let live = true
    setChoices({})
    setSessions([])
    setMessage('Loading saved pace…')
    processingSessionRepository.load().then(result => {
      if (!live) return
      setNow(Date.now())
      if (!result.ok) { setMessage(`Recorded pace storage error: ${result.error.message}. Curated rates retained.`); return }
      setSessions(result.sessions)
      setMessage(result.invalidRecords.length ? `${result.invalidRecords.length} unreadable saved records excluded from recorded pace.` : '')
    }).catch(error => {
      if (live) setMessage(`Recorded pace storage error: ${error instanceof Error ? error.message : String(error)}. Curated rates retained.`)
    })
    return () => { live = false }
  }, [revision]))
  return { sessions, now, message, choices, setChoices, refresh }
}
