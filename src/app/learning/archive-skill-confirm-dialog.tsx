// Skill archive confirmation (the plugin's own door for a learned-skill delete).
import { ConfirmDialog } from '@hermes/plugin-sdk'

import { deleteLearningNode, type ProfileScope } from '@/hermes'
import { notify } from '@/store/notifications'

export const ARCHIVE_SKILL_DESCRIPTION = 'The skill is archived and can be restored with `hermes curator restore`.'

export async function archiveLearningSkill(id: string, profile?: ProfileScope): Promise<void> {
  const res = await deleteLearningNode(id, profile)

  if (!res.ok) {
    throw new Error(res.message || 'Archive failed')
  }
}

export function fireOptimistic(action: Promise<void>, rollback: () => void, onFailure: (err: unknown) => void): void {
  void action.catch(err => {
    rollback()
    onFailure(err)
  })
}

export function notifySkillArchived(): void {
  notify({ kind: 'success', message: 'Skill archived.', title: 'Skill archived' })
}

export function ArchiveSkillConfirmDialog({
  onApply,
  onClose,
  onFailure,
  onSuccess,
  open,
  profile,
  skillId,
  skillName
}: {
  onApply: () => () => void
  onClose: () => void
  onFailure?: (err: unknown, skillName: string) => void
  onSuccess?: () => void
  open: boolean
  profile?: ProfileScope
  skillId: string
  skillName: string
}) {
  return (
    <ConfirmDialog
      confirmLabel="Archive"
      description={ARCHIVE_SKILL_DESCRIPTION}
      destructive
      dismissOnConfirm
      onClose={onClose}
      onConfirm={() => {
        const rollback = onApply()

        fireOptimistic(
          archiveLearningSkill(skillId, profile).then(() => {
            notifySkillArchived()
            onSuccess?.()
          }),
          rollback,
          err => onFailure?.(err, skillName)
        )
      }}
      open={open}
      title={`Archive ${skillName}?`}
    />
  )
}
