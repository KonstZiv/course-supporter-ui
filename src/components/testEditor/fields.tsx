import { forwardRef } from 'react'
import { clsx } from 'clsx'
import type { LucideIcon } from 'lucide-react'

// The editor's small pieces, from the program's own patterns: the icon button
// of the course page's bar, the error line under a field (NodeDetailPanel)
// and a quieter line for what is not finished yet.

export const IconButton = forwardRef<
  HTMLButtonElement,
  {
    id?: string
    icon: LucideIcon
    label: string
    danger?: boolean
    disabled?: boolean
    onClick: () => void
  }
>(function IconButton({ id, icon: Icon, label, danger, disabled, onClick }, ref) {
  return (
    <button
      ref={ref}
      id={id}
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        'p-2 rounded-lg transition-colors shrink-0',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-navy/30',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        danger
          ? 'text-coral hover:bg-coral-pale disabled:hover:bg-transparent'
          : 'text-ink-muted hover:bg-canvas-dark disabled:hover:bg-transparent',
      )}
    >
      <Icon size={16} />
    </button>
  )
})

/** A field's error: said under it and named by it through aria-describedby. */
export function FieldError({ id, words }: { id: string; words: string }) {
  return (
    <p id={id} className="text-xs text-coral mt-1">
      {words}
    </p>
  )
}

/** What is not finished at a place — not an error, so a quieter tone. */
export function UnfinishedMark({ words }: { words: string }) {
  return <p className="text-xs text-amber-dark mt-1">{words}</p>
}
