// Session tiles are app-internal. The plugin opens sessions through the SDK
// instead, so this module exists only to keep the ported view's imports honest
// and to expose the active-session signal it reads.
import { host } from '@hermes/plugin-sdk'

import type { RecallNodeRef } from '@/app/starmap/recall'

export const $activeSessionId = host.state.activeSessionId
export const $selectedStoredSessionId = host.state.activeSessionId
export const $sessionTiles = { get: () => [], listen: () => () => {} } as const

export function openSessionTile(
  storedSessionId: string,
  _placement?: string,
  _ownerProfile?: string,
  _ownerRoute?: unknown,
  opts?: { ownerProfile?: string }
): void {
  ;(host as any).openSession?.(storedSessionId, {
    profile: opts?.ownerProfile,
    intent: 'stack'
  })
}

export function openOwnedSession(id: string, owner?: Pick<RecallNodeRef, 'connectionId' | 'profile'>): void {
  ;(host as any).openSession?.(id, { profile: owner?.profile, intent: 'stack' })
}
