/** Minimal react/jsx-runtime stand-in for the node tests: elements are plain objects. */

export const jsx = (type: unknown, props: unknown, key?: unknown) => ({ key, props, type })
export const jsxs = jsx
export const Fragment = 'Fragment'
