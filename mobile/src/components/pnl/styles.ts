import { StyleSheet } from 'react-native'
import type { Palette } from '../../theme/tokens'
import { space } from '../../theme/tokens'

/** Gains in the profit blue; losses in muted grey, never red. */
export const toneOf = (n: number | null, palette: Palette) => (n === null || n === 0 ? palette.ink : n > 0 ? palette.profit : palette.muted)

export const pnlStyles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: space.lg, gap: space.sm },
  group: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  section: { fontSize: 13, fontWeight: '600', marginTop: space.sm },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: space.md },
  label: { fontSize: 13, flexShrink: 1 },
  value: { fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
  note: { fontSize: 12.5, lineHeight: 17 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: 10 },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  rowMeta: { fontSize: 12.5, marginTop: 1, fontVariant: ['tabular-nums'] },
  rowRight: { alignItems: 'flex-end' },
  rowValue: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  link: { fontSize: 13, fontWeight: '600' }
})
