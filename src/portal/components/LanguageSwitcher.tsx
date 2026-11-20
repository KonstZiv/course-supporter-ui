import { clsx } from 'clsx'
import { enabledLanguages } from '../../i18n/languages'
import { useLanguage, useT } from '../../i18n/LanguageContext'
import { useSetLanguage } from '../stores/language'

/**
 * The choice of the pages' language: each enabled language named in itself,
 * the current one pressed. Changes the language in place — the page is not
 * reloaded, and what is typed into a form stays.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const current = useLanguage()
  const setLanguage = useSetLanguage()
  const t = useT()
  const languages = enabledLanguages()
  if (languages.length < 2) return null
  return (
    <div
      role="group"
      aria-label={t('portal.language.label')}
      className={clsx('inline-flex items-center gap-1 text-sm', className)}
    >
      {languages.map(({ code, htmlLang, nativeName }) => {
        const isCurrent = code === current
        return (
          <button
            key={code}
            type="button"
            lang={htmlLang}
            aria-pressed={isCurrent}
            onClick={() => {
              if (!isCurrent) setLanguage(code)
            }}
            className={clsx(
              'rounded-lg px-2 py-1',
              isCurrent
                ? 'bg-canvas-dark/60 font-semibold text-navy-dark'
                : 'text-ink-muted hover:text-ink',
            )}
          >
            {nativeName}
          </button>
        )
      })}
    </div>
  )
}

/** The switcher at the top of a page before sign-in — the same on each of them. */
export function PublicLanguageBar() {
  return (
    <div className="flex justify-end px-6 pt-4">
      <LanguageSwitcher />
    </div>
  )
}
