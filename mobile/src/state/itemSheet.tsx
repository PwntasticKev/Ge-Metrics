import { router, useGlobalSearchParams } from 'expo-router'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ItemSheet } from '../components/ItemSheet'

// One item details sheet for the whole app; any row can open it.
interface ItemSheetContextValue {
  openItem: (itemId: number) => void
}

const ItemSheetContext = createContext<ItemSheetContextValue | null>(null)

export function ItemSheetProvider ({ children }: { children: ReactNode }) {
  // The last item stays rendered while the sheet slides away.
  const [itemId, setItemId] = useState<number | null>(null)
  const [visible, setVisible] = useState(false)
  const visibleRef = useRef(visible)
  visibleRef.current = visible
  const openItem = useCallback((id: number) => {
    setItemId(id)
    setVisible(true)
  }, [])

  // Links like gemetrics:///?item=13190 open an item from anywhere. The param
  // is cleared once used so switching tabs doesn't reopen it, and the same
  // link works again later.
  const { item } = useGlobalSearchParams<{ item?: string }>()
  useEffect(() => {
    const id = Number(item)
    if (!Number.isInteger(id) || id <= 0) return
    openItem(id)
    router.setParams({ item: undefined })
  }, [item, openItem])

  const value = useMemo(() => ({ openItem }), [openItem])
  return (
    <ItemSheetContext.Provider value={value}>
      {children}
      <ItemSheet itemId={itemId} visible={visible} onClose={() => setVisible(false)} onDismissed={() => { if (!visibleRef.current) setItemId(null) }} />
    </ItemSheetContext.Provider>
  )
}

export function useItemSheet (): ItemSheetContextValue {
  const context = useContext(ItemSheetContext)
  if (!context) throw new Error('useItemSheet must be used inside ItemSheetProvider')
  return context
}
