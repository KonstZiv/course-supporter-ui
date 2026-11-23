import { Link } from 'react-router-dom'
import { ArrowLeft, HelpCircle } from 'lucide-react'
import { docsUrl } from '../site/siteLinks'
import { useLanguage, useT } from '../../i18n/LanguageContext'
import type { AssignmentType } from '../../types/api'
import type { MessageKey } from '../../i18n/translate'

interface CriteriaHeaderProps {
  title: string
  taskType?: AssignmentType | null
  courseRootId?: string | null
  courseNodeId?: string | null
}

const TASK_TYPE_KEYS: Record<string, MessageKey> = {
  short_task: 'panel.upload.taskType.shortTask.label',
  task: 'panel.upload.taskType.task.label',
  project: 'panel.upload.taskType.project.label',
  test: 'panel.upload.taskType.test.label',
}

export function CriteriaHeader({
  title,
  taskType,
  courseRootId,
  courseNodeId,
}: CriteriaHeaderProps) {
  const language = useLanguage()
  const t = useT()

  const backTo = courseRootId
    ? `/course/${courseRootId}${courseNodeId ? `?selected=${courseNodeId}` : ''}`
    : '/'

  const taskTypeLabel = taskType && TASK_TYPE_KEYS[taskType] ? t(TASK_TYPE_KEYS[taskType]) : null

  return (
    <header className="sticky top-16 z-30 bg-white/80 backdrop-blur-md border-b border-canvas-dark/40">
      <div className="max-w-3xl mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <Link
            to={backTo}
            className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-navy/30"
            title={t('panel.criteria.back')}
          >
            <ArrowLeft size={16} />
            <span>{t('panel.criteria.back')}</span>
          </Link>
          <h1 className="font-display text-2xl text-ink truncate">
            {t('panel.criteria.title', { title: title || '' })}
          </h1>
          {taskTypeLabel && (
            <p className="text-xs font-medium text-ink-muted uppercase tracking-wider">
              {taskTypeLabel}
            </p>
          )}
        </div>
        <div className="shrink-0 sm:self-start">
          <a
            href={docsUrl(language, 'authors/api/#criteria-pass')}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-navy hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-navy/30"
          >
            <HelpCircle size={16} />
            <span>{t('panel.criteria.help')}</span>
          </a>
        </div>
      </div>
    </header>
  )
}
