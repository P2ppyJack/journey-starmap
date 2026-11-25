// Star-map graph state for the plugin page: on-demand cache, multi-profile
// selection (persisted), and the /recall mode flag.
import { atom } from 'nanostores'

import { $apiRequestScope } from '@/api/client'
import { getStarmapGraph, getStarmapGraphMultiProfile } from '@/hermes'

import { normalizeProfileKey } from './profile'

export const $starmapGraph = atom<any>(null)
export const $starmapLoading = atom(false)
export const $starmapError = atom<null | string>(null)
export const $starmapRecallMode = atom(false)

const SELECTED_PROFILES_KEY = 'hermes.plugin.journey-starmap.selectedProfiles'

function readSelection(): string[] {
  try {
    const raw = window.localStorage.getItem(SELECTED_PROFILES_KEY)
    const parsed = raw ? JSON.parse(raw) : []

    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : []
  } catch {
    return []
  }
}

export const $starmapSelectedProfiles = atom<string[]>(readSelection())

$starmapSelectedProfiles.listen(value => {
  try {
    window.localStorage.setItem(SELECTED_PROFILES_KEY, JSON.stringify(value))
  } catch {
    /* a locked-down renderer keeps the in-memory selection */
  }

  resetStarmapGraph()
})

let inflight: Promise<void> | null = null
let epoch = 0

export function resetStarmapGraph(): void {
  epoch += 1
  inflight = null
  $starmapGraph.set(null)
  $starmapLoading.set(false)
  $starmapError.set(null)
}

export function setStarmapSelectedProfiles(profiles: string[]): void {
  $starmapSelectedProfiles.set([...new Set(profiles.map(normalizeProfileKey))])
}

export function toggleStarmapProfile(profile: string, enabled: boolean): void {
  const key = normalizeProfileKey(profile)
  const current = $starmapSelectedProfiles.get()
  const next = enabled ? [...new Set([...current, key])] : current.filter(item => item !== key)

  $starmapSelectedProfiles.set(next)
}

export async function loadStarmapGraph(force = false): Promise<void> {
  if (inflight) {
    return inflight
  }

  if ($starmapGraph.get() && !force) {
    return
  }

  $starmapLoading.set(true)
  $starmapError.set(null)
  const started = epoch

  inflight = (async () => {
    try {
      const selected = $starmapSelectedProfiles.get()
      const scope = $apiRequestScope.get()
      const owner = { ...scope, profile: selected[0] ?? scope.profile }
      const graph = selected.length > 1 ? await getStarmapGraphMultiProfile(selected, owner) : await getStarmapGraph(owner)

      if (started === epoch) {
        $starmapGraph.set(graph)
      }
    } catch (error) {
      if (started === epoch) {
        $starmapError.set(error instanceof Error ? error.message : String(error))
      }
    } finally {
      if (started === epoch) {
        $starmapLoading.set(false)
        inflight = null
      }
    }
  })()

  return inflight
}

/** Load now and again after the owning profile + its profile list settle. */
export function watchStarmapGraph(): () => void {
  void loadStarmapGraph()

  const offScope = $apiRequestScope.listen(() => {
    resetStarmapGraph()
    void loadStarmapGraph()
  })

  return offScope
}

export function setStarmapRecallMode(value: boolean): void {
  $starmapRecallMode.set(value)
}

export function clearStarmapRecall(): void {
  $starmapRecallMode.set(false)
}

/** Optimistic removal for the context menu; returns a rollback. */
export function evictStarmapNode(id: string): () => void {
  const graph = $starmapGraph.get()

  if (!graph) {
    return () => {}
  }

  const previous = graph
  const nodes = (graph.nodes ?? []).filter((node: any) => node.id !== id)
  const edges = (graph.edges ?? []).filter((edge: any) => edge.source !== id && edge.target !== id)

  $starmapGraph.set({ ...graph, edges, nodes })

  return () => $starmapGraph.set(previous)
}
