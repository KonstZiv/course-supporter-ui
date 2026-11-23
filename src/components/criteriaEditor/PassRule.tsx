import { passRule } from '../../utils/criteriaRules'
import { useT } from '../../i18n/LanguageContext'
import type { CriteriaInForce } from '../../types/api'

interface PassRuleProps {
  inForce: CriteriaInForce | null | undefined
}

export function PassRule({ inForce }: PassRuleProps) {
  const t = useT()
  const rule = passRule(inForce)

  return (
    <div className="bg-canvas/50 rounded-2xl border border-canvas-dark/60 p-5 space-y-2">
      <h3 className="font-display text-lg text-ink font-semibold">
        {t('panel.criteria.pass.heading')}
      </h3>
      {rule.kind === 'strict' ? (
        <p className="text-body text-ink">
          {t('panel.criteria.pass.strict', {
            count: rule.count,
            threshold: rule.threshold,
          })}
        </p>
      ) : (
        <p className="text-body text-ink">
          {t('panel.criteria.pass.score', {
            threshold: rule.threshold,
          })}
        </p>
      )}
      {rule.kind === 'score' && rule.hasModelMusts && (
        <p className="text-sm text-ink-muted">
          {t('panel.criteria.pass.modelMustsHint')}
        </p>
      )}
    </div>
  )
}
