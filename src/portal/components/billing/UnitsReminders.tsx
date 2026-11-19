import type { PortalBillingOutlook } from '../../types'
import { useLanguage, useT } from '../../../i18n/LanguageContext'
import { expiringReminder, lowReminder } from '../../unitsTexts'

interface Reminder {
  key: string
  text: string
  action: React.ReactNode
}

/**
 * The student's reminders, from the outlook: units running low, the next
 * review that may not be covered, units about to expire — under a ``lead``
 * line, when the page has one. They are not closed and nothing of them is kept
 * in the browser: each goes when its condition does. Nothing renders when
 * there is nothing to say.
 *
 * ``buy`` — what "buy units" is on this page (a scroll to the packages, or a
 * way to "Юніти"); ``units`` — the way to "Юніти" beside the expiry, when the
 * page is not "Юніти" itself.
 */
export function UnitsReminders({
  outlook,
  lead = null,
  buy,
  units = null,
}: {
  outlook: PortalBillingOutlook
  lead?: string | null
  buy: React.ReactNode
  units?: React.ReactNode
}) {
  const language = useLanguage()
  const t = useT()
  const reminders: Reminder[] = []
  if (outlook.warning === 'low' && outlook.reviews_left !== null) {
    reminders.push({ key: 'low', text: lowReminder(language, outlook.reviews_left), action: buy })
  }
  if (outlook.warning === 'next_may_fail') {
    reminders.push({ key: 'next', text: t('portal.units.nextMayFail'), action: buy })
  }
  if (outlook.expiring_soon) {
    const { units: expiring, expires_on: on } = outlook.expiring_soon
    reminders.push({ key: 'expiry', text: expiringReminder(language, expiring, on), action: units })
  }
  if (lead === null && reminders.length === 0) return null
  return (
    <div className="space-y-3">
      {lead !== null && <p className="text-ink">{lead}</p>}
      {reminders.length > 0 && (
        <ul className="space-y-2" aria-label={t('portal.units.remindersLabel')}>
          {reminders.map(({ key, text, action }) => (
            <li
              key={key}
              className="rounded-xl bg-amber-pale text-ink text-sm p-3 flex flex-wrap items-center gap-x-4 gap-y-1"
            >
              <span>{text}</span>
              {action}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
