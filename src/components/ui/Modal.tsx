import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  wide?: boolean
}

// What Tab can land on inside the panel.
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

export function Modal({ open, onClose, title, children, wide }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()

  // What had focus when the window opened, to give focus back to. Read during
  // the render that opens it: by the time an effect runs, a field with
  // autoFocus inside the window has already taken focus.
  const [opener, setOpener] = useState<Element | null>(() =>
    open ? document.activeElement : null,
  )
  const [shownOpen, setShownOpen] = useState(open)
  if (open !== shownOpen) {
    setShownOpen(open)
    setOpener(open ? document.activeElement : null)
  }

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [open, onClose])

  // Focus goes inside when the window opens — a field that asked for it keeps
  // it, otherwise the panel itself, not the close button — and back to what
  // opened it when the window closes or is unmounted while open.
  useEffect(() => {
    if (!open) return
    const panel = ref.current
    if (panel && !panel.contains(document.activeElement)) panel.focus()
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus()
    }
  }, [open, opener])

  // Tab and Shift+Tab go round inside the panel. The page behind stays
  // reachable to assistive technology: no aria-hidden or inert on it.
  function keepTabInside(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Tab') return
    const panel = event.currentTarget
    const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
    const first = items[0]
    const last = items[items.length - 1]
    if (!first || !last) {
      event.preventDefault()
      return
    }
    const active = document.activeElement
    if (event.shiftKey && (active === first || active === panel)) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus()
    }
  }

  // Portal to <body>: the overlay is position:fixed, and rendering it inline
  // would inject a <div> wherever the caller sits — invalid DOM nesting when a
  // caller is inside a <table> (e.g. a row action). The portal keeps modals
  // valid regardless of where they are invoked.
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
            onClick={onClose}
          />
          {/* Panel */}
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            onKeyDown={keepTabInside}
            className={`relative bg-white rounded-2xl shadow-card-lg z-10 flex flex-col focus:outline-none ${wide ? 'w-[80vw] max-h-[85vh]' : 'w-full max-w-md'}`}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Sticky header */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-canvas-dark/30 shrink-0">
              <h2 id={titleId} className="font-display text-xl text-ink">
                {title}
              </h2>
              <button
                type="button"
                aria-label="Закрити вікно"
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-canvas-dark transition-colors"
              >
                <X size={18} className="text-ink-muted" />
              </button>
            </div>
            {/* Scrollable content */}
            <div className={wide ? 'overflow-y-auto p-6' : 'p-6'}>
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
