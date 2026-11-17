import type { ActionPrice } from '../../hooks/useActionPrice'
import { BUY_UNITS } from '../../utils/authorBillingTexts'
import {
  AFTER_PURCHASE,
  PRICE_FAILED,
  PRICE_MAY_FALL_SHORT,
  PRICE_PENDING,
  PRICE_UNPRICED,
  PRICE_UNPRICED_BATCH,
  UNITS_NOW_ENOUGH,
  priceEnoughText,
  priceShortText,
  unpricedFilesText,
} from '../../utils/priceEstimate'
import { NewTabLink } from './NewTabLink'

/** The "price card" of the site: sun-pale, a 1 px sun border, ink text. */
const CARD = 'rounded-2xl bg-sun-pale border border-sun p-6 text-ink space-y-2'

/**
 * The price of a paid action, before it starts: nothing while charging is off;
 * a line when the price could not be counted; the card with the price and
 * what is available; or the panel "not enough" with the purchase in a new tab.
 */
export function PriceCard({ price }: { price: ActionPrice }) {
  const { view, recovered } = price
  switch (view.kind) {
    case 'none':
      return null
    case 'pending':
      return (
        <p role="status" className="text-sm text-ink-light">
          {PRICE_PENDING}
        </p>
      )
    case 'failed':
      return <p className="text-sm text-ink-light">{PRICE_FAILED}</p>
    case 'unpriced':
      return (
        <p className="text-sm text-ink-light">
          {view.batch ? PRICE_UNPRICED_BATCH : PRICE_UNPRICED}
        </p>
      )
    case 'enough':
      return (
        <div className={CARD} data-testid="price-card">
          {recovered && <p className="font-semibold">{UNITS_NOW_ENOUGH}</p>}
          <p>{priceEnoughText(view.price, view.available)}</p>
          {view.unpriced && (
            <p>{unpricedFilesText(view.unpriced.count, view.unpriced.of)}</p>
          )}
          {view.mayFallShort && <p>{PRICE_MAY_FALL_SHORT}</p>}
        </div>
      )
    case 'short':
      return (
        <div className={CARD} data-testid="price-card" role="alert">
          <p className="font-semibold">
            {priceShortText(view.price, view.available, view.missing)}
          </p>
          <p>
            <NewTabLink href="/billing">{BUY_UNITS}</NewTabLink>
          </p>
          <p>{AFTER_PURCHASE}</p>
        </div>
      )
  }
}
