// Notifications: the SDK's toast door, in the shape the ported code calls.
import { host } from '@hermes/plugin-sdk'

export interface NotifyInput {
  detail?: string
  kind?: 'error' | 'info' | 'success' | 'warning'
  message: string
  title?: string
}

export function notify(input: NotifyInput): void {
  try {
    host.notify(input as any)
  } catch {
    /* a locked-down window must not break the caller */
  }
}

export function notifyError(error: unknown, fallbackMessage?: string): void {
  try {
    ;(host as any).notifyError?.(error, fallbackMessage)
  } catch {
    notify({ kind: 'error', message: fallbackMessage || String(error) })
  }
}
