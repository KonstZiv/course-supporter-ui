import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth'
import {
  BookOpen,
  ClipboardCheck,
  DollarSign,
  History,
  LayoutDashboard,
  LogOut,
  Users,
} from 'lucide-react'
import { clsx } from 'clsx'
import type { JobListItemResponse } from '../../types/api'
import { ActivityStrip } from '../activity/ActivityStrip'

// Header nav items, in product order. The history item is last; its place is the
// operator's call — one line to move (§3 c7 / Г1).
const NAV = [
  { to: '/', label: 'Курси', icon: LayoutDashboard },
  { to: '/students', label: 'Студенти', icon: Users },
  { to: '/cost', label: 'Витрати', icon: DollarSign },
  // Витрати ДЗ = homework-review cost. ClipboardCheck (not a $-shaped icon) so it
  // never reads the same as "Витрати" (DollarSign) once labels collapse (Г8 п.4).
  { to: '/cost/homework', label: 'Витрати ДЗ', icon: ClipboardCheck },
  { to: '/history', label: 'Історія матеріалів', icon: History },
] as const

export function Header({
  stripItems = [],
}: {
  stripItems?: JobListItemResponse[]
}) {
  const logout = useAuthStore((s) => s.logout)
  const location = useLocation()

  const linkClass = (active: boolean) =>
    clsx(
      'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
      active
        ? 'bg-navy-pale text-navy'
        : 'text-ink-light hover:bg-canvas-dark hover:text-ink',
    )

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-canvas-dark/40">
      <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group shrink-0">
          <div className="w-9 h-9 rounded-lg bg-navy flex items-center justify-center
                          group-hover:bg-navy-light transition-colors">
            <BookOpen size={18} className="text-amber-light" />
          </div>
          <span className="font-display text-xl text-ink tracking-tight">
            Course Supporter
          </span>
        </Link>

        {/* Activity strip — collapsed floor (В4). Center of the bar; competes
            with the nav for width on a narrow window, never grows the height. */}
        <div className="flex-1 min-w-0 flex justify-center">
          <ActivityStrip items={stripItems} />
        </div>

        {/* A persistent divider between the central zone and the nav (Г8 п.3): the
            zones must not read as one stream once the flex whitespace collapses on
            a narrow window. Independent of the remaining width. */}
        <div className="w-px h-6 bg-canvas-dark/60 shrink-0" aria-hidden />

        {/* Nav. ONE switching point for the whole header (§3 c7): below `lg` every
            label collapses to its icon so the strip keeps its width (В4) — a single
            breakpoint, so the labels never vanish at a different width than the one
            the strip flexes at. The name lives on in aria-label + title, so screen
            readers and hover survive the collapse (the c4 source-type-icon rule). */}
        <nav className="flex items-center gap-1 shrink-0">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              aria-label={label}
              title={label}
              className={linkClass(location.pathname === to)}
            >
              <Icon size={16} />
              <span className="hidden lg:inline">{label}</span>
            </Link>
          ))}
          <button
            onClick={logout}
            aria-label="Вийти"
            title="Вийти"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                       text-ink-muted hover:bg-coral-pale hover:text-coral transition-colors ml-2"
          >
            <LogOut size={16} />
            <span className="hidden lg:inline">Вийти</span>
          </button>
        </nav>
      </div>
    </header>
  )
}
