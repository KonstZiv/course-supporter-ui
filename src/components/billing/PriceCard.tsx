import type { ActionPrice } from '../../hooks/useActionPrice'
import { buyUnitsText } from '../../utils/authorBillingTexts'
import {
  afterPurchaseText,
  priceEnoughText,
  priceFailedText,
  priceMayFallShortText,
  pricePendingText,
  priceShortText,
  priceUnpricedText,
  unitsNowEnoughText,
  unpricedFilesText,
} from '../../utils/priceEstimate'
import { NewTabLink } from './NewTabLink'
import { useLanguage } from '../../i18n/LanguageContext'

/** The "price card" of the site: sun-pale, a 1 px sun border, ink text. */
const CARD = 'rounded-2xl bg-sun-pale border border-sun p-6 text-ink space-y-2'

/**
 * The price of a paid action, before it starts: nothing while charging is off;
 * a line when the price could not be counted; the card with the price and
 * what is available; or the panel "not enough" with the purchase in a new tab.
 */
export function PriceCard({ price }: { price: ActionPrice }) {
  const language = useLanguage()
  const { view, recovered } = price
  switch (view.kind) {
    case 'none':
      return null
    case 'pending':
      return (
        <p role="status" className="text-sm text-ink-light">
          {pricePendingText(language)}
        </p>
      )
    case 'failed':
      return <p className="text-sm text-ink-light">{priceFailedText(language)}</p>
    case 'unpriced':
      return (
        <p className="text-sm text-ink-light">
          {priceUnpricedText(language, view.batch)}
        </p>
      )
    case 'enough':
      return (
        <div className={CARD} data-testid="price-card">
          {recovered && <p className="font-semibold">{unitsNowEnoughText(language)}</p>}
          <p>{priceEnoughText(language, view.price, view.available)}</p>
          {view.unpriced && (
            <p>{unpricedFilesText(language, view.unpriced.count, view.unpriced.of)}</p>
          )}
          {view.mayFallShort && <p>{priceMayFallShortText(language)}</p>}
        </div>
      )
    case 'short':
      return (
        <div className={CARD} data-testid="price-card" role="alert">
          <p className="font-semibold">
            {priceShortText(language, view.price, view.available, view.missing)}
          </p>
          <p>
            <NewTabLink href="/billing">{buyUnitsText(language)}</NewTabLink>
          </p>
          <p>{afterPurchaseText(language)}</p>
        </div>
      )
  }
}
