import type { BillingBalanceResponse } from '../../types/api'
import { useLanguage, useT } from '../../i18n/LanguageContext'
import { formatDate, formatUnits } from '../../utils/units'
import { siteUrl } from '../site/siteLinks'
import { NewTabLink } from './NewTabLink'

interface BalanceCardProps {
  balance: BillingBalanceResponse
  /**
   * Whether the line about units used beyond the balance is shown. A student
   * has none (the server's `difference` is always 0 for them): the portal
   * passes false.
   */
  withDifference?: boolean
  /**
   * The reminders right under the available units: the author passes theirs, the portal
   * its own.
   */
  reminders?: React.ReactNode
}

/**
 * Where the holder's units stand (`GET /billing/balance`, the portal's
 * `GET /portal/billing/balance`).
 */
export function BalanceCard({
  balance,
  withDifference = true,
  reminders,
}: BalanceCardProps) {
  const language = useLanguage()
  const t = useT()
  const { reserved, held, next_expiry: expiry } = balance
  const difference = withDifference ? balance.difference : 0
  const nothing =
    balance.balance === 0 &&
    reserved === 0 &&
    held === 0 &&
    difference === 0 &&
    expiry === null

  return (
    <section aria-labelledby="billing-balance" className="card p-6 space-y-3">
      <h2 id="billing-balance" className="font-display text-xl text-ink">
        {t('shared.balance.title')}
      </h2>
      <p className="text-2xl font-semibold text-ink">
        {t('shared.balance.available', { units: formatUnits(language, balance.available) })}
      </p>
      {/* The reminders under the available units: the author's or the portal's own. */}
      <div data-billing-reminders="">{reminders}</div>
      <div className="space-y-1 text-ink-light">
        {reserved > 0 && (
          <p>{t('shared.balance.reserved', { units: formatUnits(language, reserved) })}</p>
        )}
        {held > 0 && (
          <p>{t('shared.balance.held', { units: formatUnits(language, held) })}</p>
        )}
        {difference > 0 && (
          <p>
            {t('shared.balance.difference', { units: formatUnits(language, difference) })}
          </p>
        )}
        {expiry && (
          <p>
            {t('shared.balance.nextExpiry', {
              units: formatUnits(language, expiry.units),
              date: formatDate(language, expiry.expires_on),
            })}
          </p>
        )}
        {nothing && <p>{t('shared.balance.nothing')}</p>}
      </div>
      <p>
        <NewTabLink href={siteUrl(language, 'pricing')}>{t('shared.balance.pricingLink')}</NewTabLink>
      </p>
    </section>
  )
}
