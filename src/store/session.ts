// Recent sessions, read from the plugin backend (which proxies the dashboard's
// session list). Only what the star map's menus need: id + title.
import { atom } from 'nanostores'

import { listRecentSessions } from '@/hermes'

export interface SessionRow {
  _lineage_root_id?: string
  id: string
  title?: string
}

export const $sessions = atom<SessionRow[]>([])

export async function refreshRecentSessions(profile?: string): Promise<SessionRow[]> {
  try {
    const rows = await listRecentSessions(5, profile ? { profile } : undefined)
    $sessions.set(rows)
    return rows
  } catch {
    $sessions.set([])
    return []
  }
}

export function sessionTitle(row: SessionRow): string {
  const title = String(row.title ?? '').trim()
  return title || row.id
}
