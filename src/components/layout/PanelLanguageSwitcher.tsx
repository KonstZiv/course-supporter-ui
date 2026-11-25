import { clsx } from 'clsx'
import { enabledLanguages } from '../../i18n/languages'
import { useLanguage, useT } from '../../i18n/LanguageContext'
import { useSetPanelLanguage } from '../../stores/panelLanguage'

/**
 * The choice of the author panel pages' language: each enabled language named
 * in itself, the current one pressed. Changes the language in place without
 * reloading the page.
 */
export function PanelLanguageSwitcher({ className }: { className?: string }) {
  const current = useLanguage()
  const setLanguage = useSetPanelLanguage()
  const t = useT()
  const languages = enabledLanguages()
  if (languages.length < 2) return null
  return (
    <div
      role="group"
      aria-label={t('panel.language.label')}
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
