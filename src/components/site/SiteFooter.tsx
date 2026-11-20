import { useLanguage, useT } from '../../i18n/LanguageContext'
import { Message } from '../../i18n/Message'
import type { MessageKey } from '../../i18n/translate'
import { SUPPORT_ADDRESS } from '../../utils/supportAddress'
import {
  siteUrl,
  SITE_NAV_LINK_CLASS,
  SITE_TEXT_LINK_CLASS,
  type SitePage,
} from './siteLinks'

const LEGAL_PAGES: { label: MessageKey; page: SitePage }[] = [
  { label: 'shared.site.legal.terms', page: 'terms' },
  { label: 'shared.site.legal.refunds', page: 'refunds' },
  { label: 'shared.site.legal.privacy', page: 'privacy' },
  { label: 'shared.site.legal.contact', page: 'contact' },
]

/**
 * The public site's footer for the platform's neutral pages: the legal pages,
 * the company and the support address. No app state, so the portal can use it
 * too.
 */
export function SiteFooter() {
  const language = useLanguage()
  const t = useT()
  return (
    <footer className="bg-canvas-dark">
      <div className="mx-auto max-w-[68.75rem] space-y-4 px-4 py-10 sm:px-6">
        <nav aria-label={t('shared.site.legalNav')}>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {LEGAL_PAGES.map(({ label, page }) => {
              const href = siteUrl(language, page)
              return (
                <li key={page}>
                  <a href={href} className={SITE_NAV_LINK_CLASS}>
                    {t(label)}
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>
        <p className="text-ink-light">{t('shared.site.company')}</p>
        <p className="text-ink-light">
          <Message
            id="shared.site.support"
            values={{
              address: SUPPORT_ADDRESS,
              mail: (chunks) => (
                <a href={`mailto:${SUPPORT_ADDRESS}`} className={SITE_TEXT_LINK_CLASS}>
                  {chunks}
                </a>
              ),
            }}
          />
        </p>
      </div>
    </footer>
  )
}
