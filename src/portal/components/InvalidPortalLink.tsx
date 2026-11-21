import { SiteHeader } from '../../components/site/SiteHeader'
import {
  docsUrl,
  siteUrl,
  SITE_TEXT_LINK_CLASS,
} from '../../components/site/siteLinks'
import { useLanguage, useT } from '../../i18n/LanguageContext'
import { Message } from '../../i18n/Message'
import { AUTHOR_APP_URL } from '../portalLinks'
import { PublicLanguageBar } from './LanguageSwitcher'

/**
 * The portal's neutral page: any address that is not a portal page — the
 * root of the portal's site among them, a mistyped link, a tenant segment
 * that is not a UUID (ratify Q3). Strangers see it too, so it says what the
 * portal is in the public site's look. No tenant context → nothing to fetch.
 * The site's footer comes from PortalLayout, which frames every portal route.
 */
export function InvalidPortalLink() {
  const language = useLanguage()
  const t = useT()
  const headerLinks = [
    { label: t('portal.invalidLink.pricing'), href: siteUrl(language, 'pricing') },
    { label: t('portal.invalidLink.docs'), href: docsUrl(language) },
  ]
  return (
    <div className="flex-1 flex flex-col">
      <PublicLanguageBar />
      <SiteHeader links={headerLinks} />

      <main className="flex-1 w-full max-w-[36rem] mx-auto px-4 py-10 sm:py-16">
        <h1 className="font-display text-3xl text-ink">
          {t('portal.invalidLink.title')}
        </h1>
        <p className="text-ink-light mt-4">{t('portal.invalidLink.lead')}</p>
        <p className="mt-3">
          <a href={siteUrl(language, 'become-student')} className={SITE_TEXT_LINK_CLASS}>
            {t('portal.invalidLink.becomeStudent')}
          </a>
        </p>
        <p className="text-ink-light mt-6">
          <Message
            id="portal.invalidLink.author"
            values={{
              app: (chunks) => (
                <a href={AUTHOR_APP_URL} className={SITE_TEXT_LINK_CLASS}>
                  {chunks}
                </a>
              ),
            }}
          />
        </p>
      </main>
    </div>
  )
}
