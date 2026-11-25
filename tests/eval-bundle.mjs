/**
 * Evaluate the PRODUCTION bundle (desktop/plugin.js) outside the app.
 *
 * The packaged desktop build closes DevTools and resolves only
 * @hermes/plugin-sdk / react / react/jsx-runtime, so an ESM link error or a
 * register-time throw is invisible until a user relaunches. This script reads
 * the bundle's own import statements, generates a matching temporary module
 * tree (real atoms/host/useValue; null UI components), imports the bundle, and
 * runs register() against a stub ctx.
 *
 *   node tests/eval-bundle.mjs
 */

import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = path.dirname(path.dirname(new URL(import.meta.url).pathname))
const bundle = path.join(root, 'desktop/plugin.js')
const source = readFileSync(bundle, 'utf8')

const specs = {}

for (const match of source.matchAll(/import\s*\{([^}]+)\}\s*from\s*"([^"]+)"/g)) {
  const names = match[1]
    .split(',')
    .map(part => part.trim().split(/\s+as\s+/)[0].trim())
    .filter(Boolean)

  specs[match[2]] = [...new Set([...(specs[match[2]] ?? []), ...names])]
}

const work = mkdtempSync(path.join(tmpdir(), 'journey-starmap-eval-'))

function moduleDir(name) {
  const dir = path.join(work, 'node_modules', name)
  mkdirSync(dir, { recursive: true })

  return dir
}

const ATOM_HOST = `
export function atom(value) {
  let current = value
  const listeners = new Set()

  return {
    get: () => current,
    set(next) { current = next; listeners.forEach(fn => fn(current)) },
    listen(fn) { listeners.add(fn); return () => listeners.delete(fn) },
    subscribe(fn) { listeners.add(fn); fn(current); return () => listeners.delete(fn) }
  }
}
export function computed(_stores, fn) { return atom(fn()) }
export const host = {
  state: {
    activeSessionId: atom(null),
    focusedSessionId: atom(null),
    gateway: atom('open'),
    profile: atom('default')
  },
  composer: { focus() {}, getDraft: async () => null, insertText: async () => true, setDraft: async () => true, submit() { return true } },
  navigate() {}, notify() {}, notifyError() {}, onEvent() { return () => {} }, openSession() {}, request: async () => ({}), newChat() {},
  profiles: { list: async () => ({ profiles: [] }) }
}
export const icons = new Proxy({}, { get: () => function Icon() { return null } })
export const useValue = store => store.get()
export const usePluginI18n = () => key => key
export const useQuery = () => ({ data: undefined, isLoading: false })
export const useMutation = () => ({ isPending: false, mutate() {} })
export const queryClient = {}
export const cn = (...values) => values.filter(Boolean).join(' ')
export const haptic = () => {}
`

function writeSpec(spec, body, packageJson) {
  const dir = moduleDir(spec)
  writeFileSync(path.join(dir, 'index.mjs'), body)
  writeFileSync(path.join(dir, 'package.json'), JSON.stringify(packageJson))
}

const sdk = specs['@hermes/plugin-sdk'] ?? []
const builtin = new Set([
  'atom', 'computed', 'host', 'icons', 'useValue', 'usePluginI18n', 'useQuery',
  'useMutation', 'queryClient', 'cn', 'haptic', 'ROUTES_AREA', 'SIDEBAR_NAV_AREA', 'PALETTE_AREA'
])
const constants = `
export const ROUTES_AREA = 'routes'
export const SIDEBAR_NAV_AREA = 'sidebar.nav'
export const PALETTE_AREA = 'palette'
`
const components = sdk
  .filter(name => !builtin.has(name))
  .map(name => `export const ${name} = function ${name}() { return null }`)
  .join('\n')

writeSpec(
  '@hermes/plugin-sdk',
  constants + ATOM_HOST + components,
  { name: '@hermes/plugin-sdk', type: 'module', main: 'index.mjs', exports: './index.mjs' }
)

const reactDir = moduleDir('react')
writeFileSync(
  path.join(reactDir, 'index.mjs'),
  `export const createContext = () => ({})
export const useContext = () => ({})
export const useState = value => [typeof value === 'function' ? value() : value, () => {}]
export const useRef = value => ({ current: value })
export const useEffect = () => {}
export const useLayoutEffect = () => {}
export const useMemo = fn => fn()
export const useCallback = fn => fn
export const memo = fn => fn
export default { createContext, useContext, useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback, memo }`
)
writeFileSync(
  path.join(reactDir, 'jsx-runtime.mjs'),
  `export const jsx = (type, props, key) => ({ type, props, key })
export const jsxs = jsx
export const Fragment = 'Fragment'`
)
writeFileSync(
  path.join(reactDir, 'package.json'),
  JSON.stringify({
    name: 'react',
    type: 'module',
    exports: { '.': { import: './index.mjs' }, './jsx-runtime': { import: './jsx-runtime.mjs' } }
  })
)

const workBundle = path.join(work, 'plugin.mjs')
cpSync(bundle, workBundle)

try {
  const mod = await import(pathToFileURL(workBundle).href)
  const plugin = mod.default

  if (!plugin || plugin.id !== 'journey-starmap' || typeof plugin.register !== 'function') {
    throw new Error('bundle default export is not the journey-starmap plugin')
  }

  const registrations = []
  plugin.register({
    i18n: {
      register(bundles) {
        if (!bundles || !bundles.en) {
          throw new Error('i18n.register called without an en bundle')
        }
      },
      t: key => key
    },
    onDispose() {},
    register(entry) { registrations.push(entry) },
    registerMany(entries) { registrations.push(...entries) },
    rest: async () => ({ ok: true, graph: { edges: [], memory: [], nodes: [] } }),
    storage: { get() {}, set() {}, remove() {} }
  })

  const areas = new Set(registrations.map(entry => entry.area))
  const routes = registrations.filter(entry => entry.area === 'routes')

  for (const required of ['routes', 'sidebar.nav', 'palette']) {
    if (!areas.has(required)) {
      throw new Error(`register() did not contribute to the ${required} area`)
    }
  }

  if (!routes.some(entry => entry.data?.path === '/starmap-plugin' && typeof entry.render === 'function')) {
    throw new Error('the plugin page route is missing')
  }

  console.log(JSON.stringify({
    areas: [...areas],
    id: plugin.id,
    registrations: registrations.map(entry => `${entry.area}:${entry.id}`),
    route: routes[0]?.data?.path
  }, null, 2))
  console.log('PRODUCTION BUNDLE EVAL OK')
} finally {
  rmSync(work, { force: true, recursive: true })
}
