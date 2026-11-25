/**
 * Registration smoke test: run the plugin's real register() against a stub ctx,
 * so a throw (or a contribution with the wrong area) is caught here instead of
 * as a silent "nothing appeared in the sidebar".
 */

import plugin from '../src/entry'

const registrations: any[] = []
const translations: string[] = []

const ctx = {
  i18n: {
    register(bundles: Record<string, unknown>) {
      if (!bundles || !('en' in bundles)) {
        throw new Error('i18n.register called without an en bundle')
      }
    },
    t: (key: string) => {
      translations.push(key)

      return key
    }
  },
  register(entry: any) {
    registrations.push(entry)
  },
  registerMany(entries: any[]) {
    registrations.push(...entries)
  },
  rest: async () => ({ edges: 0, graph: { edges: [], memory: [], nodes: [] }, nodes: 0, ok: true }),
  storage: { get: () => null, remove: () => undefined, set: () => undefined }
}

if (plugin.id !== 'journey-starmap') {
  throw new Error(`unexpected plugin id: ${plugin.id}`)
}

plugin.register(ctx as any)

const summary = registrations.map(entry => ({
  area: entry.area,
  hasData: Boolean(entry.data),
  hasRender: typeof entry.render === 'function',
  id: entry.id
}))

console.log(JSON.stringify({ id: plugin.id, name: plugin.name, registrations: summary, translations }, null, 2))

const areas = new Set(registrations.map(entry => entry.area))

for (const required of ['routes', 'sidebar.nav', 'palette']) {
  if (!areas.has(required)) {
    throw new Error(`register() did not contribute to the ${required} area`)
  }
}

const page = registrations.find(entry => entry.area === 'routes')

if (!page?.data?.path) {
  throw new Error('the routes contribution has no data.path')
}

if (typeof page.render !== 'function') {
  throw new Error('the routes contribution has no render')
}

console.log('REGISTER OK')
