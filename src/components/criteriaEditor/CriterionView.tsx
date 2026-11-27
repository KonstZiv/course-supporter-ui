import { useT } from '../../i18n/LanguageContext'
import { InlineCodeText } from '../ui/InlineCodeText'
import type { CriteriaLayer, CriteriaWeight, CriteriaCheckMethod, Criterion } from '../../types/api'
import type { MessageKey } from '../../i18n/translate'

interface CriterionViewProps {
  criterion: Criterion
  layer?: CriteriaLayer | null
  showPassMark?: boolean
}

const WEIGHT_KEYS: Record<CriteriaWeight, MessageKey> = {
  must: 'panel.criteria.weight.must',
  should: 'panel.criteria.weight.should',
  may: 'panel.criteria.weight.may',
}

const METHOD_KEYS: Record<CriteriaCheckMethod, MessageKey> = {
  model_verdict: 'panel.criteria.method.modelVerdict',
  mandatory_points: 'panel.criteria.method.mandatoryPoints',
  code_test: 'panel.criteria.method.codeTest',
}

export function CriterionView({
  criterion,
  layer = null,
  showPassMark = true,
}: CriterionViewProps) {
  const t = useT()

  const weightLabel = t(WEIGHT_KEYS[criterion.weight])
  const methodLabel = t(METHOD_KEYS[criterion.check_method])

  const showMark = showPassMark && layer !== null && criterion.weight === 'must'
  const isMandatory = layer === 'author' && criterion.must_by_author === true

  return (
    <div className="card p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-canvas-dark/40 pb-3">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-ink text-base">
            {t('panel.criteria.criterion.heading', { id: criterion.id })}
          </h4>
          <span
            title={t('panel.criteria.field.weight')}
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-canvas-dark text-ink-muted"
          >
            {weightLabel}
          </span>
        </div>
        {showMark && (
          isMandatory ? (
            <span
              title={t('panel.criteria.mark.mandatoryHint')}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sun-pale text-ink border border-sun"
            >
              {t('panel.criteria.mark.mandatory')}
            </span>
          ) : (
            <span
              title={t('panel.criteria.mark.scoreOnlyHint')}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-canvas-dark text-ink-muted border border-canvas-dark"
            >
              {t('panel.criteria.mark.scoreOnly')}
            </span>
          )
        )}
      </div>

      <div className="space-y-3">
        <div>
          <span className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">
            {t('panel.criteria.field.text')}
          </span>
          <p className="text-body text-ink whitespace-pre-wrap">
            <InlineCodeText text={criterion.text} />
          </p>
        </div>

        <div>
          <span className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">
            {t('panel.criteria.field.evidence')}
          </span>
          <p className="text-body text-ink whitespace-pre-wrap">{criterion.evidence}</p>
        </div>

        <div>
          <span className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">
            {t('panel.criteria.field.checkMethod')}
          </span>
          <p className="text-sm text-ink">{methodLabel}</p>
          {criterion.check_method === 'mandatory_points' &&
            criterion.mandatory_points &&
            criterion.mandatory_points.length > 0 && (
              <div className="mt-2 space-y-1">
                <span className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
                  {t('panel.criteria.field.points')}
                </span>
                <ol className="list-decimal pl-5 space-y-1 text-sm text-ink">
                  {criterion.mandatory_points.map((pt, idx) => (
                    <li key={pt.id || idx}>{pt.text}</li>
                  ))}
                </ol>
              </div>
            )}
          {criterion.check_method === 'code_test' && criterion.soft_descent && (
            <p className="text-xs text-ink-muted mt-1.5">
              {t('panel.criteria.method.softDescent')}
            </p>
          )}
        </div>

        <div>
          <span className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">
            {t('panel.criteria.field.concepts')}
          </span>
          {criterion.concepts && criterion.concepts.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {criterion.concepts.map((concept) => (
                <span
                  key={concept}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-canvas-dark text-ink-muted"
                >
                  {concept}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-muted">{t('panel.criteria.concepts.none')}</p>
          )}
        </div>
      </div>
    </div>
  )
}
