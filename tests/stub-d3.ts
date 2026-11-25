export const forceSimulation = () => ({ force: () => undefined, nodes: () => undefined, on: () => undefined, stop: () => undefined, tick: () => undefined })
export const forceLink = () => ({ id: () => undefined, distance: () => undefined, strength: () => undefined })
export const forceManyBody = () => ({ strength: () => undefined, distanceMax: () => undefined })
export const forceCollide = () => ({ radius: () => undefined, strength: () => undefined })
export const forceRadial = () => ({ strength: () => undefined })
export type Simulation = any
