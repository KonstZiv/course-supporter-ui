import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AlertCircle, Loader2 } from 'lucide-react'
import { useAuthStore } from '../stores/auth'
import { returnPath } from '../utils/returnPath'
import { ContactAdmin } from '../components/ui/ContactAdmin'
import { SiteHeader } from '../components/site/SiteHeader'
import { SiteFooter } from '../components/site/SiteFooter'
import {
  BECOME_AUTHOR_URL,
  DOCS_AUTHORS_URL,
  SITE_PRICING_URL,
  SITE_TEXT_LINK_CLASS,
} from '../components/site/siteLinks'

const HEADER_LINKS = [
  { label: 'Ціни', href: SITE_PRICING_URL },
  { label: 'Документація', href: DOCS_AUTHORS_URL },
]

const LOGIN_ERRORS = {
  rejected:
    'Цей ключ доступу не підходить. Перевірте, чи скопійовано його повністю, або напишіть адміністраторові платформи.',
  server:
    'Платформа зараз не відповідає. Спробуйте за кілька хвилин; якщо повториться, напишіть адміністраторові платформи.',
  offline:
    "Не вдалося з'єднатися з платформою. Перевірте з'єднання з інтернетом і спробуйте ще раз.",
} as const

/**
 * The author program's sign-in page. Strangers see it too, so it is neutral and
 * in the public site's look: what the program is, how to become an author and
 * whom to write. After sign-in the author goes back to the address they were
 * opening (`from`, set by ProtectedRoute).
 */
export function LoginPage() {
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const setApiKey = useAuthStore((s) => s.setApiKey)
  const setConnected = useAuthStore((s) => s.setConnected)
  const navigate = useNavigate()
  const location = useLocation()
  const from: unknown = (location.state as { from?: unknown } | null)?.from

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = key.trim()
    if (!trimmed) return

    setLoading(true)
    setError('')

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || ''
      const res = await fetch(`${baseUrl}/api/v1/nodes?limit=1`, {
        headers: { 'X-API-Key': trimmed },
      })

      if (res.ok) {
        setApiKey(trimmed)
        setConnected(true)
        navigate(returnPath(from), { replace: true })
      } else if (res.status === 401 || res.status === 403) {
        setError(LOGIN_ERRORS.rejected)
      } else {
        setError(LOGIN_ERRORS.server)
      }
    } catch {
      setError(LOGIN_ERRORS.offline)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <SiteHeader links={HEADER_LINKS} />

      <main className="flex-1 w-full max-w-[28rem] mx-auto px-4 py-10 sm:py-16">
        <h1 className="font-display text-3xl text-ink">Вхід для авторів курсів</h1>
        <p className="text-ink-light mt-4">
          Програма автора — місце, де автор готує свій курс на платформі Course
          Supporter: завантажує матеріали, налаштовує завдання й тести, додає
          студентів.
        </p>
        <p className="text-ink-light mt-3">
          Щоб увійти, введіть ключ доступу, який вам надіслав адміністратор
          платформи.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="accessKey" className="block font-semibold text-ink mb-1.5">
              Ключ доступу
            </label>
            <input
              id="accessKey"
              type="password"
              className="input font-mono text-sm"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              autoComplete="off"
              autoFocus
            />
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 p-3 rounded-xl bg-coral-pale text-ink text-sm"
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-coral" aria-hidden />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !key.trim()}
            aria-busy={loading}
            className="btn-primary w-full btn-lg"
          >
            {loading && <Loader2 size={18} className="animate-spin" aria-hidden />}
            Увійти
          </button>

          <p className="text-ink-light text-sm">
            Ключ зберігається лише в цьому браузері; кнопка «Вийти» в програмі його
            прибирає.
          </p>
        </form>

        <section className="mt-10 space-y-2">
          <h2 className="font-display text-xl text-ink">Ще не автор?</h2>
          <p className="text-ink-light">
            Доступ до програми автора платформа відкриває за зверненням.
          </p>
          <p>
            <a href={BECOME_AUTHOR_URL} className={SITE_TEXT_LINK_CLASS}>
              Як стати автором
            </a>
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="font-display text-xl text-ink">
            Немає ключа або він не підходить?
          </h2>
          <ContactAdmin fallback="always" />
        </section>

        <p className="mt-10 text-ink-light text-sm">
          Студентам: ваш курс відкривається за посиланням від автора курсу — вхід
          там.
        </p>
      </main>

      <SiteFooter />
    </div>
  )
}
