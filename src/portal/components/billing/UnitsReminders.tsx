import type { PortalBillingOutlook, PortalPublicNumbers } from '../../types'
import { useLanguage, useT } from '../../../i18n/LanguageContext'
import { expiringReminder, lowReminder, zeroUnitsReminder } from '../../unitsTexts'

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
 * When the student pays themselves, charging is enabled, and ``available === 0``,
 * the ``nextMayFail`` line is replaced by the zero-units reminder (priced when
 * ``publicNumbers`` is ready, plain when unavailable/failed, omitted while
 * ``publicNumbers === undefined`` so nothing flashes).
 *
 * ``buy`` — what "buy units" is on this page (a scroll to the packages, or a
 * way to "Юніти"); ``units`` — the way to "Юніти" beside the expiry, when the
 * page is not "Юніти" itself.
 */
export function UnitsReminders({
  outlook,
  available = null,
  publicNumbers,
  lead = null,
  buy,
  units = null,
}: {
  outlook: PortalBillingOutlook
  available?: number | null
  publicNumbers?: PortalPublicNumbers | null
  lead?: string | null
  buy: React.ReactNode
  units?: React.ReactNode
}) {
  const language = useLanguage()
  const t = useT()
  const reminders: Reminder[] = []
  const zeroUnits =
    outlook.paid_by === 'self' && outlook.charging_enabled && available === 0
  if (zeroUnits) {
    if (publicNumbers !== undefined) {
      reminders.push({
        key: 'zero',
        text: zeroUnitsReminder(language, publicNumbers),
        action: buy,
      })
    }
  } else {
    if (outlook.warning === 'low' && outlook.reviews_left !== null) {
      const text =
        outlook.reviews_left === 0
          ? t('portal.units.nextMayFail')
          : lowReminder(language, outlook.reviews_left)
      reminders.push({ key: 'low', text, action: buy })
    }
    if (outlook.warning === 'next_may_fail') {
      reminders.push({ key: 'next', text: t('portal.units.nextMayFail'), action: buy })
    }
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
