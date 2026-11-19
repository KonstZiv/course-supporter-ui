import { useT } from '../../i18n/LanguageContext'
import { Message } from '../../i18n/Message'
import type { MessageKey } from '../../i18n/translate'
import { SUPPORT_ADDRESS } from '../../utils/supportAddress'
import {
  SITE_CONTACT_URL,
  SITE_NAV_LINK_CLASS,
  SITE_PRIVACY_URL,
  SITE_REFUNDS_URL,
  SITE_TERMS_URL,
  SITE_TEXT_LINK_CLASS,
} from './siteLinks'

const LEGAL_LINKS: { label: MessageKey; href: string }[] = [
  { label: 'shared.site.legal.terms', href: SITE_TERMS_URL },
  { label: 'shared.site.legal.refunds', href: SITE_REFUNDS_URL },
  { label: 'shared.site.legal.privacy', href: SITE_PRIVACY_URL },
  { label: 'shared.site.legal.contact', href: SITE_CONTACT_URL },
]

/**
 * The public site's footer for the platform's neutral pages: the legal pages,
 * the company and the support address. No app state, so the portal can use it
 * too.
 */
export function SiteFooter() {
  const t = useT()
  return (
    <footer className="bg-canvas-dark">
      <div className="mx-auto max-w-[68.75rem] space-y-4 px-4 py-10 sm:px-6">
        <nav aria-label={t('shared.site.legalNav')}>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {LEGAL_LINKS.map(({ label, href }) => (
              <li key={href}>
                <a href={href} className={SITE_NAV_LINK_CLASS}>
                  {t(label)}
                </a>
              </li>
            ))}
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
