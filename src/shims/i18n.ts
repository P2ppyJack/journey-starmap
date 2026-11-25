/**
 * Plugin-scoped translations for the star-map UI.
 *
 * The desktop feature's `starmap.*` strings, relocated so the plugin never
 * edits the app's core `en.ts`. `useI18n` is the same shape the ported
 * components already call (`const { t } = useI18n()`), and `usePluginI18n`
 * re-exports the SDK hook for callers that want the registered bundle.
 */
import { usePluginI18n } from '@hermes/plugin-sdk'

export const PLUGIN_ID = 'journey-starmap'

export const EN = {
  starmap: {
    title: 'Memory Graph',
    subtitle: (nodes, clusters) => `${nodes} skills across ${clusters} categories`,
    close: 'Close memory graph',
    refresh: 'Refresh',
    memory: 'Memory',
    filterAll: 'All',
    filterUsed: 'Used',
    filterLearned: 'Learned',
    viewGraph: 'Graph',
    loadFailed: 'Could not load memory graph',
    loading: 'Loading…',
    emptyTitle: 'Nothing learned yet',
    emptyDesc: 'As Hermes builds skills and memories for your work, they appear here.',
    share: 'Share map',
    shareHint:
      'Copy the code to share this map, or paste one to load. It only includes the layout, not your memory or skill text.',
    shareTitle: 'Import / export map',
    sharePlaceholder: 'Paste a map code…',
    copy: 'Copy map code',
    copied: 'Copied!',
    importMap: 'Import a map',
    importBtn: 'Load',
    importEmpty: 'Paste a map code to load it.',
    importSuccess: nodes => `Loaded a map with ${nodes} ${nodes === 1 ? 'node' : 'nodes'}.`,
    importedBadge: 'imported map',
    resetToMine: 'Back to my map',
    sessionsTitle: 'Where this came from',
    sessionsLoading: 'Finding sessions…',
    sessionsEmpty: 'No matching sessions found in this profile’s history.',
    sessionsProviderOnly:
      'This entry came from the memory provider’s own history (e.g. imported conversations) — no Hermes session matches it. Use “View source data” to read the original.',
    sessionsSearchNote: 'No recorded origin for this node — showing sessions matched by content search.',
    openSession: 'Open session',
    viewSource: 'View source data',
    sourceTitle: 'Source data',
    sourceLoading: 'Loading source data…',
    sourceEmpty: 'Source data unavailable — the memory backend is unreachable or no longer holds this session.',
    backToSessions: 'Back',
    provenanceMenu: 'Where this came from…',
    providerReadOnly: provider => `Read-only — managed by the ${provider} memory provider`,
    recreate: 'Recreate as Hermes session',
    recreating: 'Recreating…',
    recreateFailed: 'Couldn’t recreate the conversation',
    searchTitle: 'Search memories & skills',
    searchPlaceholder: 'Search…',
    searchRecent: 'Recent',
    searchSaved: 'Saved',
    searchSave: 'Save this search',
    searchDeleteSaved: 'Delete saved search',
    searchFiltersOnly: '(filters only)',
    searchKind: 'Type',
    searchKindAll: 'All types',
    searchKindSkills: 'skills',
    searchSource: 'Source',
    searchSourceAll: 'All sources',
    searchSourceHermes: 'Hermes',
    searchSourceImported: (source: string) => `imported: ${source}`,
    searchFrom: 'From date',
    searchTo: 'To date',
    searchCount: (n: number) => `${n} ${n === 1 ? 'result' : 'results'}`,
    searchEmpty: 'Nothing matches this search.',
    // Filter enhancement (dedicated filter icon, date modes, conclusions).
    filterTitle: 'Filter',
    filterShowing: (shown: number, total: number) => `Showing ${shown} of ${total}`,
    filterClear: 'Clear',
    dateModeLabel: 'Date filter',
    dateModeRange: 'Custom range',
    dateModeYear: 'Year',
    dateModeYearMonth: 'Year / month',
    dateYearAny: 'Any year',
    dateMonthLabel: 'Month',
    dateMonthAny: 'Any month',
    conclusion: 'conclusion',
    conclusions: 'conclusions',
    conclusionStartConversation: 'Start a conversation about this…',
    conclusionSeedPrompt: (text: string) =>
      `I want to talk about something you've concluded about me:\n\n> ${text}\n\n`,
    recallIntoChat: 'Insert into this chat',
    addToSession: 'Add to a session',
    addToSessionDone: (title: string) => `Added to "${title}" — open it to review and send.`,
    recallFailed: 'Could not load that memory to insert.',
    // Multi-profile mode (bot memory consolidation)
    profileSelector: 'Select bots',
    profileSelectorHint: 'Check bots to include their memories and skills on this map.',
    profileAll: 'All bots',
    profileNone: 'No bots selected',
    profileCount: (n: number) => `${n} ${n === 1 ? 'bot' : 'bots'} selected`,
    profileBadge: (name: string) => name,
    insertIntoProfile: (name: string) => `Insert into ${name}`,
    insertIntoAllSelected: 'Insert into all selected bots',
    insertIntoProfileDone: (name: string) => `Inserted into ${name}'s memory.`,
    insertIntoAllDone: (n: number) => `Inserted into ${n} ${n === 1 ? 'bot' : 'bots'}.`,
    crossProfileInsertFailed: "Could not insert into that bot's memory."
  }
} as const

export type Translations = typeof EN

export function useI18n(): { locale: string; t: Translations } {
  return { locale: 'en', t: EN }
}

export { usePluginI18n }
