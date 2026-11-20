import { useLanguage, useT } from '../../i18n/LanguageContext'
import { siteUrl, SITE_NAV_LINK_CLASS, type SiteLink } from './siteLinks'

interface SiteHeaderProps {
  /** Links on the right, in order; each page passes its own. */
  links: SiteLink[]
}

/**
 * The public site's header for the platform's neutral pages: the text logo
 * leading to the site and the links the page passes. Plain <a> links and no
 * app state, so the portal can use it too.
 */
export function SiteHeader({ links }: SiteHeaderProps) {
  const language = useLanguage()
  const t = useT()
  return (
    <header className="bg-canvas border-b border-canvas-dark">
      <div className="mx-auto flex max-w-[68.75rem] flex-wrap items-center justify-between gap-x-5 gap-y-2 px-4 py-4 sm:px-6">
        <a
          href={siteUrl(language, 'home')}
          className="font-display font-semibold text-navy-dark text-[1.25rem] sm:text-[1.5rem] leading-tight no-underline"
        >
          Course Supporter
        </a>
        {links.length > 0 && (
          <nav aria-label={t('shared.site.mainNav')}>
            <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {links.map(({ label, href }) => (
                <li key={href}>
                  <a href={href} className={SITE_NAV_LINK_CLASS}>
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </header>
  )
}
