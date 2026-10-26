import { requireNativeView } from 'expo'
import type { ComponentType } from 'react'
import type { PipTickerViewProps } from './PipTicker.types'

const NativeView: ComponentType<PipTickerViewProps> = requireNativeView('PipTicker')

export default function PipTickerView (props: PipTickerViewProps) {
  return <NativeView {...props} />
}
