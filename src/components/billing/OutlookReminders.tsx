import { Link, useLocation } from 'react-router-dom'
import { useOutlookStore } from '../../stores/billingOutlook'
import { expiringText, runsOutText } from '../../utils/authorBillingTexts'
import { SITE_TEXT_LINK_CLASS } from '../site/siteLinks'
import { BuyUnitsAction } from './BuyUnitsAction'
import { useLanguage, useT } from '../../i18n/LanguageContext'

/**
 * The author's reminders: the units run out soon at this pace, and units of a
 * package burn soon. Nothing when neither holds. Not closable, nothing kept:
 * they come back with the next answer of the outlook, whatever it says.
 */
export function OutlookReminders() {
  const outlook = useOutlookStore((s) => s.outlook)
  const { pathname } = useLocation()
  const language = useLanguage()
  const t = useT()
  if (!outlook) return null

  const runsOut = runsOutText(language, outlook)
  const expiring = outlook.expiring_soon
  if (!runsOut && !expiring) return null

  return (
    <div className="space-y-2" data-testid="billing-reminders">
      {runsOut && (
        <div className="rounded-2xl bg-amber-pale text-ink p-4 flex flex-wrap items-center gap-3">
          <p className="flex-1 min-w-[12rem]">{runsOut}</p>
          <BuyUnitsAction />
        </div>
      )}
      {expiring && (
        <div className="rounded-2xl bg-amber-pale text-ink p-4 flex flex-wrap items-center gap-3">
          <p className="flex-1 min-w-[12rem]">{expiringText(language, expiring)}</p>
          {pathname !== '/billing' && (
            <Link to="/billing" className={SITE_TEXT_LINK_CLASS}>
              {t('panel.billing.reminders.units')}
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
