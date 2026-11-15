import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { BookOpen, LogOut, Package } from 'lucide-react'
import { clsx } from 'clsx'
import { usePortalSession } from '../stores/session'
import { portalApi } from '../api/portalClient'
import type { PortalBillingOutlook } from '../types'

/** The portal's sections; the header marks the one a page belongs to. */
export type PortalSection = 'courses' | 'units'

/**
 * Who pays for this student's reviews, by the outlook without a course: only
 * a payment rule for the student counts (a course's own rule is the task
 * page's business). Null while there is no answer, or the ask failed.
 */
function usePaidBy(): PortalBillingOutlook['paid_by'] | null {
  const [paidBy, setPaidBy] = useState<PortalBillingOutlook['paid_by'] | null>(null)
  useEffect(() => {
    let cancelled = false
    portalApi
      .billingOutlook()
      .then((outlook) => {
        if (!cancelled) setPaidBy(outlook.paid_by)
      })
      .catch(() => {
        // The item stays: a student who pays needs it.
      })
    return () => {
      cancelled = true
    }
  }, [])
  return paidBy
}

const ITEM =
  'inline-flex items-center gap-1.5 py-1 underline-offset-[0.3em] decoration-2 decoration-apricot'

/**
 * The portal's header on every signed-in page: the portal's name, "Мої курси",
 * "Юніти" (unless the author pays for the student's reviews) and "Вийти".
 */
export function PortalHeader({ current }: { current: PortalSection }) {
  const { tenantId } = useParams()
  const { pathname } = useLocation()
  const clear = usePortalSession((s) => s.clear)
  const navigate = useNavigate()
  const paidBy = usePaidBy()

  const items: { section: PortalSection; label: string; to: string; icon?: React.ReactNode }[] = [
    { section: 'courses', label: 'Мої курси', to: `/${tenantId}/home` },
  ]
  if (paidBy !== 'author') {
    items.push({
      section: 'units',
      label: 'Юніти',
      to: `/${tenantId}/billing`,
      icon: <Package size={16} aria-hidden />,
    })
  }

  const handleLogout = () => {
    clear()
    navigate(`/${tenantId}/login`, { replace: true })
  }

  return (
    <header className="border-b border-canvas-dark/50 bg-white">
      <div className="max-w-4xl mx-auto px-6 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-navy flex items-center justify-center">
            <BookOpen size={18} className="text-amber-light" aria-hidden />
          </div>
          <span className="font-display text-xl text-ink">Навчальний портал</span>
        </div>
        <nav aria-label="Розділи порталу">
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-1">
            {items.map(({ section, label, to, icon }) => {
              const isCurrent = section === current
              return (
                <li key={section}>
                  <Link
                    to={to}
                    aria-current={isCurrent ? (pathname === to ? 'page' : 'true') : undefined}
                    className={clsx(
                      ITEM,
                      isCurrent
                        ? 'font-semibold text-navy-dark underline'
                        : 'text-ink no-underline hover:underline',
                    )}
                  >
                    {icon}
                    {label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
        <button onClick={handleLogout} className="btn-ghost btn-sm ms-auto">
          <LogOut size={16} aria-hidden />
          Вийти
        </button>
      </div>
    </header>
  )
}
