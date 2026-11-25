// The composer doors the ported view calls. `requestComposerInsert` maps to
// host.composer.insertText; the "active composer" is always the primary one a
// disk plugin can address.
import { host } from '@hermes/plugin-sdk'

export function getActiveComposer(): string | null {
  return 'main'
}

export function getVisibleComposerSurfaceId(_target: string | null): string | null {
  return 'main'
}

export function requestComposerInsert(
  text: string,
  options?: { isCurrent?: () => boolean; mode?: 'block' | 'inline' | 'prefix'; target?: string | null }
): void {
  if (options?.isCurrent && !options.isCurrent()) {
    return
  }

  void (host as any).composer?.insertText?.(null, text, { mode: options?.mode ?? 'block' })
}
