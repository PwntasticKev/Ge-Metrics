import { router } from 'expo-router'
import { useState } from 'react'
import { Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { gpFull, signed } from '../../lib/format'
import { useTheme } from '../../theme/ThemeProvider'
import { parseGp } from './activity'
import type { useConfirmedCapital } from './useConfirmedCapital'

type Props = ReturnType<typeof useConfirmedCapital> & { cost: number | null; profit: number | null }

export function ConfirmedCapitalPanel ({ capital, declaration, reserve, setReserve, confirm, ready, cost, profit }: Props) {
  const { palette } = useTheme()
  const insets = useSafeAreaInsets()
  const [editing, setEditing] = useState(false)
  const [amount, setAmount] = useState('')
  const ink = { color: palette.ink }
  const muted = { color: palette.muted }
  const valid = ready && parseGp(amount) !== null && parseGp(reserve, true) !== null
  const actions = capital.nextActions
  const message = !ready ? 'Loading recorded offers…' : capital.status === 'reconfirm'
    ? 'Recorded activity or planning settings changed. Confirm your current total again.'
    : capital.status === 'reconcile' ? 'Reconcile records in slots and Bought before planning.'
      : capital.status === 'invalid' ? 'Enter valid whole GP amounts before planning.'
        : capital.status === 'unknown' ? 'Spendable cash unknown. Confirm your current total to plan.' : null
  const open = () => {
    setAmount(declaration ? String(declaration.amountGp) : '')
    setEditing(true)
  }
  const submit = () => {
    if (confirm(amount)) { Keyboard.dismiss(); setEditing(false) }
  }
  const reserveGp = parseGp(reserve, true)
  return (
    <View style={[styles.panel, { backgroundColor: palette.card, borderColor: palette.rule }]}>
      <View style={styles.row}>
        <Text style={[styles.title, ink]} accessibilityRole="header">Cash available now</Text>
        <Pressable onPress={open} accessibilityRole="button" style={styles.link}><Text style={{ color: palette.brand, fontWeight: '600' }}>{declaration ? 'Reconfirm' : 'Confirm cash'}</Text></Pressable>
      </View>
      {message ? <Text style={[styles.body, ink]} accessibilityRole="alert">{message}</Text> : null}
      {declaration ? <Text style={[styles.body, muted]}>{capital.status === 'ready' ? 'Confirmed' : 'Previous confirmation'}: {gpFull(declaration.amountGp)} GP · {new Date(declaration.confirmedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text> : null}
      <Text style={[styles.body, muted]}>Keep aside {reserveGp === null ? 'invalid' : `${gpFull(reserveGp)} GP`} · {capital.freeSlots} free slots</Text>
      {capital.spendableGp !== null ? <Text style={[styles.body, ink]}>For plan {gpFull(capital.spendableGp)} GP · Cost {cost === null ? 'loading…' : `${gpFull(cost)} GP`} · Left {cost === null ? 'unknown' : `${gpFull(Math.max(0, capital.spendableGp - cost))} GP`}{profit === null ? '' : `\nEstimated profit ${signed(profit)} · fill times are estimates`}</Text> : null}
      <Pressable accessibilityRole="link" onPress={() => router.push('/tools/slots')} style={styles.link}><Text style={[styles.body, { color: palette.brand }]}>Open offers ({actions.reviewOpenOffers}) · Collection unknown ({actions.reviewCollection}) ›</Text></Pressable>
      <Pressable accessibilityRole="link" onPress={() => router.push({ pathname: '/watchlist', params: { view: 'bought', request: String(Date.now()) } })} style={styles.link}><Text style={[styles.body, { color: palette.brand }]}>Review inventory in Bought ({actions.reviewInventory}) ›</Text></Pressable>
      {actions.reviewHistoricalSales > 0 ? <Pressable accessibilityRole="link" onPress={() => router.push({ pathname: '/watchlist', params: { view: 'profit', request: String(Date.now()) } })} style={styles.link}><Text style={[styles.body, { color: palette.brand }]}>Historical sales · collection unknown ({actions.reviewHistoricalSales}) ›</Text></Pressable> : null}
      <Text style={[styles.small, muted]}>Sales, fills and cancellations never add cash. After collecting, confirm a new total. Resets when this screen/session remounts.</Text>
      <Modal visible={editing} animationType="slide" onRequestClose={() => setEditing(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.modal, { backgroundColor: palette.bg, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
            <Text style={[styles.heading, ink]} accessibilityRole="header">Confirm spendable GP now</Text>
            <Text style={[styles.body, muted]}>Enter your total already collected and available, excluding GP committed to offers. Existing commitments are not deducted again.</Text>
            <Text style={[styles.label, ink]}>Spendable total (whole GP)</Text>
            <TextInput accessibilityLabel="Spendable total in whole GP" value={amount} onChangeText={setAmount} inputMode="numeric" placeholder="Unknown until confirmed" placeholderTextColor={palette.muted} style={[styles.input, ink, { backgroundColor: palette.well }]} />
            <Text style={[styles.label, ink]}>Keep aside (optional whole GP)</Text>
            <TextInput accessibilityLabel="Keep aside in whole GP" value={reserve} onChangeText={setReserve} inputMode="numeric" placeholder="0" placeholderTextColor={palette.muted} style={[styles.input, ink, { backgroundColor: palette.well }]} />
            <Text style={[styles.body, muted]}>Reserve is deducted once. Use digits only, without commas or K/M. Editing the reserve requires a fresh confirmation.</Text>
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: !valid }} disabled={!valid} onPress={submit} style={[styles.confirm, { backgroundColor: palette.brand }, !valid && { opacity: 0.45 }]}><Text style={{ color: palette.onBrand, fontWeight: '600' }}>Confirm current total</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => { Keyboard.dismiss(); setEditing(false) }} style={styles.confirm}><Text style={{ color: palette.brand }}>Close</Text></Pressable>
            <Text style={[styles.body, muted]}>This declaration stays only on this mounted screen. It is not saved between screen/session remounts.</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  panel: { marginHorizontal: 16, marginVertical: 8, padding: 12, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, gap: 5 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  title: { fontSize: 15, fontWeight: '600' },
  body: { fontSize: 12.5, lineHeight: 18 },
  small: { fontSize: 11.5, lineHeight: 16 },
  link: { minHeight: 44, justifyContent: 'center' },
  modal: { flex: 1 },
  form: { padding: 20, gap: 12 },
  heading: { fontSize: 24, fontWeight: '700' },
  label: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  input: { minHeight: 48, paddingHorizontal: 12, borderRadius: 10, fontSize: 18 },
  confirm: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 10, marginTop: 8 }
})
