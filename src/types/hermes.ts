// Structural types for the journey graph, as the plugin sees it over
// ctx.rest('/graph'). The wire shape is produced by the upstream
// agent.learning_graph builder; these declarations only satisfy the compiler —
// nothing here validates at runtime (a shape change must surface as a visible
// failure, never a silent coercion).

export interface StarmapEdge {
  source: string
  target: string
}

export interface StarmapMemoryCard {
  body?: string
  content?: string
  origin?: string
  sessionId?: string
  source?: string
  timestamp?: null | number
  title?: string
  [key: string]: unknown
}

export interface StarmapNode {
  _originalId?: string
  category?: string
  connectionId?: string
  createdBy?: string
  id: string
  kind: 'memory' | 'skill' | string
  label: string
  memoryLevel?: string
  memorySource?: string
  origin?: string
  pinned?: boolean
  profile?: string
  sessionId?: string
  state?: string
  timestamp?: null | number
  useCount?: number
  [key: string]: unknown
}

export interface StarmapGraph {
  clusters?: Array<{ category?: string; count?: number }>
  edges: StarmapEdge[]
  memory: StarmapMemoryCard[]
  memoryProvider?: null | string
  multiProfile?: boolean
  nodes: StarmapNode[]
  profiles?: string[]
  stats?: Record<string, unknown>
  [key: string]: unknown
}

export interface ProfileInfo {
  description?: string
  key?: string
  label?: string
  name?: string
  [key: string]: unknown
}
