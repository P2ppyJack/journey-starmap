/**
 * Scene smoke test — runs the REAL ported renderer against a stub 2D context.
 *
 * It does not prove pixels; it proves the entry wiring (simulation → scene →
 * drawScene) holds together with a real-shaped graph, so a runtime crash in the
 * app is not the first time this code executes.
 */

import { collapseIdentical } from '../src/app/starmap/collapse'
import { RING_OUTER } from '../src/app/starmap/constants'
import { computePalette } from '../src/app/starmap/color'
import { fitViewport } from '../src/app/starmap/geometry'
import { memoryCardsByNodeId } from '../src/app/starmap/memory-cards'
import { drawScene } from '../src/app/starmap/render'
import { EMPTY_FILTERS, filterNodes } from '../src/app/starmap/search'
import { resolveRecallTarget } from '../src/app/starmap/recall'
import { decodeShareCode, encodeShareCode } from '../src/app/starmap/share-code'
import { buildSimulation } from '../src/app/starmap/simulation'

const gradient = { addColorStop() {} }

function stubContext() {
  const target: Record<string, any> = {
    canvas: { height: 600, width: 800 },
    createLinearGradient: () => gradient,
    createPattern: () => null,
    createRadialGradient: () => gradient,
    fillStyle: '#000000',
    getImageData: () => {
      const hex = String(target.fillStyle).replace('#', '')
      const full = hex.length === 3 ? hex.split('').map((c: string) => c + c).join('') : hex.padEnd(6, '0')

      return {
        data: [
          parseInt(full.slice(0, 2), 16) || 0,
          parseInt(full.slice(2, 4), 16) || 0,
          parseInt(full.slice(4, 6), 16) || 0,
          255
        ]
      }
    },
    measureText: (text: string) => ({ actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2, width: String(text).length * 6 })
  }

  return new Proxy(target, {
    get(obj, prop) {
      if (prop in obj) {
        return obj[prop]
      }

      // any drawing verb is a no-op; any style property reads as a neutral value
      return typeof prop === 'string' && /^(fill|stroke|text|draw|clip|save|restore|set|scale|translate|rotate|begin|close|move|line|arc|ellipse|rect|quad|bezier|create|put|get|is|reset|clear)/.test(prop)
        ? () => undefined
        : obj[prop as string]
    },
    set(obj, prop, value) {
      obj[prop as string] = value

      return true
    }
  }) as unknown as CanvasRenderingContext2D
}

const graph = {
  edges: [
    { source: 'alpha-skill', target: 'beta-skill' },
    { source: 'beta-skill', target: 'memory:memory:0:abc123' }
  ],
  memory: [
    { source: 'memory', timestamp: Date.now() - 86_400_000, title: 'A remembered fact' },
    { source: 'memory', timestamp: Date.now(), title: 'A recent fact' }
  ],
  nodes: [
    { category: 'alpha', id: 'alpha-skill', kind: 'skill', label: 'alpha-skill', timestamp: Date.now() - 90_000_000, useCount: 4 },
    { category: 'beta', id: 'beta-skill', kind: 'skill', label: 'beta-skill', timestamp: Date.now() - 30_000_000, useCount: 1 },
    {
      category: 'memory',
      id: 'memory:memory:0:abc123',
      kind: 'memory',
      label: 'A remembered fact',
      memorySource: 'memory',
      timestamp: Date.now() - 86_400_000
    },
    { category: 'memory', id: 'memory:memory:1:def456', kind: 'memory', label: 'A recent fact', memorySource: 'memory', timestamp: Date.now() }
  ]
}

const size = { h: 600, w: 800 }
let ticks = 0
const built = buildSimulation(graph as any, () => {
  ticks += 1
})

const rings = built.rings
const vp = fitViewport(size.w, size.h, rings[rings.length - 1]?.r ?? RING_OUTER)
const adjacency = new Map<string, Set<string>>()

for (const node of graph.nodes) {
  adjacency.set(node.id, new Set())
}

for (const edge of graph.edges) {
  adjacency.get(edge.source)?.add(edge.target)
  adjacency.get(edge.target)?.add(edge.source)
}

const memById = memoryCardsByNodeId(graph as any)
const canvas = { height: 1200, style: {}, width: 1600 }

;(globalThis as any).getComputedStyle = () => ({
  color: '#d8d8d8',
  getPropertyValue: (key: string) => ({ '--background': '#0b0b0f', '--theme-primary': '#7c9cff' } as Record<string, string>)[key] ?? ''
})
;(globalThis as any).window = { addEventListener() {}, devicePixelRatio: 2 }

// Renderer code allocates offscreen canvases (static layer, orb sprites) and
// resolveRgb() paints a 1×1 probe; one full stub context serves all of them.
function makeCanvas(width = 1, height = 1) {
  return { getContext: () => stubContext(), height, style: {}, width }
}

;(globalThis as any).document = { createElement: () => makeCanvas(), fonts: { load: () => Promise.resolve([]) } }


const palette = computePalette(canvas as any)

// let the force simulation lay out without an event loop
built.sim.tick(60)

