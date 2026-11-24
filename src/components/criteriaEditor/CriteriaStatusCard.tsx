import { Link } from 'react-router-dom'
import { RotateCcw } from 'lucide-react'
import { ContactAdmin } from '../ui/ContactAdmin'
import { ContradictionsBlock } from './ContradictionsBlock'
import { useT } from '../../i18n/LanguageContext'
import type { CriteriaReasonCode, CriteriaStatus } from '../../types/api'
import type { MessageKey } from '../../i18n/translate'

interface CriteriaStatusCardProps {
  status: CriteriaStatus
  reasonCode?: CriteriaReasonCode | null
  waitingSubmissions?: number
  contradictions?: string[]
  courseRootId?: string | null
  courseNodeId?: string | null
  courseTitle?: string | null
  taskTitle?: string | null
  onRefresh?: () => void
}

function resolveStatusKey(
  status: CriteriaStatus,
  reasonCode?: CriteriaReasonCode | null,
): MessageKey {
  if (status === 'awaiting_first_submission') {
    return 'panel.criteria.status.awaitingFirstSubmission'
  }
  if (status === 'composing') {
    return 'panel.criteria.status.composing'
  }
  if (status === 'not_composed') {
    switch (reasonCode) {
      case 'task_not_processed':
        return 'panel.criteria.status.taskNotProcessed'
      case 'models_unavailable':
        return 'panel.criteria.status.modelsUnavailable'
      case 'limit_reached':
        return 'panel.criteria.status.limitReached'
      case 'composition_error':
        return 'panel.criteria.status.compositionError'
      case 'not_attempted':
        return 'panel.criteria.status.notAttempted'
      default:
        return 'panel.criteria.status.unknown'
    }
  }
  return 'panel.criteria.status.unknown'
}

export function CriteriaStatusCard({
  status,
  reasonCode,
  waitingSubmissions,
  contradictions,
  courseRootId,
  courseNodeId,
  courseTitle,
  taskTitle,
  onRefresh,
}: CriteriaStatusCardProps) {
  const t = useT()
  const key = resolveStatusKey(status, reasonCode)
  const message = t(key)

  const backTo = courseRootId
    ? `/course/${courseRootId}${courseNodeId ? `?selected=${courseNodeId}` : ''}`
    : '/'

  const needsAdmin =
    status === 'not_composed' &&
    (reasonCode === 'models_unavailable' ||
      reasonCode === 'limit_reached' ||
      reasonCode === 'composition_error' ||
      reasonCode === 'not_attempted' ||
      key === 'panel.criteria.status.unknown')

  return (
    <div className="space-y-6">
      <div className="card p-6 space-y-4">
        <p className="text-body text-ink leading-relaxed">{message}</p>

        {waitingSubmissions !== undefined && waitingSubmissions > 0 && (
          <p className="text-sm font-medium text-ink">
            {t('panel.criteria.waiting', { works: waitingSubmissions })}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          {status === 'composing' && onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="btn-secondary text-sm px-4 py-2"
            >
              <RotateCcw size={16} />
              <span>{t('panel.criteria.refresh')}</span>
            </button>
          )}

          {status === 'not_composed' && reasonCode === 'task_not_processed' && (
            <Link
              to={backTo}
              className="btn-secondary text-sm px-4 py-2"
            >
              {t('panel.criteria.back')}
            </Link>
          )}

          {needsAdmin && (
            <ContactAdmin
              fallback="after-click"
              context={{
                course: courseTitle ?? null,
                material: taskTitle ?? null,
              }}
            />
          )}
        </div>
      </div>

      {contradictions && contradictions.length > 0 && (
        <ContradictionsBlock contradictions={contradictions} />
      )}
    </div>
  )
}
