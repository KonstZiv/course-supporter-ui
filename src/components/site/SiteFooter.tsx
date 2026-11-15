import { SUPPORT_ADDRESS } from '../../utils/contactAdmin'
import {
  SITE_CONTACT_URL,
  SITE_NAV_LINK_CLASS,
  SITE_PRIVACY_URL,
  SITE_REFUNDS_URL,
  SITE_TERMS_URL,
  SITE_TEXT_LINK_CLASS,
  type SiteLink,
} from './siteLinks'

const LEGAL_LINKS: SiteLink[] = [
  { label: 'Умови користування', href: SITE_TERMS_URL },
  { label: 'Повернення оплати', href: SITE_REFUNDS_URL },
  { label: 'Конфіденційність', href: SITE_PRIVACY_URL },
  { label: 'Контакти', href: SITE_CONTACT_URL },
]

/**
 * The public site's footer for the platform's neutral pages: the legal pages,
 * the company and the support address. No app state, so the portal can use it
 * too.
 */
export function SiteFooter() {
  return (
    <footer className="bg-canvas-dark">
      <div className="mx-auto max-w-[68.75rem] space-y-4 px-4 py-10 sm:px-6">
        <nav aria-label="Правова інформація">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {LEGAL_LINKS.map(({ label, href }) => (
              <li key={href}>
                <a href={href} className={SITE_NAV_LINK_CLASS}>
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <p className="text-ink-light">EXSOL DOO, Чорногорія</p>
        <p className="text-ink-light">
          Підтримка:{' '}
          <a href={`mailto:${SUPPORT_ADDRESS}`} className={SITE_TEXT_LINK_CLASS}>
            {SUPPORT_ADDRESS}
          </a>
        </p>
      </div>
    </footer>
  )
}
