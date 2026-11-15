import { useOutlookStore } from '../../stores/billingOutlook'
import { heldReviewsWords } from '../../utils/authorBillingTexts'
import { BuyUnitsAction } from './BuyUnitsAction'

/**
 * Under the header on every page of the author app: students' reviews the
 * author pays for wait for the author's units. Amber, not red — nothing is
 * broken, the reviews start once the units cover them. Not closable.
 */
export function HeldReviewsBanner() {
  const outlook = useOutlookStore((s) => s.outlook)
  const words = outlook ? heldReviewsWords(outlook.held_reviews) : null
  if (!words) return null
  return (
    <div
      data-testid="held-reviews-banner"
      className="bg-amber-pale text-ink border-b border-amber/40"
    >
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center gap-3">
        <p className="flex-1 min-w-[12rem]">{words.text}</p>
        {words.buy && <BuyUnitsAction />}
      </div>
    </div>
  )
}
