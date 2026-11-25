/**
 * The star map's backend door.
 *
 * Every call goes through `ctx.rest('/…')`, which the app scopes to
 * `/api/plugins/journey-starmap/…` by construction. The module-level `rest` is
 * installed by the plugin's `register()`; calling an API before that is a
 * programming error and throws rather than returning a silent empty result.
 */

export type ProfileScope = undefined | null | string | { connectionId?: null | string; profile?: null | string }

type Rest = <T = any>(path: string, options?: { body?: unknown; method?: string; timeoutMs?: number }) => Promise<T>

let rest: Rest | null = null

export function configureApi(next: Rest): void {
  rest = next
}

function call<T = any>(path: string, options?: { body?: unknown; method?: string; timeoutMs?: number }): Promise<T> {
  if (!rest) {
    return Promise.reject(new Error('journey-starmap: backend door not configured'))
  }

  return rest<T>(path, options)
}

export function profileOf(scope?: ProfileScope): string | undefined {
  if (!scope) {
    return undefined
  }

  const name = typeof scope === 'string' ? scope : scope.profile
  const trimmed = String(name ?? '').trim()

  return trimmed || undefined
}

function qs(params: Record<string, boolean | number | string | undefined>): string {
  const parts = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)

  return parts.length ? `?${parts.join('&')}` : ''
}

function failure(payload: any, fallback: string): Error {
  return new Error(String(payload?.message || payload?.detail || payload?.error || fallback))
}

export interface StarmapGraphPayload {
  edges?: unknown[]
  graph: any
  nodes?: number
  provider_cards?: any
}

export async function getStarmapGraph(scope?: ProfileScope): Promise<any> {
  const profile = profileOf(scope)
  const payload = await call<StarmapGraphPayload>(`/graph${qs({ profile })}`)

  if (!payload || payload.graph == null) {
    throw failure(payload, 'the graph route failed')
  }

  return payload.graph
}

export async function getStarmapGraphMultiProfile(profiles: string[], scope?: ProfileScope): Promise<any> {
  const payload = await call<StarmapGraphPayload>(`/graph${qs({ profiles: profiles.join(',') })}`)

  if (!payload || payload.graph == null) {
    throw failure(payload, 'the multi-profile graph route failed')
  }

  return payload.graph
}

export async function getLearningNode(id: string, scope?: ProfileScope): Promise<any> {
  const payload = await call(`/node/${encodeURIComponent(id)}${qs({ profile: profileOf(scope) })}`)

  if (payload?.ok === false) {
    throw failure(payload, 'could not load that node')
  }

  return { ...(payload?.node ?? {}), ...payload }
}

export async function editLearningNode(id: string, content: string, scope?: ProfileScope): Promise<{ message?: string; ok: boolean }> {
  const payload = await call(`/node/${encodeURIComponent(id)}`, {
    body: { content, profile: profileOf(scope) },
    method: 'PUT'
  })

  return payload?.ok === false ? { message: String(payload.message || payload.error || 'edit failed'), ok: false } : { ok: true }
}

export async function deleteLearningNode(id: string, scope?: ProfileScope): Promise<{ message?: string; ok: boolean }> {
  const payload = await call(`/node/${encodeURIComponent(id)}${qs({ profile: profileOf(scope) })}`, { method: 'DELETE' })

  return payload?.ok === false
    ? { message: String(payload.message || payload.error || 'delete failed'), ok: false }
    : { ok: true }
}

export async function getLearningRecallDraft(id: string, scope?: ProfileScope): Promise<any> {
  return call(`/recall-draft${qs({ id, profile: profileOf(scope) })}`)
}

export async function crossInsertLearningNode(
  id: string,
  sourceProfile: string,
  targetProfile: string,
  _scope?: ProfileScope
): Promise<{ message?: string; ok: boolean }> {
  const payload = await call('/node/cross-insert', {
    body: { id, source_profile: sourceProfile, target_profile: targetProfile },
    method: 'POST'
  })

  return payload?.ok === false
    ? { message: String(payload.message || payload.error || 'cross-profile insert failed'), ok: false }
    : { ok: true }
}

export interface ProviderSessionMessage {
  content: string
  peer?: string
  role?: 'assistant' | 'user'
  timestamp?: null | number
}

export async function getLearningProviderSession(
  sessionId: string,
  scope?: ProfileScope
): Promise<{ messages: ProviderSessionMessage[] }> {
  const payload = await call(`/provider-session${qs({ session_id: sessionId, profile: profileOf(scope) })}`)

  if (payload?.ok === false) {
    throw failure(payload, 'could not load the source data')
  }

  return { messages: Array.isArray(payload?.messages) ? payload.messages : [] }
}

export async function materializeLearningProviderSession(
  sessionId: string,
  scope?: ProfileScope
): Promise<{ session_id: string }> {
  const payload = await call('/materialize', {
    body: { profile: profileOf(scope), session_id: sessionId },
    method: 'POST'
  })

  if (payload?.ok === false) {
    throw failure(payload, 'could not recreate the conversation')
  }

  return { session_id: String(payload.session_id) }
}

export async function getSession(id: string, scope?: ProfileScope): Promise<any> {
  const payload = await call(`/session/${encodeURIComponent(id)}${qs({ profile: profileOf(scope) })}`)

  if (payload?.ok === false) {
    throw failure(payload, 'session not found')
  }

  return payload
}

export async function searchSessions(
  q: string,
  scope?: ProfileScope
): Promise<{ results: Array<{ session_id: string; session_started?: null | number; snippet?: string }> }> {
  const payload = await call(`/sessions/search${qs({ limit: 12, profile: profileOf(scope), q })}`)
  const results = Array.isArray(payload?.results) ? payload.results : []

  return { results }
}

export async function listRecentSessions(
  limit: number,
  scope?: ProfileScope
): Promise<Array<{ _lineage_root_id?: string; id: string; title?: string }>> {
  const payload = await call(`/sessions/recent${qs({ limit, profile: profileOf(scope) })}`)
  const rows = Array.isArray(payload?.sessions) ? payload.sessions : []

  return rows.map((row: any) => ({
    _lineage_root_id: row._lineage_root_id ?? row.lineage_root_id ?? undefined,
    id: String(row.id ?? ''),
    title: row.title ?? ''
  }))
}
