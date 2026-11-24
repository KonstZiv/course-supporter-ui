import { AlertTriangle } from 'lucide-react'
import { useT } from '../../i18n/LanguageContext'

interface ContradictionsBlockProps {
  contradictions?: string[] | null
}

export function ContradictionsBlock({ contradictions }: ContradictionsBlockProps) {
  const t = useT()

  if (!contradictions || contradictions.length === 0) return null

  return (
    <div className="rounded-2xl bg-amber-pale border border-amber/30 p-5 text-ink space-y-3">
      <h3 className="font-semibold text-ink flex items-center gap-2">
        <AlertTriangle className="text-amber shrink-0" size={18} />
        <span>{t('panel.criteria.contradictions.title')}</span>
      </h3>
      <p className="text-sm text-ink">{t('panel.criteria.contradictions.lead')}</p>
      <ul className="list-disc pl-5 space-y-1 text-sm text-ink">
        {contradictions.map((item, idx) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>
      <p className="text-xs text-ink-muted">{t('panel.criteria.contradictions.fixHint')}</p>
    </div>
  )
}
