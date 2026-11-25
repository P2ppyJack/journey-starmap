// The app shares machine-level preference keys across windows; a plugin key
// never qualifies, so this is always false here. Kept as a module so the
// ported persistence helper compiles unchanged.
export function isSharedPreferenceKey(_key: string): boolean {
  return false
}
