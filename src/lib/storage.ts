// Plugin-local stand-in for the desktop app's storage choke point.
// localStorage is available in the renderer; writes are namespaced so a plugin
// key can never collide with a core preference key.

const PREFIX = 'hermes.plugin.journey-starmap.'

export function readKey(key: string): null | string {
  try {
    return window.localStorage.getItem(PREFIX + key)
  } catch {
    return null
  }
}

export function writeKey(key: string, value: null | string): void {
  try {
    if (value === null) {
      window.localStorage.removeItem(PREFIX + key)
    } else {
      window.localStorage.setItem(PREFIX + key, value)
    }
  } catch {
    // storage unavailable (private mode / quota) — persistence is best effort
  }
}
