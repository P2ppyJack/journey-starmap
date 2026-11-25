// Subscribe to theme repaints: applyTheme rewrites <html>'s class and inline
// custom properties AFTER child effects, so canvas palettes must re-resolve on
// a MutationObserver, not on a React theme context change.
import { useEffect, useState } from 'react'

const ATTRS = ['class', 'style', 'data-hermes-mode', 'data-hermes-theme']
const listeners = new Set<() => void>()
let observer: MutationObserver | null = null

function themeStyle(style: CSSStyleDeclaration): string {
  let snapshot = ''

  for (let i = 0; i < style.length; i += 1) {
    const name = style.item(i)

    if (name === '--workspace-left' || name === '--workspace-right' || name === '--glass-rail-edge') {
      continue
    }

    snapshot += `${name}:${style.getPropertyValue(name)}${style.getPropertyPriority(name) ? ' !important' : ''};`
  }

  return snapshot
}

export function onThemeRepaint(fn: () => void): () => void {
  if (!observer && typeof document !== 'undefined') {
    const root = document.documentElement
    let previousStyle = themeStyle(root.style)
    observer = new MutationObserver(records => {
      const nextStyle = themeStyle(root.style)
      const customCSS = document.getElementById('hermes-desktop-custom-css')?.textContent
      const repaint =
        Boolean(customCSS) || nextStyle !== previousStyle || records.some(record => record.attributeName !== 'style')

      previousStyle = nextStyle

      if (repaint) {
        listeners.forEach(listener => listener())
      }
    })
    observer.observe(root, { attributeFilter: ATTRS, attributes: true })
  }

  listeners.add(fn)

  return () => {
    listeners.delete(fn)

    if (listeners.size === 0) {
      observer?.disconnect()
      observer = null
    }
  }
}

export function useThemeEpoch(): number {
  const [epoch, setEpoch] = useState(0)

  useEffect(() => onThemeRepaint(() => setEpoch(e => e + 1)), [])

  return epoch
}
