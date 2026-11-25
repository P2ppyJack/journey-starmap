import type { ProfileScope } from '@/hermes'

// Recall / insert node addressing — shared by the star-map host callbacks.
//
// In multi-profile mode graph node ids arrive PREFIXED (`<profile>:<id>`) and
// the node may belong to a DIFFERENT profile than the active one. The server
// only knows ORIGINAL (unprefixed) ids, and profile-scoped endpoints resolve
// content against whichever profile the request names — so every recall/insert
// call must (a) unprefix the id and (b) scope the request to the node's OWN
// profile. Dropping either half yields the "Could not load that memory to
// insert." toast for any node outside the active profile (404 server-side).

/** The node fields recall/insert hosts need. `profile`/`_originalId` are only
 *  set in multi-profile mode. */
export interface RecallNodeRef {
  connectionId?: string
  _originalId?: string
  id: string
  kind: 'memory' | 'skill'
  label: string
  profile?: string
}

/** Preserve both halves of a graph node's owner; absent legacy ownership follows ambient routing. */
export function learningNodeScope(node: Pick<RecallNodeRef, 'connectionId' | 'profile'>): ProfileScope {
  return node.connectionId ? { connectionId: node.connectionId, profile: node.profile } : node.profile
}

/** Resolve the server-addressable id + profile scope for a node.
 *
 *  Prefers the explicit `_originalId` the multi-profile merge attached; falls
 *  back to stripping a verified `<profile>:` prefix; single-profile nodes
 *  (no profile tag) pass through untouched — their ids legitimately contain
 *  colons (`memory:honcho:1197`), so never split on `:` blindly. */
export function resolveRecallTarget(node: RecallNodeRef): { id: string; profile?: string } {
  const id = node._originalId
    ?? (node.profile && node.id.startsWith(`${node.profile}:`)
      ? node.id.slice(node.profile.length + 1)
      : node.id)

  return node.profile ? { id, profile: node.profile } : { id }
}
