// The page frame the ported view expects: a full-height panel with a close
// control. The plugin page is a route, so "close" means navigate away.
import { Codicon } from '@hermes/plugin-sdk'

export function Panel({
  children,
  closeLabel,
  onClose
}: {
  children?: unknown
  closeLabel?: string
  onClose?: () => void
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {onClose ? (
        <div className="flex h-9 items-center justify-end gap-2 border-b border-(--ui-stroke-secondary) px-2">
          <button
            aria-label={closeLabel ?? 'Close'}
            className="cursor-pointer rounded p-1 text-(--ui-text-tertiary) hover:bg-(--ui-control-active-background) hover:text-(--ui-text-primary)"
            onClick={onClose}
            type="button"
          >
            <Codicon name="close" />
          </button>
        </div>
      ) : null}
      {children as any}
    </div>
  )
}

export function PanelEmpty({
  description,
  icon,
  title
}: {
  description?: string
  icon?: string
  title: string
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
      {icon ? <Codicon className="text-2xl text-(--ui-text-quaternary)" name={icon} /> : null}
      <div className="text-sm text-(--ui-text-secondary)">{title}</div>
      {description ? <div className="max-w-xl text-xs text-(--ui-text-tertiary)">{description}</div> : null}
    </div>
  )
}
