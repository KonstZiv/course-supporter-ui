import type { BillingBalanceResponse } from '../../types/api'
import { formatDate, formatUnits } from '../../utils/units'
import { SITE_PRICING_URL } from '../site/siteLinks'
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
   * The reminders right under "Доступно": the author passes theirs, the portal
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
        Залишок
      </h2>
      <p className="text-2xl font-semibold text-ink">
        Доступно: {formatUnits(balance.available)}
      </p>
      {/* The reminders under "Доступно": the author's or the portal's own. */}
      <div data-billing-reminders="">{reminders}</div>
      <div className="space-y-1 text-ink-light">
        {reserved > 0 && (
          <p>
            Зарезервовано для дій, які виконуються зараз: {formatUnits(reserved)}.
          </p>
        )}
        {held > 0 && (
          <p>
            Тимчасово недоступно: {formatUnits(held)} — на час повернення оплати
            або спору щодо платежу.
          </p>
        )}
        {difference > 0 && (
          <p>
            Використано понад залишок: {formatUnits(difference)} — це буде
            враховано першим під час наступної купівлі.
          </p>
        )}
        {expiry && (
          <p>
            Найближче згорання: {formatUnits(expiry.units)} —{' '}
            {formatDate(expiry.expires_on)}.
          </p>
        )}
        {nothing && <p>Юнітів поки немає.</p>}
      </div>
      <p>
        <NewTabLink href={SITE_PRICING_URL}>Як визначається вартість</NewTabLink>
      </p>
    </section>
  )
}
