// A textarea-based stand-in for the app's CodeEditor. The plugin SDK has no
// code editor export; a monospace textarea keeps the same review-and-save flow,
// while the owning dialog supplies the Cancel/Save actions.
import { Textarea } from '@hermes/plugin-sdk'
import { useEffect, useState } from 'react'

export function CodeEditor({
  filePath,
  initialValue,
  onChange
}: {
  filePath?: string
  framed?: boolean
  initialValue: string
  onCancel?: () => void
  onChange?: (value: string) => void
  onSave?: () => void
}) {
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  return (
    <div className="flex h-full min-h-0 flex-col gap-1">
      {filePath ? <div className="text-[0.68rem] text-(--ui-text-tertiary)">{filePath}</div> : null}
      <Textarea
        className="min-h-0 flex-1 font-mono text-xs"
        onChange={event => {
          setValue(event.target.value)
          onChange?.(event.target.value)
        }}
        value={value}
      />
    </div>
  )
}
