// Minimal full-panel loading state (the app's PageLoader is not a plugin door).
export function PageLoader({ className, label }: { className?: string; label?: string }) {
  return (
    <div className={className ?? 'flex min-h-24 items-center justify-center'}>
      <span className="animate-pulse text-xs text-(--ui-text-tertiary)">{label ?? 'Loading…'}</span>
    </div>
  )
}
