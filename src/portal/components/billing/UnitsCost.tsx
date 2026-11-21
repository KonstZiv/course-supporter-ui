import { useParams } from 'react-router-dom'
import { NewTabLink } from '../../../components/billing/NewTabLink'
import { usePortalSession } from '../../stores/session'
import { useT } from '../../../i18n/LanguageContext'

/** The site's "cost card": 16 px radius, sun-pale ground, 1 px sun border, ink. */
const COST_CARD = 'rounded-2xl bg-sun-pale border border-sun p-6 text-sm text-ink space-y-2'

/**
 * "Купити юніти": the portal's "Юніти" in a new tab, so the task page — and
 * the file chosen on it — stays where it is.
 */
export function BuyUnitsLink() {
  const { tenantId } = useParams()
  const sessionTenant = usePortalSession((s) => s.tenantId)
  const t = useT()
  const tenant = tenantId ?? sessionTenant
  if (!tenant) return null
  return <NewTabLink href={`/${tenant}/billing`}>{t('portal.units.buy')}</NewTabLink>
}

/**
 * The price of the review and what is available, in the cost card. A test
 * names no price: its card, after the wait, says only that the units came.
 */
export function CostCard({ text, nowEnough }: { text?: string; nowEnough: boolean }) {
  const t = useT()
  return (
    <div className={COST_CARD}>
      {nowEnough && <p className="font-medium">{t('portal.units.nowEnough')}</p>}
      {text && <p>{text}</p>}
    </div>
  )
}

/**
 * In place of the button when the units are short: why, where to buy them,
 * and that the chosen file waits here (when one is chosen).
 */
export function UnitsShortPanel({
  text,
  fileChosen,
}: {
  text: string
  fileChosen: boolean
}) {
  const t = useT()
  return (
    <div className={COST_CARD} role="group" aria-label={t('portal.units.shortPanel')}>
      <p>{text}</p>
      <p>
        <BuyUnitsLink />
      </p>
      {fileChosen && <p className="text-ink-light">{t('portal.units.fileWaitsHere')}</p>}
    </div>
  )
}
