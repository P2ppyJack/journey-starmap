// `useStore` from @nanostores/react, backed by the SDK's own `useValue` so the
// plugin shares the app's atom implementation (the `nanostores` specifier is
// aliased to ./nanostores.ts, which re-exports atom/computed from the SDK).
import { useValue } from '@hermes/plugin-sdk'

export function useStore<T>(store: { get: () => T; subscribe?: (fn: (value: T) => void) => () => void }): T {
  return useValue(store as never) as T
}
