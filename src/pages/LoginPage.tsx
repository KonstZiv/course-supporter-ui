import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AlertCircle, Loader2 } from 'lucide-react'
import { useAuthStore } from '../stores/auth'
import { returnPath } from '../utils/returnPath'
import { ContactAdmin } from '../components/ui/ContactAdmin'
import { SiteHeader } from '../components/site/SiteHeader'
import { SiteFooter } from '../components/site/SiteFooter'
import {
  docsUrl,
  siteUrl,
  SITE_TEXT_LINK_CLASS,
} from '../components/site/siteLinks'
import { useLanguage, useT } from '../i18n/LanguageContext'
import { isServiceUpdatingBody } from '../serviceStatus/store'

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
  const language = useLanguage()
  const t = useT()

  const headerLinks = [
    { label: t('panel.login.header.pricing'), href: siteUrl(language, 'pricing') },
    { label: t('panel.login.header.docs'), href: docsUrl(language, 'authors/') },
  ]

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
        setError(t('panel.login.error.rejected'))
      } else if (
        res.status === 503 &&
        isServiceUpdatingBody(await res.json?.().catch(() => null))
      ) {
        setError(t('panel.login.error.updating'))
      } else {
        setError(t('panel.login.error.server'))
      }
    } catch {
      setError(t('panel.login.error.offline'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <SiteHeader links={headerLinks} />

      <main className="flex-1 w-full max-w-[28rem] mx-auto px-4 py-10 sm:py-16">
        <h1 className="font-display text-3xl text-ink">{t('panel.login.title')}</h1>
        <p className="text-ink-light mt-4">
          {t('panel.login.description')}
        </p>
        <p className="text-ink-light mt-3">
          {t('panel.login.enterKeyPrompt')}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="accessKey" className="block font-semibold text-ink mb-1.5">
              {t('panel.login.keyLabel')}
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
            {t('panel.login.submit')}
          </button>

          <p className="text-ink-light text-sm">
            {t('panel.login.browserOnlyNote')}
          </p>
        </form>

        <section className="mt-10 space-y-2">
          <h2 className="font-display text-xl text-ink">{t('panel.login.notAuthorTitle')}</h2>
          <p className="text-ink-light">
            {t('panel.login.notAuthorDescription')}
          </p>
          <p>
            <a href={siteUrl(language, 'become-author')} className={SITE_TEXT_LINK_CLASS}>
              {t('panel.login.howToBecomeAuthor')}
            </a>
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="font-display text-xl text-ink">
            {t('panel.login.noKeyTitle')}
          </h2>
          <ContactAdmin fallback="always" />
        </section>

        <p className="mt-10 text-ink-light text-sm">
          {t('panel.login.studentsNotice')}
        </p>
      </main>

      <SiteFooter />
    </div>
  )
}
