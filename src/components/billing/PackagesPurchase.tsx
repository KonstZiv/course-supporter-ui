import { useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import type {
  BillingCheckoutResponse,
  BillingPackagesResponse,
  BillingTermsResponse,
} from '../../types/api'
import { consentSha256, type ConsentLines } from '../../utils/billingConsent'
import {
  actionFailure,
  PURCHASE_CLOSED_REASONS,
  type ActionFailure,
} from '../../utils/billingWords'
import { formatPackageName, formatPriceEur } from '../../utils/units'
import { useLanguage, useT } from '../../i18n/LanguageContext'
import { ConsentDialog } from './ConsentDialog'
import { siteUrl } from '../site/siteLinks'
import { NewTabLink } from './NewTabLink'

/** Where the holder's purchase goes: the author's client or the portal's. */
export interface PurchaseApi {
  getTerms: () => Promise<BillingTermsResponse>
  postConsent: (termsVersion: string, textSha256: string) => Promise<unknown>
  postCheckout: (packageId: string) => Promise<BillingCheckoutResponse>
  /** The reason code of a refusal (`detail.code`), or null. */
  reasonOf: (err: unknown) => string | null
  /** Whether the server answered the failed call at all. */
  answered: (err: unknown) => boolean
}

interface Consent {
  termsVersion: string
  checked: boolean
  updated: boolean
  submitting: boolean
  error: string | null
}

function freshConsent(termsVersion: string, updated: boolean): Consent {
  return { termsVersion, checked: false, updated, submitting: false, error: null }
}

export interface PackagesPurchaseProps {
  packages: BillingPackagesResponse
  /** The package list is out of date (a package left the sale): load it again. */
  onStale: () => void
  api: PurchaseApi
  /** The consent text the holder agrees to — shown and fingerprinted. */
  consentLines: ConsentLines
  /** The sentence for each failure of an action, each app its own. */
  failureWords: Record<ActionFailure, string>
  /** Over the cards while the purchase is not open: the line and the way to write. */
  closedNote: React.ReactNode
  /** A failure's sentence and the way to write about it, each app its own. */
  renderFailure: (text: string) => React.ReactNode
}

/**
 * The packages on sale and the purchase: the terms, the one-time consent,
 * the checkout, then the payment page in the same tab. Shared by the author's
 * section (`PackagesSection`) and the student's (portal).
 */
export function PackagesPurchase({
  packages,
  onStale,
  api,
  consentLines,
  failureWords,
  closedNote,
  renderFailure,
}: PackagesPurchaseProps) {
  const language = useLanguage()
  const t = useT()
  const [closedByRefusal, setClosedByRefusal] = useState(false)
  const [buyingId, setBuyingId] = useState<string | null>(null)
  const [opening, setOpening] = useState(false)
  const [consent, setConsent] = useState<Consent | null>(null)
  const [error, setError] = useState<string | null>(null)
  // A purchase under way, set before any state update lands: a second press
  // in the same moment sends nothing.
  const busy = useRef(false)

  const closed = !packages.purchase.open || closedByRefusal

  function failureText(err: unknown): string {
    return failureWords[actionFailure(api.reasonOf(err), api.answered(err))]
  }

  function finish() {
    busy.current = false
    setBuyingId(null)
    setOpening(false)
  }

  function fail(err: unknown) {
    finish()
    const reason = api.reasonOf(err)
    if (reason !== null && PURCHASE_CLOSED_REASONS.includes(reason)) {
      setClosedByRefusal(true)
      return
    }
    setError(failureText(err))
    if (reason === 'package_not_found') onStale()
  }

  function showConsent(termsVersion: string, updated: boolean) {
    setOpening(false)
    setConsent(freshConsent(termsVersion, updated))
  }

  // The checkout, then the payment page; a refusal for want of consent opens
  // the consent window instead. The purchase stays under way while the
  // browser leaves for the payment page.
  async function openCheckout(packageId: string) {
    setOpening(true)
    try {
      const { checkout_url } = await api.postCheckout(packageId)
      window.location.assign(checkout_url)
    } catch (err) {
      if (api.reasonOf(err) !== 'terms_consent_required') throw err
      showConsent((await api.getTerms()).terms_version, false)
    }
  }

  async function buy(packageId: string) {
    if (busy.current) return
    busy.current = true
    setBuyingId(packageId)
    setOpening(true)
    setError(null)
    try {
      const terms = await api.getTerms()
      if (terms.consent_required) showConsent(terms.terms_version, false)
      else await openCheckout(packageId)
    } catch (err) {
      fail(err)
    }
  }

  async function confirmConsent() {
    if (!consent || !buyingId || consent.submitting) return
    setConsent({ ...consent, submitting: true, error: null })
    try {
      await api.postConsent(consent.termsVersion, await consentSha256(consentLines))
    } catch (err) {
      try {
        if (api.reasonOf(err) !== 'terms_changed') throw err
        showConsent((await api.getTerms()).terms_version, true)
      } catch (failed) {
        setConsent({ ...consent, submitting: false, error: failureText(failed) })
      }
      return
    }
    setConsent(null)
    try {
      await openCheckout(buyingId)
    } catch (err) {
      fail(err)
    }
  }

  function cancelConsent() {
    setConsent(null)
    finish()
  }

  return (
    <section aria-labelledby="billing-packages" className="space-y-4">
      <h2 id="billing-packages" className="font-display text-xl text-ink">
        {t('shared.packages.title')}
      </h2>

      {closed && <div className="card p-5 space-y-3">{closedNote}</div>}

      {error && (
        <div className="rounded-2xl bg-canvas-dark p-4 space-y-2">
          {renderFailure(error)}
        </div>
      )}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {packages.packages.map((pkg) => {
          const price = pkg.prices_minor.EUR
          const opensThis = opening && buyingId === pkg.id
          return (
            // As the package cards of the site's pricing page: sky-pale with a
            // sky border, no shadow; the price in the heading face, navy-dark.
            <li
              key={pkg.id}
              className="rounded-2xl bg-sky-pale border border-sky p-6 flex flex-col gap-2"
            >
              <h3 className="font-display text-lg text-ink">
                {formatPackageName(language, pkg.units)}
              </h3>
              {price !== undefined && (
                <p className="font-display font-semibold text-[1.875rem] text-navy-dark">
                  {formatPriceEur(language, price)}
                </p>
              )}
              <p className="text-sm text-ink-light">{t('shared.packages.validity', { months: pkg.validity_months })}</p>
              {!closed && (
                <button
                  type="button"
                  className="btn-primary mt-auto"
                  disabled={buyingId !== null}
                  onClick={() => void buy(pkg.id)}
                >
                  {opensThis && <Loader2 size={16} className="animate-spin" />}
                  {opensThis ? t('shared.packages.opening') : t('shared.packages.buy')}
                </button>
              )}
            </li>
          )
        })}
      </ul>

      <div className="space-y-2 text-ink-light">
        <p>{t('shared.packages.pricesNote')}</p>
        <p>{t('shared.packages.sellerNote')}</p>
        <p className="flex flex-wrap gap-x-4 gap-y-1">
          <NewTabLink href={siteUrl(language, 'terms')}>{t('shared.site.legal.terms')}</NewTabLink>
          <NewTabLink href={siteUrl(language, 'refunds')}>{t('shared.site.legal.refunds')}</NewTabLink>
        </p>
      </div>

      <ConsentDialog
        open={consent !== null}
        lines={consentLines}
        checked={consent?.checked ?? false}
        onCheckedChange={(checked) =>
          setConsent((c) => (c ? { ...c, checked } : c))
        }
        termsUpdated={consent?.updated ?? false}
        submitting={consent?.submitting ?? false}
        error={consent?.error ?? null}
        renderFailure={renderFailure}
        onConfirm={() => void confirmConsent()}
        onCancel={cancelConsent}
      />
    </section>
  )
}