const scene = {
  adjacency,
  byId: built.byId,
  conclusionIds: null,
  ctx: stubContext(),
  dpr: 2,
  fades: { appear: new Map(), labels: new Map(), links: new Map(), nodes: new Map(), rings: new Map() },
  filterMatches: null,
  focusId: null,
  hoverId: null,
  hoverLink: null,
  hoverRing: null,
  links: built.links,
  memById,
  nodes: built.nodes,
  palette,
  reveal: 1,
  rings,
  selectedRing: null,
  size,
  snapMotion: true,
  vp
}

const result = drawScene(scene as any)
built.sim.stop()

// Filter-only search must narrow to the same subset the sidebar would paint.
const searchHits = filterNodes(graph as any, 'recent', EMPTY_FILTERS).map(node => node.id)
const unfiltered = filterNodes(graph as any, '', EMPTY_FILTERS).map(node => node.id)

const laidOut = built.nodes.filter(node => Number.isFinite(node.x) && Number.isFinite(node.y)).length

console.log(
  JSON.stringify(
    {
      animating: result.animating,
      byId: built.byId.size,
      laidOut,
      links: built.links.length,
      nodes: built.nodes.length,
      onTickCalls: ticks,
      ringLabelRects: result.ringLabelRects?.length ?? 0,
      rings: rings.length,
      searchHits,
      unfiltered: unfiltered.length
    },
    null,
    2
  )
)

if (built.nodes.length !== graph.nodes.length) {
  throw new Error(`simulation dropped nodes: ${built.nodes.length} of ${graph.nodes.length}`)
}

if (laidOut === 0) {
  throw new Error('simulation produced no finite node coordinates')
}

if (typeof result.animating !== 'boolean') {
  throw new Error('drawScene did not report an animating flag')
}

if (unfiltered.length !== graph.nodes.length) {
  throw new Error(`an empty query must match every node: ${unfiltered.length} of ${graph.nodes.length}`)
}

if (searchHits.length !== 1 || searchHits[0] !== 'memory:memory:1:def456') {
  throw new Error(`search narrowed to the wrong subset: ${JSON.stringify(searchHits)}`)
}

// Share code v4 must round-trip the node/edge set the renderer just drew.
const shared = decodeShareCode(encodeShareCode(graph as any))

if (shared.nodes.length !== graph.nodes.length || shared.edges.length !== graph.edges.length) {
  throw new Error(`share code changed the graph: ${shared.nodes.length}/${shared.edges.length}`)
}

// Multi-profile recall addresses the node's own profile with the unprefixed id.
const addressed = resolveRecallTarget({ id: 'notes:memory:honcho:2:abc123', kind: 'memory', label: 'x', profile: 'notes' })

if (addressed.id !== 'memory:honcho:2:abc123' || addressed.profile !== 'notes') {
  throw new Error(`recall target mis-addressed: ${JSON.stringify(addressed)}`)
}

// Collapse-identical view: duplicates of one conclusion text draw once, the
// survivor keeps its id (and an ×N label), file memory is untouched, and edges
// pointing at hidden nodes are pruned. Nothing is removed from `memory`.
const collapseGraph = {
  edges: [
    { source: 'skill-a', target: 'memory:honcho:1:aaaa00000001' },
    { source: 'skill-a', target: 'memory:honcho:3:aaaa00000001' }
  ],
  memory: [],
  nodes: [
    { category: 'x', id: 'skill-a', kind: 'skill', label: 'skill-a' },
    { category: 'memory', id: 'memory:memory:0:ffff00000000', kind: 'memory', label: 'file card', memorySource: 'memory' },
    { category: 'memory', id: 'memory:honcho:1:aaaa00000001', kind: 'memory', label: 'dup', memorySource: 'honcho' },
    { category: 'memory', id: 'memory:honcho:2:bbbb00000002', kind: 'memory', label: 'unique', memorySource: 'honcho' },
    { category: 'memory', id: 'memory:honcho:3:aaaa00000001', kind: 'memory', label: 'dup', memorySource: 'honcho' }
  ]
}

const collapsed = collapseIdentical(collapseGraph as any)
const collapsedIds = collapsed.graph.nodes.map((node: any) => node.id)

if (collapsed.hidden !== 1 || collapsed.texts !== 1) {
  throw new Error(`collapse counted wrong: hidden=${collapsed.hidden} texts=${collapsed.texts}`)
}

if (collapsed.graph.nodes.length !== 4 || !collapsedIds.includes('memory:honcho:1:aaaa00000001') || collapsedIds.includes('memory:honcho:3:aaaa00000001')) {
  throw new Error(`collapse kept the wrong nodes: ${JSON.stringify(collapsedIds)}`)
}

const survivor = collapsed.graph.nodes.find((node: any) => node.id === 'memory:honcho:1:aaaa00000001')
const fileCard = collapsed.graph.nodes.find((node: any) => node.id === 'memory:memory:0:ffff00000000')

if (survivor?.label !== 'dup ·×2') {
  throw new Error(`survivor label missing the repeat count: ${JSON.stringify(survivor?.label)}`)
}

if (fileCard?.label !== 'file card') {
  throw new Error('collapse must not touch file memory labels')
}

if (collapsed.graph.edges.length !== 1 || collapsed.graph.edges[0].target !== 'memory:honcho:1:aaaa00000001') {
  throw new Error(`collapse must prune edges to hidden nodes: ${JSON.stringify(collapsed.graph.edges)}`)
}

console.log('SMOKE OK')
