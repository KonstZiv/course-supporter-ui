import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface SectionGroupProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}

export function SectionGroup({ title, children, defaultOpen = false }: SectionGroupProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border border-canvas-dark/40 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 bg-canvas hover:bg-canvas-dark/30 transition-colors text-left"
      >
        <span className="text-xs font-semibold text-ink-light uppercase tracking-wide">
          {title}
        </span>
        <ChevronDown
          size={14}
          className={`text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <div className="p-3 space-y-3">{children}</div>}
    </div>
  )
}
