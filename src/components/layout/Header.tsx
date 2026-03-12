import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth'
import { BookOpen, LayoutDashboard, LogOut } from 'lucide-react'
import { clsx } from 'clsx'

export function Header() {
  const logout = useAuthStore((s) => s.logout)
  const location = useLocation()
  const isHome = location.pathname === '/'

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-canvas-dark/40">
      <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-lg bg-navy flex items-center justify-center
                          group-hover:bg-navy-light transition-colors">
            <BookOpen size={18} className="text-amber-light" />
          </div>
          <span className="font-display text-xl text-ink tracking-tight">
            Course Supporter
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          <Link
            to="/"
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
              isHome
                ? 'bg-navy-pale text-navy'
                : 'text-ink-light hover:bg-canvas-dark hover:text-ink',
            )}
          >
            <LayoutDashboard size={16} />
            Курси
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                       text-ink-muted hover:bg-coral-pale hover:text-coral transition-colors ml-2"
          >
            <LogOut size={16} />
            Вийти
          </button>
        </nav>
      </div>
    </header>
  )
}
