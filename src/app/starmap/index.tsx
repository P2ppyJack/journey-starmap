import { useStore } from '@nanostores/react'
import { host } from '@hermes/plugin-sdk'
import { useEffect, useState } from 'react'

import { getLearningRecallDraft, crossInsertLearningNode } from '@/hermes'
import { sessionTitle, $sessions, refreshRecentSessions } from '@/store/session'
import { notify } from '@/store/notifications'
import { requestFreshSession, $activeProfile } from '@/store/profile'
import { stashSessionDraft, takeSessionDraft } from '@/store/composer'
import {
  $starmapError,
  $starmapGraph,
  $starmapLoading,
  $starmapRecallMode,
  clearStarmapRecall,
  loadStarmapGraph,
  watchStarmapGraph
} from '@/store/starmap'
import type { StarmapGraph } from '@/types/hermes'

import { COLLAPSE_KEY, collapseIdentical } from './collapse'
import { learningNodeScope, type RecallNodeRef, resolveRecallTarget } from './recall'
import { StarMap } from './star-map'

const RECENT_SESSIONS = 5

function readCollapse(): boolean {
  try {
    const stored = window.localStorage.getItem(COLLAPSE_KEY)

    return stored === null ? true : stored === '1'
  } catch {
    return true
  }
}

/** The star map page: live profile graph, recall mode, and the ported map. */
export function StarmapView({ onClose }: { onClose: () => void }) {
  const graph = useStore($starmapGraph) as null | StarmapGraph
  const loading = useStore($starmapLoading)
  const error = useStore($starmapError)
  const recallMode = useStore($starmapRecallMode)
  const activeProfile = useStore($activeProfile)
  const sessions = useStore($sessions)

  const [imported, setImported] = useState<null | StarmapGraph>(null)
  const [collapse, setCollapse] = useState(readCollapse)
  const [collapseNote, setCollapseNote] = useState('')

  // Loads on open and reloads after a profile/gateway switch while the page stays open.
  useEffect(() => watchStarmapGraph(), [])
  useEffect(() => {
    void refreshRecentSessions(activeProfile)
  }, [activeProfile])

  // Drop a stale import when the underlying profile graph changes out from under it.
  useEffect(() => {
    setImported(null)
  }, [graph])

  const shown = imported ?? graph
  const view = shown && collapse ? collapseIdentical(shown) : { graph: shown, hidden: 0, texts: 0 }

  const closeAndReset = () => {
    clearStarmapRecall()
    onClose()
  }

  const recentSessions = sessions.slice(0, RECENT_SESSIONS).map(session => ({
    key: session._lineage_root_id ?? session.id,
    title: sessionTitle(session)
  }))

  // Fetch the injection-hardened, provenance-tagged draft for a node. The body
  // is scanned + defanged + wrapped server-side; we only place the returned text.
  const fetchRecallText = async (node: RecallNodeRef): Promise<null | string> => {
    const target = resolveRecallTarget(node)

    try {
      const draft = await getLearningRecallDraft(target.id, learningNodeScope(node))

      if (!draft.ok || !String(draft.text ?? '').trim()) {
        notify({ kind: 'warning', message: 'Could not load that memory to insert.' })

        return null
      }

      return String(draft.text)
    } catch {
      notify({ kind: 'warning', message: 'Could not load that memory to insert.' })

      return null
    }
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col" data-context-menu-skip data-hermes-context-menu-trigger>
      {error ? (
        <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
          <div className="text-sm text-(--ui-text-secondary)">Could not load the star map</div>
          <div className="max-w-xl text-xs text-(--ui-text-tertiary)">{error}</div>
          <button
            className="mt-2 cursor-pointer rounded border border-(--ui-stroke-secondary) px-2 py-1 text-xs hover:bg-(--ui-control-active-background)"
            onClick={() => void loadStarmapGraph(true)}
            type="button"
          >
            Retry
          </button>
        </div>
      ) : !shown && loading ? (
        <div className="flex h-full items-center justify-center">
          <span className="animate-pulse text-xs text-(--ui-text-tertiary)">Loading the journey graph…</span>
        </div>
      ) : shown && shown.nodes.length === 0 && !imported ? (
        <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
          <div className="text-sm text-(--ui-text-secondary)">Nothing learned yet</div>
          <div className="max-w-xl text-xs text-(--ui-text-tertiary)">
            As Hermes builds skills and memories for your work, they appear here.
          </div>
        </div>
      ) : view.graph ? (
        <>
          <StarMap
            graph={view.graph}
            imported={imported !== null}
            initialSearchFocus={recallMode}
            onAddToSession={async (node, sessionKey) => {
              // Stash the node's knowledge into an EXISTING session's composer as
              // a reviewed draft. Never auto-send; append to an in-progress draft.
              const text = await fetchRecallText(node)

              if (!text) {
                return
              }

              const existing = takeSessionDraft(sessionKey)
              const combined = existing.text.trim() ? `${existing.text.trimEnd()}\n\n${text}` : text
              stashSessionDraft(sessionKey, combined, existing.attachments)

              const composer = (host as any).composer
              let delivered = false

              try {
                delivered = await composer?.setDraft?.(sessionKey, combined)
              } catch {
                delivered = false
              }

              if (!delivered) {
                try {
                  await (host as any).openSession?.(sessionKey, { intent: 'in-place' })
                  await new Promise(resolve => setTimeout(resolve, 350))
                  delivered = await composer?.setDraft?.(sessionKey, combined)
                } catch {
                  delivered = false
                }
              }

              const target = recentSessions.find(s => s.key === sessionKey)

              if (delivered) {
                notify({ kind: 'success', message: `Added to "${target?.title ?? node.label}" — review and send.` })
              } else {
                notify({ kind: 'warning', message: 'Could not place the draft in that session’s composer.' })
              }
            }}
            onImport={setImported}
            onInsertIntoProfile={async (node, targetProfile) => {
              if (!node.profile) {
                notify({ kind: 'warning', message: "Could not insert into that bot's memory." })

                return
              }

              try {
                const { id: nodeId } = resolveRecallTarget(node)
                const result = await crossInsertLearningNode(nodeId, node.profile, targetProfile, learningNodeScope(node))

                if (result.ok) {
                  notify({ kind: 'success', message: `Inserted into ${targetProfile}'s memory.` })
                  void loadStarmapGraph(true)
                } else {
                  notify({ kind: 'warning', message: result.message || "Could not insert into that bot's memory." })
                }
              } catch {
                notify({ kind: 'warning', message: "Could not insert into that bot's memory." })
              }
            }}
            onOpenSession={(id, owner) => {
              ;(host as any).openSession?.(id, { intent: 'stack', profile: owner?.profile })
              closeAndReset()
            }}
            onRecallIntoChat={async node => {
              const text = await fetchRecallText(node)

              if (!text) {
                return
              }

              try {
                await (host as any).composer?.insertText?.(null, text, { mode: 'block' })
                closeAndReset()
                ;(host as any).navigate?.('/')
              } catch {
                notify({ kind: 'warning', message: 'No composer accepted the text.' })
              }
            }}
            onResetMap={() => setImported(null)}
            onStartConversation={conclusion => {
              // Seed a NEW chat with the conclusion quoted as context — the user
              // reviews and sends (never auto-sent).
              requestFreshSession()
              const seed = `I want to talk about something you've concluded about me:\n\n> ${conclusion.label}\n\n`

              setTimeout(() => {
                void (host as any).composer?.insertText?.(null, seed, { mode: 'block' })
              }, 0)
              closeAndReset()
              ;(host as any).navigate?.('/')
            }}
            recentSessions={recentSessions}
          />

          <div className="pointer-events-auto absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-(--ui-stroke-secondary) bg-[color-mix(in_srgb,var(--ui-bg-elevated)_92%,transparent)] px-3 py-1 text-[0.66rem] text-(--ui-text-tertiary) backdrop-blur-md [-webkit-app-region:no-drag]">
            <button
              className="cursor-pointer font-medium text-(--ui-text-primary) hover:underline"
              onClick={() => {
                const next = !collapse

                setCollapse(next)

                try {
                  window.localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
                } catch {
                  /* a locked-down renderer just keeps the default */
                }
              }}
              type="button"
            >
              {collapse ? 'Show duplicate conclusions' : 'Collapse identical conclusions'}
            </button>
            {collapse && view.hidden > 0 ? (
              <span className="tabular-nums">
                {view.hidden} duplicate rows hidden · {view.texts} repeated texts
              </span>
            ) : null}
            {collapseNote ? <span>{collapseNote}</span> : null}
          </div>
        </>
      ) : null}
    </div>
  )
}
