/**
 * Minimal stand-in for the plugin SDK's store surface, for the node smoke test
 * only. It mirrors the parts the ported persistence helper uses (get/set/
 * subscribe with an immediate first call) so the real code runs unmodified.
 */

type Listener<T> = (value: T) => void

export interface StubAtom<T> {
  get(): T
  set(value: T): void
  subscribe(listener: Listener<T>): () => void
}

export function atom<T>(initial: T): StubAtom<T> {
  let value = initial
  const listeners = new Set<Listener<T>>()

  return {
    get: () => value,
    set(next: T) {
      value = next
      listeners.forEach(listener => listener(value))
    },
    subscribe(listener: Listener<T>) {
      listeners.add(listener)
      listener(value)

      return () => listeners.delete(listener)
    }
  }
}

export function computed<T>(_stores: unknown, _fn: () => T): never {
  throw new Error('computed is not implemented in the smoke stub')
}
