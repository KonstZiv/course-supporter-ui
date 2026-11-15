// Pages of the platform's public site the "Юніти" page links to. The author
// opens them in a new tab; the program makes no request to the site.
export const SITE_PRICING = 'https://pythoncourse.me/uk/pricing/'
export const SITE_TERMS = 'https://pythoncourse.me/uk/terms/'
export const SITE_REFUNDS = 'https://pythoncourse.me/uk/refunds/'

export function SiteLink({
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
      className="text-navy underline underline-offset-2 hover:text-navy-light"
    >
      {children}
    </a>
  )
}
