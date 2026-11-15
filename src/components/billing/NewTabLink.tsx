import { SITE_TEXT_LINK_CLASS } from '../site/siteLinks'

/**
 * A link to a page of the platform's public site (`site/siteLinks`), opened
 * in a new tab without the referrer. The program makes no request to the site.
 */
export function NewTabLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={SITE_TEXT_LINK_CLASS}
    >
      {children}
    </a>
  )
}
