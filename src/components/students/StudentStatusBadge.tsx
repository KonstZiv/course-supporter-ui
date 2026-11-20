import { clsx } from 'clsx'
import { useT } from '../../i18n/LanguageContext'

// Tri-state credential status for the tenant-admin roster. NOT the shared
// StatusBadge (that one is typed to ProcessingPhase). Never "видалено" —
// revoke keeps the student + history (DD-6-A is deferred hard-delete):
//   null  → no portal credential provisioned
//   true  → active
//   false → access revoked
export function StudentStatusBadge({ isActive }: { isActive: boolean | null }) {
  const t = useT()
  const { label, cls } =
    isActive === null
      ? {
          label: t('panel.students.status.noAccess'),
          cls: 'bg-canvas-dark text-ink-muted',
        }
      : isActive
        ? { label: t('panel.students.status.active'), cls: 'bg-forest-pale text-forest' }
        : { label: t('panel.students.status.revoked'), cls: 'bg-coral-pale text-coral' }

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
