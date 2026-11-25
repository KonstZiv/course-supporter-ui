import { useId } from 'react'
import { NewTabLink } from '../../components/billing/NewTabLink'
import { siteUrl } from '../../components/site/siteLinks'
import { useLanguage, useT } from '../../i18n/LanguageContext'
import { joinConsentLines } from '../../utils/billingConsent'

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

interface JoinConsentProps {
  adult: boolean
  onAdultChange: (checked: boolean) => void
  consent: boolean
  onConsentChange: (checked: boolean) => void
  /** The terms changed since the page opened: say so. */
  termsUpdated: boolean
}

/**
 * The two marks a join needs: "18 or older" and the consent to the terms. The
 * consent's four lines are shown exactly as `joinConsentLines` has them — the
 * very text fingerprinted — its three names linked to the site's pages; the
 * age mark sits under the same title and is not part of that text.
 */
export function JoinConsent({
  adult,
  onAdultChange,
  consent,
  onConsentChange,
  termsUpdated,
}: JoinConsentProps) {
  const adultId = useId()
  const consentId = useId()
  const language = useLanguage()
  const t = useT()
  const [title, checkboxLine, summaryLine, changeLine] = joinConsentLines(language)
  const links: Record<string, string> = {
    [t('shared.consent.join.termsLinkWords')]: siteUrl(language, 'terms'),
    [t('shared.consent.join.refundsLinkWords')]: siteUrl(language, 'refunds'),
    [t('shared.consent.join.privacyLinkWords')]: siteUrl(language, 'privacy'),
  }
  const linkPhrases = new RegExp(`(${Object.keys(links).map(escapeRegExp).join('|')})`)
  return (
    <fieldset className="space-y-3 text-sm text-ink">
      <legend className="font-medium mb-2">{title}</legend>
      {termsUpdated && (
        <p role="status" className="rounded-xl bg-navy-pale p-3">
          {t('shared.consent.termsUpdated')}
        </p>
      )}
      <div className="flex items-start gap-3">
        <input
          id={adultId}
          type="checkbox"
          className="mt-1 h-4 w-4 shrink-0 accent-navy"
          checked={adult}
          onChange={(e) => onAdultChange(e.target.checked)}
        />
        <label htmlFor={adultId}>{t('portal.join.adult')}</label>
      </div>
      <div className="flex items-start gap-3">
        <input
          id={consentId}
          type="checkbox"
          className="mt-1 h-4 w-4 shrink-0 accent-navy"
          checked={consent}
          onChange={(e) => onConsentChange(e.target.checked)}
        />
        <label htmlFor={consentId}>
          {checkboxLine.split(linkPhrases).map((part, i) =>
            links[part] ? (
              <NewTabLink key={i} href={links[part]}>
                {part}
              </NewTabLink>
            ) : (
              part
            ),
          )}
        </label>
      </div>
      <p className="text-ink-light">{summaryLine}</p>
      <p className="text-ink-light">{changeLine}</p>
    </fieldset>
  )
}
