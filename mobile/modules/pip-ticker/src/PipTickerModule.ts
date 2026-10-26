import { NativeModule, requireOptionalNativeModule } from 'expo'
import type { PipTickerModuleEvents, TickerPayload } from './PipTicker.types'

declare class PipTickerModule extends NativeModule<PipTickerModuleEvents> {
  isSupported (): boolean
  isActive (): Promise<boolean>
  update (payload: TickerPayload): Promise<void>
  setAutoStart (enabled: boolean): Promise<void>
  /** Call from a user tap. Rejects with a readable message if PiP can't start. */
  start (): Promise<void>
  stop (): Promise<void>
}

// Optional so Android (no native side) and older builds don't crash.
export default requireOptionalNativeModule<PipTickerModule>('PipTicker')
