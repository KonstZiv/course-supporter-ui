import { useT } from '../../i18n/LanguageContext'

// O-3: marks a student who enrolled by the course link, not through the author.
// Ink on a pale navy ground — never text on an accent colour.
export function SelfEnrolledBadge() {
  const t = useT()
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-navy-pale text-ink">
      {t('panel.students.selfEnrolled')}
    </span>
  )
}
