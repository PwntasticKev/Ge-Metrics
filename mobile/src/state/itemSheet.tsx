import { router, useGlobalSearchParams } from 'expo-router'
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ItemSheet } from '../components/ItemSheet'

// Dev builds made with EXPO_PUBLIC_GEM_SHARE_EXPORT=1 accept ?card=export on an
// item link: the sheet writes its share card PNG to the documents dir (for
// screenshots without the share sheet). Off in normal builds.
const SHARE_EXPORT = process.env.EXPO_PUBLIC_GEM_SHARE_EXPORT === '1'

// One item details sheet for the whole app; any row can open it.
interface ItemSheetContextValue {
  openItem: (itemId: number) => void
}

const ItemSheetContext = createContext<ItemSheetContextValue | null>(null)

export function ItemSheetProvider ({ children }: { children: ReactNode }) {
  // The last item stays rendered while the sheet slides away.
  const [itemId, setItemId] = useState<number | null>(null)
  const [visible, setVisible] = useState(false)
  const [exportCard, setExportCard] = useState(false)
  const visibleRef = useRef(visible)
  useLayoutEffect(() => { visibleRef.current = visible }, [visible])
  const openItem = useCallback((id: number) => {
    setExportCard(false)
    setItemId(id)
    setVisible(true)
  }, [])

  // Links like gemetrics:///?item=13190 open an item from anywhere. The param
  // is cleared once used so switching tabs doesn't reopen it, and the same
  // link works again later.
  const { item, card } = useGlobalSearchParams<{ item?: string; card?: string }>()
  useEffect(() => {
    const id = Number(item)
    if (!Number.isInteger(id) || id <= 0) return
    // Syncing from the URL, an external source, is what effects are for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    openItem(id)
    // After openItem, which clears it.
    setExportCard(SHARE_EXPORT && card === 'export')
    router.setParams({ item: undefined, card: undefined })
  }, [item, card, openItem])

  const value = useMemo(() => ({ openItem }), [openItem])
  return (
    <ItemSheetContext.Provider value={value}>
      {children}
      <ItemSheet itemId={itemId} visible={visible} exportCard={exportCard} onClose={() => setVisible(false)} onDismissed={() => { if (!visibleRef.current) setItemId(null) }} />
    </ItemSheetContext.Provider>
  )
}

export function useItemSheet (): ItemSheetContextValue {
  const context = useContext(ItemSheetContext)
  if (!context) throw new Error('useItemSheet must be used inside ItemSheetProvider')
  return context
}
