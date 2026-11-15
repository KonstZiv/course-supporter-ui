import { useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  billingReason,
  getTerms,
  postCheckout,
  postConsent,
} from '../../api/billing'
import type { BillingPackagesResponse } from '../../types/api'
import { consentSha256 } from '../../utils/billingConsent'
import {
  actionFailureText,
  PURCHASE_CLOSED_REASONS,
} from '../../utils/billingWords'
import { formatPackageName, formatPriceEur } from '../../utils/units'
import { ContactAdmin } from '../ui/ContactAdmin'
import { ConsentDialog } from './ConsentDialog'
import { SITE_REFUNDS_URL, SITE_TERMS_URL } from '../site/siteLinks'
import { NewTabLink } from './NewTabLink'

export const PURCHASE_NOT_OPEN_TEXT =
  'Купівля юнітів у програмі ще не відкрита. Якщо юніти потрібні вам зараз, напишіть адміністраторові платформи.'

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

interface PackagesSectionProps {
  packages: BillingPackagesResponse
  /** The package list is out of date (a package left the sale): load it again. */
  onStale: () => void
}

/**
 * The packages on sale and the purchase: the terms, the one-time consent,
 * the checkout, then the payment page in the same tab.
 */
export function PackagesSection({ packages, onStale }: PackagesSectionProps) {
  const [closedByRefusal, setClosedByRefusal] = useState(false)
  const [buyingId, setBuyingId] = useState<string | null>(null)
  const [opening, setOpening] = useState(false)
  const [consent, setConsent] = useState<Consent | null>(null)
  const [error, setError] = useState<string | null>(null)
  // A purchase under way, set before any state update lands: a second press
  // in the same moment sends nothing.
  const busy = useRef(false)

  const closed = !packages.purchase.open || closedByRefusal

  function finish() {
    busy.current = false
    setBuyingId(null)
    setOpening(false)
  }

  function fail(err: unknown) {
    finish()
    const reason = billingReason(err)
    if (reason !== null && PURCHASE_CLOSED_REASONS.includes(reason)) {
      setClosedByRefusal(true)
      return
    }
    setError(actionFailureText(err))
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
      const { checkout_url } = await postCheckout(packageId)
      window.location.assign(checkout_url)
    } catch (err) {
      if (billingReason(err) !== 'terms_consent_required') throw err
      showConsent((await getTerms()).terms_version, false)
    }
  }

  async function buy(packageId: string) {
    if (busy.current) return
    busy.current = true
    setBuyingId(packageId)
    setOpening(true)
    setError(null)
    try {
      const terms = await getTerms()
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
      await postConsent(consent.termsVersion, await consentSha256())
    } catch (err) {
      try {
        if (billingReason(err) !== 'terms_changed') throw err
        showConsent((await getTerms()).terms_version, true)
      } catch (failed) {
        setConsent({ ...consent, submitting: false, error: actionFailureText(failed) })
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
        Пакети
      </h2>

      {closed && (
        <div className="card p-5 space-y-3">
          <p className="text-ink">{PURCHASE_NOT_OPEN_TEXT}</p>
          <ContactAdmin fallback="always" />
        </div>
      )}

      {error && (
        <div className="rounded-2xl bg-canvas-dark p-4 space-y-2">
          <p role="alert" className="text-ink">
            {error}
          </p>
          <ContactAdmin message={error} fallback="after-click" />
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
                {formatPackageName(pkg.units)}
              </h3>
              {price !== undefined && (
                <p className="font-display font-semibold text-[1.875rem] text-navy-dark">
                  {formatPriceEur(price)}
                </p>
              )}
              <p className="text-sm text-ink-light">
                Діє шість місяців від дня купівлі.
              </p>
              {!closed && (
                <button
                  type="button"
                  className="btn-primary mt-auto"
                  disabled={buyingId !== null}
                  onClick={() => void buy(pkg.id)}
                >
                  {opensThis && <Loader2 size={16} className="animate-spin" />}
                  {opensThis ? 'Відкриваємо сторінку оплати…' : 'Купити'}
                </button>
              )}
            </li>
          )
        })}
      </ul>

      <div className="space-y-2 text-ink-light">
        <p>
          Ціни пакетів вказано в євро. Чи включають вони податки, залежить від
          країни покупця; остаточну суму показано на сторінці оплати перед
          оплатою.
        </p>
        <p>
          Оплату приймає наш посередник-продавець; його назву показано на
          сторінці оплати. Після оплати ви повернетеся на цю сторінку.
        </p>
        <p className="flex flex-wrap gap-x-4 gap-y-1">
          <NewTabLink href={SITE_TERMS_URL}>Умови користування</NewTabLink>
          <NewTabLink href={SITE_REFUNDS_URL}>Повернення оплати</NewTabLink>
        </p>
      </div>

      <ConsentDialog
        open={consent !== null}
        checked={consent?.checked ?? false}
        onCheckedChange={(checked) =>
          setConsent((c) => (c ? { ...c, checked } : c))
        }
        termsUpdated={consent?.updated ?? false}
        submitting={consent?.submitting ?? false}
        error={consent?.error ?? null}
        onConfirm={() => void confirmConsent()}
        onCancel={cancelConsent}
      />
    </section>
  )
}
