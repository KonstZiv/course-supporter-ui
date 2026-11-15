// Addresses of the public site (pythoncourse.me) and of the documentation
// site that the neutral pages — the author sign-in page today — link to.
// They are plain links the visitor follows, never requests the app makes
// (src/privacy/external-allowlist.json).

/** Home page of the public site; the logo in SiteHeader leads here. */
export const SITE_HOME_URL = 'https://pythoncourse.me/uk/'

/** "How to become an author". Today the site's home page; the address of its own page goes here once it exists. */
export const BECOME_AUTHOR_URL = 'https://pythoncourse.me/uk/'

export const SITE_PRICING_URL = 'https://pythoncourse.me/uk/pricing/'
export const SITE_TERMS_URL = 'https://pythoncourse.me/uk/terms/'
export const SITE_REFUNDS_URL = 'https://pythoncourse.me/uk/refunds/'
export const SITE_PRIVACY_URL = 'https://pythoncourse.me/uk/privacy/'
export const SITE_CONTACT_URL = 'https://pythoncourse.me/uk/contact/'

/** The authors' section of the documentation site. */
export const DOCS_AUTHORS_URL = 'https://about.pythoncourse.me/uk/authors/'

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
