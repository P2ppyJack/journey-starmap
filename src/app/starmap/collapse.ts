import type { StarmapEdge, StarmapGraph, StarmapNode } from '@/types/hermes'

/**
 * Identical conclusion texts are separate rows in the corpus (the deriver
 * re-derives the same fact per session), so the map otherwise draws the same
 * sentence many times.
 *
 * Collapsing is a VIEW, never a drop: the payload still carries every card, node
 * ids keep their positions (so `memById` stays aligned), and the survivor's label
 * carries `×N` so the repetition stays visible. File memory (MEMORY.md / USER.md)
 * is never collapsed — only Honcho conclusion cards.
 */
export const COLLAPSE_KEY = 'hermes.plugin.journey-starmap.collapse'

export interface CollapsedView {
  graph: StarmapGraph
  hidden: number
  texts: number
}

function isConclusion(node: StarmapNode): boolean {
  return node.kind === 'memory' && String(node.memorySource ?? '').toLowerCase() === 'honcho'
}

function fingerprintOf(node: StarmapNode): string {
  const parts = String(node.id).split(':')

  return parts.length > 1 ? parts[parts.length - 1] : String(node.id)
}

export function collapseIdentical(graph: StarmapGraph): CollapsedView {
  const totals = new Map<string, number>()

  for (const node of graph.nodes) {
    if (!isConclusion(node)) {
      continue
    }

    const fingerprint = fingerprintOf(node)
    totals.set(fingerprint, (totals.get(fingerprint) ?? 0) + 1)
  }

  const kept = new Set<string>()
  const nodes: StarmapNode[] = []
  const repeated = new Set<string>()
  let hidden = 0

  for (const node of graph.nodes) {
    if (!isConclusion(node)) {
      nodes.push(node)
      continue
    }

    const fingerprint = fingerprintOf(node)
    const count = totals.get(fingerprint) ?? 1

    if (count > 1 && kept.has(fingerprint)) {
      hidden += 1
      continue
    }

    kept.add(fingerprint)

    if (count > 1) {
      repeated.add(fingerprint)
      nodes.push({ ...node, label: `${node.label} ·×${count}` })
    } else {
      nodes.push(node)
    }
  }

  const ids = new Set(nodes.map(node => node.id))
  const edges: StarmapEdge[] = graph.edges.filter(edge => ids.has(edge.source) && ids.has(edge.target))

  return { graph: { ...graph, edges, nodes }, hidden, texts: repeated.size }
}
