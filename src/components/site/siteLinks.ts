import type { Language } from '../../i18n/languages'

// Addresses of the public site (pythoncourse.me) and of the documentation
// site that the neutral pages — the author sign-in page today — link to.
// They are plain links the visitor follows, never requests the app makes
// (src/privacy/external-allowlist.json).

const SCHEME = 'https'
const SITE_HOST = 'pythoncourse.me'
const DOCS_HOST = 'about.pythoncourse.me'

export const SITE_LANGUAGES: readonly Language[] = ['uk', 'en']

export type SitePage =
  | 'home'
  | 'become-author'
  | 'become-student'
  | 'pricing'
  | 'terms'
  | 'refunds'
  | 'privacy'
  | 'contact'

export function siteUrl(language: Language, page: SitePage): string {
  const lang = (SITE_LANGUAGES as readonly string[]).includes(language) ? language : 'en'
  const base = `${SCHEME}://${SITE_HOST}/${lang}/`
  return page === 'home' ? base : `${base}${page}/`
}

export const DOCS_LANGUAGES: readonly Language[] = ['uk', 'en']

export function docsUrl(language: Language, path = ''): string {
  const lang = (DOCS_LANGUAGES as readonly string[]).includes(language) ? language : 'uk'
  const cleanPath = path.replace(/^\/+/, '')
  return `${SCHEME}://${DOCS_HOST}/${lang}/${cleanPath}`
}

export interface SiteLink {
  label: string
  href: string
}

/** A link in the site's navigation style: ink, an apricot underline on hover. */
export const SITE_NAV_LINK_CLASS =
  'text-ink no-underline underline-offset-[0.3em] decoration-2 decoration-apricot hover:underline'

/** A link inside text, as on the site: navy, a thin underline that thickens on hover. */
export const SITE_TEXT_LINK_CLASS =
  'text-navy underline decoration-1 underline-offset-[0.2em] hover:text-navy-dark hover:decoration-2'
