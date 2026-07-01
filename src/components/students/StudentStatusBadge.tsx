import { clsx } from 'clsx'

// Tri-state credential status for the tenant-admin roster. NOT the shared
// StatusBadge (that one is typed to DocumentState). Never "видалено" —
// revoke keeps the student + history (DD-6-A is deferred hard-delete):
//   null  → no portal credential provisioned
//   true  → active
//   false → access revoked
export function StudentStatusBadge({ isActive }: { isActive: boolean | null }) {
  const { label, cls } =
    isActive === null
      ? {
          label: 'Немає доступу до порталу',
          cls: 'bg-canvas-dark text-ink-muted',
        }
      : isActive
        ? { label: 'Активний', cls: 'bg-forest-pale text-forest' }
        : { label: 'Відкликано', cls: 'bg-coral-pale text-coral' }

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        cls,
      )}
    >
      {label}
    </span>
  )
}
