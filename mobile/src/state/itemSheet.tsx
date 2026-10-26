import { useGlobalSearchParams } from 'expo-router'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ItemSheet } from '../components/ItemSheet'

// One item details sheet for the whole app; any row can open it.
interface ItemSheetContextValue {
  openItem: (itemId: number) => void
}

const ItemSheetContext = createContext<ItemSheetContextValue | null>(null)

export function ItemSheetProvider ({ children }: { children: ReactNode }) {
  const [itemId, setItemId] = useState<number | null>(null)
  const openItem = useCallback((id: number) => setItemId(id), [])
  // Links like gemetrics:///?item=13190 open an item from anywhere.
  const { item } = useGlobalSearchParams<{ item?: string }>()
  useEffect(() => {
    const id = Number(item)
    if (Number.isInteger(id) && id > 0) setItemId(id)
  }, [item])
  const value = useMemo(() => ({ openItem }), [openItem])
  return (
    <ItemSheetContext.Provider value={value}>
      {children}
      <ItemSheet itemId={itemId} onClose={() => setItemId(null)} />
    </ItemSheetContext.Provider>
  )
}

export function useItemSheet (): ItemSheetContextValue {
  const context = useContext(ItemSheetContext)
  if (!context) throw new Error('useItemSheet must be used inside ItemSheetProvider')
  return context
}
