import type { StarmapGraph, StarmapMemoryCard } from '@/types/hermes'

/** Memory indices restart per profile, not per source or merged array. Keep
 *  fingerprinted and legacy IDs aligned for both tooltips and body search. */
export function memoryCardsByNodeId(graph: Pick<StarmapGraph, 'memory'>): Map<string, StarmapMemoryCard> {
  const cards = new Map<string, StarmapMemoryCard>()
  const indices = new Map<string, number>()

  for (const card of graph.memory) {
    const profile = card.profile ?? ''
    const index = indices.get(profile) ?? 0
    indices.set(profile, index + 1)
    const id = `${profile ? `${profile}:` : ''}memory:${card.source}:${index}`
    cards.set(id, card)

    if (card.fingerprint) {
      cards.set(`${id}:${card.fingerprint}`, card)
    }
  }

  return cards
}
