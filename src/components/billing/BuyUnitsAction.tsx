import { Link, useLocation } from 'react-router-dom'
import { buyUnitsText } from '../../utils/authorBillingTexts'
import { useLanguage } from '../../i18n/LanguageContext'

/** The id of the packages' place on "Юніти": a reminder there scrolls to it. */
export const PACKAGES_ANCHOR_ID = 'billing-packages'

const BILLING_PATH = '/billing'

/**
 * "Купити юніти" of a reminder or of the banner: on "Юніти" it scrolls to the
 * packages, anywhere else it leads to "Юніти".
 */
export function BuyUnitsAction() {
  const { pathname } = useLocation()
  const language = useLanguage()

  if (pathname === BILLING_PATH) {
    return (
      <button
        type="button"
        className="btn-primary btn-sm"
        onClick={() =>
          document
            .getElementById(PACKAGES_ANCHOR_ID)
            ?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
        }
      >
        {buyUnitsText(language)}
      </button>
    )
  }
  return (
    <Link to={BILLING_PATH} className="btn-primary btn-sm">
      {buyUnitsText(language)}
    </Link>
  )
}
