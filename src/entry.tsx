/**
 * Journey star map (extended) — plugin entry.
 *
 * One page (`/starmap-plugin`) over the ported desktop feature. Every app seam
 * is a supported plugin door: the backend graph comes from ctx.rest('/graph'),
 * sessions open through host.openSession, recall lands via host.composer, and
 * profiles come from host.profiles — the plugin never patches hermes-agent.
 */
import {
  atom,
  host,
  PALETTE_AREA,
  ROUTES_AREA,
  SIDEBAR_NAV_AREA,
  usePluginI18n,
  useValue
} from '@hermes/plugin-sdk'
import { useEffect } from 'react'

import { setRequestScope } from './api/client'
import { StarmapView } from './app/starmap'
import { configureApi } from './hermes'
import { EN } from './shims/i18n'
import { refreshProfiles, syncProfileState } from './store/profile'
import { $starmapError, $starmapGraph, $starmapLoading } from './store/starmap'

const ID = 'journey-starmap'

const ENTRY_KEYS = {
  nav: 'Star map (plugin)',
  open: 'Open the star map',
  title: 'Star map (plugin)'
}

const LOCALES = { en: { ...ENTRY_KEYS, ...EN } }

const $status = atom('starmap: idle')

function StatusChip() {
  const graph = useValue($starmapGraph) as any
  const loading = useValue($starmapLoading)
  const error = useValue($starmapError)
  const text = useValue($status)

  const live = error ? `starmap: ERR ${error}` : graph ? `starmap: ${graph.nodes?.length ?? 0} nodes` : loading ? 'starmap: loading' : text

  return <span className="px-1 text-[11px] text-(--ui-text-tertiary)">{live}</span>
}

function Page() {
  usePluginI18n(ID)

  return <StarmapView onClose={() => host.navigate('/')} />
}

export default {
  defaultEnabled: true,
  id: ID,
  name: 'Journey star map',
  register(ctx: any) {
    ctx.i18n.register(LOCALES)
    configureApi(ctx.rest.bind(ctx))

    const applyProfile = (profile: null | string | undefined) => {
      syncProfileState(profile)
      setRequestScope({ profile: profile?.trim() || undefined })
      void refreshProfiles()
    }

    applyProfile(host.state.profile.get())

    try {
      const unsubscribe = host.state.profile.subscribe(applyProfile)
      ctx.onDispose?.(unsubscribe)
    } catch {
      /* an older host without a subscribable profile atom keeps the boot value */
    }

    ctx.registerMany([
      { data: { path: '/starmap-plugin' }, area: ROUTES_AREA, id: 'page', render: () => <Page /> },
      { area: 'statusBar.right' as any, data: undefined, id: 'chip', order: 4, render: () => <StatusChip /> },
      {
        area: SIDEBAR_NAV_AREA,
        data: { codicon: 'map', label: ctx.i18n.t('nav'), path: '/starmap-plugin' },
        id: 'nav',
        order: 60
      },
      {
        area: PALETTE_AREA,
        data: { id: 'journey-starmap.open', label: ctx.i18n.t('open'), run: () => host.navigate('/starmap-plugin') },
        id: 'open'
      }
    ])
  }
}
