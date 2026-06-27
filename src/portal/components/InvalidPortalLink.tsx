import { BookOpen } from 'lucide-react'

// Shown when the URL tenant segment is missing or not a UUID (ratify Q3).
// No tenant context → nothing to fetch and nowhere to log in; we only explain.
export function InvalidPortalLink() {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-6">
      <div className="card max-w-md w-full p-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-navy/10 flex items-center justify-center mx-auto mb-5">
          <BookOpen size={24} className="text-navy" />
        </div>
        <h1 className="font-display text-2xl text-ink mb-2">
          Невірне посилання
        </h1>
        <p className="text-ink-muted">
          Це посилання на портал недійсне. Скористайтеся посиланням, яке надав
          ваш викладач.
        </p>
      </div>
    </div>
  )
}
