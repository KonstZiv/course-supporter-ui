import { SiteHeader } from '../../components/site/SiteHeader'
import { SiteFooter } from '../../components/site/SiteFooter'
import {
  SITE_PRICING_URL,
  SITE_TEXT_LINK_CLASS,
} from '../../components/site/siteLinks'
import { AUTHOR_APP_URL, BECOME_STUDENT_URL, DOCS_URL } from '../portalLinks'

const HEADER_LINKS = [
  { label: 'Ціни', href: SITE_PRICING_URL },
  { label: 'Документація', href: DOCS_URL },
]

/**
 * The portal's neutral page: any address that is not a portal page — the
 * root of the portal's site among them, a mistyped link, a tenant segment
 * that is not a UUID (ratify Q3). Strangers see it too, so it says what the
 * portal is in the public site's look. No tenant context → nothing to fetch.
 */
export function InvalidPortalLink() {
  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <SiteHeader links={HEADER_LINKS} />

      <main className="flex-1 w-full max-w-[36rem] mx-auto px-4 py-10 sm:py-16">
        <h1 className="font-display text-3xl text-ink">
          Навчальний портал Course Supporter
        </h1>
        <p className="text-ink-light mt-4">
          Портал курсу відкривається за посиланням від автора курсу. Якщо ви
          студент, відкрийте посилання, яке дав вам автор.
        </p>
        <p className="mt-3">
          <a href={BECOME_STUDENT_URL} className={SITE_TEXT_LINK_CLASS}>
            Як стати студентом
          </a>
        </p>
        <p className="text-ink-light mt-6">
          Ви автор курсу? Вхід для авторів — у{' '}
          <a href={AUTHOR_APP_URL} className={SITE_TEXT_LINK_CLASS}>
            програмі автора
          </a>
          .
        </p>
      </main>

      <SiteFooter />
    </div>
  )
}
