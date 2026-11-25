// Session composer drafts. The plugin cannot write the app's session store, so
// "Add to a session" stages the text here and the view delivers it through
// host.composer (setDraft when the target is mounted, open + insert otherwise).
export interface StagedDraft {
  attachments: unknown[]
  text: string
}

const drafts = new Map<string, StagedDraft>()

export function stashSessionDraft(key: string, text: string, attachments: unknown[] = []): void {
  drafts.set(key, { attachments, text })
}

export function takeSessionDraft(key: string): StagedDraft {
  const draft = drafts.get(key) ?? { attachments: [], text: '' }
  drafts.delete(key)

  return draft
}
