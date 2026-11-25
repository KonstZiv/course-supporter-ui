import type { ReactNode } from 'react'
import { AlertCircle, BookOpen, CheckCircle2, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'
import { useT } from '../../i18n/LanguageContext'
import { PublicPage } from './PublicPage'

/**
 * A page before sign-in in the look of the sign-in page: the portal's name on
 * top, the page's title, its content. `wide` for a page with a long form.
 */
export function PublicShell({
  title,
  wide = false,
  children,
}: {
  title?: string
  wide?: boolean
  children: ReactNode
}) {
  const t = useT()
  return (
    <PublicPage>
      <div className={clsx('w-full', wide ? 'max-w-md' : 'max-w-sm')}>
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-navy flex items-center justify-center">
            <BookOpen size={20} className="text-amber-light" />
          </div>
          <span className="font-display text-2xl text-ink">{t('portal.header.name')}</span>
        </div>
        {title && <h2 className="font-display text-2xl text-ink mb-2">{title}</h2>}
        {children}
      </div>
    </PublicPage>
  )
}

/** A failure of the page, said inline. */
export function FormError({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      role="alert"
      className={clsx(
        'flex items-start gap-2 p-3 rounded-xl bg-coral-pale text-coral text-sm',
        className,
      )}
    >
      <AlertCircle size={16} className="shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  )
}

/** What went right, said inline. */
export function FormSuccess({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      role="status"
      className={clsx(
        'flex items-start gap-2 p-3 rounded-xl bg-forest-pale text-forest text-sm',
        className,
      )}
    >
      <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  )
}

/** The page is being loaded. */
export function Loading() {
  const t = useT()
  return (
    <div className="flex items-center gap-2 text-ink-muted text-sm">
      <Loader2 size={16} className="animate-spin" />
      {t('portal.common.loading')}
    </div>
  )
}
