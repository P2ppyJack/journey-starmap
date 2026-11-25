/**
 * Build desktop/plugin.js from src/.
 *
 * The desktop app loads a single plain-ESM file and resolves ONLY
 * @hermes/plugin-sdk, react and react/jsx-runtime, so everything else (the
 * ported star-map code, d3-force, fflate, nanostores via the SDK) is inlined
 * here. Nothing is minified: a shipped plugin should stay readable.
 *
 *   node build.mjs          # bundle
 *   node build.mjs --smoke  # bundle, then smoke-test the scene renderer
 */

import { existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const root = path.dirname(fileURLToPath(import.meta.url))

/**
 * The build tooling's package.json lives in tools/, not at the package root:
 * Hermes's installer treats a root package.json as runtime Node dependencies
 * and offers to `npm ci` them into the installed plugin, but this plugin ships
 * a prebuilt desktop/plugin.js and needs none at runtime. Dependencies are
 * found in tools/node_modules (`npm ci --prefix tools`), ./node_modules, or a
 * sibling ../journey-starmap-plugin-deps folder, in that order.
 */
const candidateModules = [
  path.join(root, 'tools', 'node_modules'),
  path.join(root, 'node_modules'),
  path.join(path.dirname(root), 'journey-starmap-plugin-deps', 'node_modules')
]
const modulesDir = candidateModules.find((dir) => existsSync(path.join(dir, 'esbuild', 'lib', 'main.js')))

// esbuild itself is loaded by path, since none of these folders is an
// ancestor that a bare `import 'esbuild'` would search.
async function loadEsbuild() {
  if (!modulesDir) {
    throw new Error('esbuild not found — run `npm ci --prefix tools`, or install it in ../journey-starmap-plugin-deps')
  }

  const mod = await import(pathToFileURL(path.join(modulesDir, 'esbuild', 'lib', 'main.js')).href)

  return mod.build ?? mod.default?.build
}

const build = await loadEsbuild()

export const options = {
  absWorkingDir: root,
  bundle: true,
  entryPoints: ['src/entry.tsx'],
  external: ['@hermes/plugin-sdk', 'react', 'react/jsx-runtime'],
  format: 'esm',
  jsx: 'automatic',
  legalComments: 'eof',
  logLevel: 'info',
  nodePaths: [modulesDir],
  outfile: 'desktop/plugin.js',
  platform: 'browser',
  sourcemap: false,
  target: ['es2022'],
  alias: {
    '@/app/chat/composer/focus': './src/app/chat/composer/focus.ts',
    '@/app/learning/archive-skill-confirm-dialog': './src/app/learning/archive-skill-confirm-dialog.tsx',
    '@/app/overlays/panel': './src/app/overlays/panel.tsx',
    '@/api/client': './src/api/client.ts',
    '@/components/chat/code-editor': './src/components/chat/code-editor.tsx',
    '@/components/page-loader': './src/components/page-loader.tsx',
    '@/components/ui/button': './src/shims/ui.tsx',
    '@/components/ui/codicon': './src/shims/ui.tsx',
    '@/components/ui/confirm-dialog': './src/shims/ui.tsx',
    '@/components/ui/copy-button': './src/shims/ui.tsx',
    '@/components/ui/dialog': './src/shims/ui.tsx',
    '@/components/ui/dropdown-menu': './src/shims/ui.tsx',
    '@/components/ui/popover': './src/shims/ui.tsx',
    '@/components/ui/tooltip': './src/shims/ui.tsx',
    '@/hermes': './src/hermes.ts',
    '@/hooks/use-theme-epoch': './src/hooks/use-theme-epoch.ts',
    '@/hooks/use-on-profile-switch': './src/hooks/use-on-profile-switch.ts',
    '@/i18n': './src/shims/i18n.ts',
    '@/lib/icons': './src/shims/icons.ts',
    '@/lib/loadout': './src/lib/loadout.ts',
    '@/lib/persisted': './src/lib/persisted.ts',
    '@/lib/renderer-loop-pause': './src/lib/renderer-loop-pause.ts',
    '@/lib/text': './src/lib/text.ts',
    '@/lib/time': './src/lib/time.ts',
    '@/lib/trackpad-gestures': './src/lib/trackpad-gestures.ts',
    '@/store/composer': './src/store/composer.ts',
    '@/store/notifications': './src/store/notifications.ts',
    '@/store/profile': './src/store/profile.ts',
    '@/store/session': './src/store/session.ts',
    '@/store/session-states': './src/store/session-states.ts',
    '@/store/starmap': './src/store/starmap.ts',
    '@/types/hermes': './src/types/hermes.ts',
    // The SDK's atom/computed must be the SAME nanostores instance the app uses.
    '@nanostores/react': './src/shims/nanostores-react.ts',
    nanostores: './src/shims/nanostores.ts'
  }
}

if (process.argv.includes('--register')) {
  await build({
    ...options,
    entryPoints: ['tests/register-entry.ts'],
    external: [],
    logLevel: 'warning',
    outfile: 'tests/register.bundle.mjs',
    alias: {
      ...options.alias,
      '@hermes/plugin-sdk': './tests/stub-sdk-full.ts',
      react: './tests/stub-react.ts',
      'react/jsx-runtime': './tests/stub-jsx.ts'
    }
  })
  await import('./tests/register.bundle.mjs')
  await build(options)
} else if (process.argv.includes('--smoke')) {
  await build({
    ...options,
    entryPoints: ['tests/smoke-entry.ts'],
    external: [],
    logLevel: 'warning',
    outfile: 'tests/smoke.bundle.mjs',
    alias: { ...options.alias, '@hermes/plugin-sdk': './tests/stub-sdk.ts' }
  })
  await import('./tests/smoke.bundle.mjs')
  await build(options)
} else {
  await build(options)
}
