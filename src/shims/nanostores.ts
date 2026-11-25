// The app's store library must be the SAME instance the plugin SDK hands to
// useValue/useQuery, or atoms from this plugin would never re-render. Route
// every `nanostores` import through the SDK's own re-exports.
export { atom, computed } from '@hermes/plugin-sdk'
