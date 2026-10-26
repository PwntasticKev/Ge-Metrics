import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { loadJson, saveJson } from './storage'

// State mirrored to AsyncStorage. Changes made before the saved value has
// loaded are merged into it (not overwritten by it), and saving happens in an
// effect after React commits, never inside a state updater.
export function usePersistentState<T> (
  key: string,
  initial: T,
  parse: (raw: unknown) => T,
  merge: (saved: T, early: T) => T
): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(initial)
  const loaded = useRef(false)

  useEffect(() => {
    let cancelled = false
    loadJson<unknown>(key, null, (v): v is unknown => true).then(raw => {
      if (cancelled) return
      const saved = raw === null ? initial : parse(raw)
      setState(early => (early === initial ? saved : merge(saved, early)))
      loaded.current = true
    })
    return () => { cancelled = true }
    // Load once per key; `initial`, `parse` and `merge` are expected to be stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  useEffect(() => {
    if (loaded.current) saveJson(key, state)
  }, [key, state])

  return [state, setState]
}
