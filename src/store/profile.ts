// Profile state for the star map. The app's profile store is not a plugin door;
// `host.state.profile` + `host.profiles.list()` are.
import { host } from '@hermes/plugin-sdk'
import { atom } from 'nanostores'

import type { ProfileInfo } from '@/types/hermes'

export const $profiles = atom<ProfileInfo[]>([])
export const $activeProfile = atom<string>('default')
/** Alias used by the feature's "drop per-profile state on switch" hook. */
export const $activeGatewayProfile = atom<string>('default')

export function normalizeProfileKey(name?: null | string): string {
  return (name ?? '').trim() || 'default'
}

export function profileLabel(profile: ProfileInfo): string {
  return String(profile.label ?? profile.name ?? profile.key ?? 'default')
}

export async function refreshProfiles(): Promise<void> {
  try {
    const result = await (host as any).profiles?.list?.()
    const list = Array.isArray(result?.profiles) ? result.profiles : []
    $profiles.set(list)
  } catch {
    $profiles.set([])
  }
}

/** Fresh chat draft in the active profile (conclusion "start a conversation"). */
export function requestFreshSession(): void {
  try {
    ;(host as any).newChat?.()
  } catch {
    /* older build: the caller falls back to the active chat */
  }
}

export function syncProfileState(profile: string | null | undefined): void {
  const key = normalizeProfileKey(profile)
  $activeProfile.set(key)
  $activeGatewayProfile.set(key)
}
