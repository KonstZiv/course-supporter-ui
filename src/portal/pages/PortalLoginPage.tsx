import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { BookOpen, ArrowRight, AlertCircle, Loader2 } from 'lucide-react'
import { usePortalSession } from '../stores/session'
import { portalLogin, PortalApiError } from '../api/portalClient'
import { isUuid } from '../uuid'
import { InvalidPortalLink } from '../components/InvalidPortalLink'

// Student portal login (Phase 6 / T4b, c1). The tenant comes from the URL
// segment (ratify Q3) and is sent as ``tenant_id`` in the unauthenticated
// login request — the student has no key, the tenant is resolved before the
// student is known. Mirrors the author LoginPage's raw-fetch approach (the
// bearer client cannot be used pre-token).
export function PortalLoginPage() {
  const { tenantId } = useParams()
  const token = usePortalSession((s) => s.token)
  const sessionTenant = usePortalSession((s) => s.tenantId)
  const setSession = usePortalSession((s) => s.setSession)
  const navigate = useNavigate()

  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isUuid(tenantId)) {
    return <InvalidPortalLink />
  }

  // Already signed in for this tenant → straight to the portal.
  if (token && sessionTenant === tenantId) {
    return <Navigate to={`/${tenantId}/home`} replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!login.trim() || !password) return

    setLoading(true)
    setError('')
    try {
      const res = await portalLogin({
        tenant_id: tenantId,
        login: login.trim(),
        password,
      })
      setSession({
        token: res.access_token,
        tenantId,
        studentId: res.student_id,
        displayName: res.display_name,
      })
      navigate(`/${tenantId}/home`, { replace: true })
    } catch (err) {
      if (err instanceof PortalApiError && err.status === 401) {
        setError('Невірний логін або пароль.')
      } else if (err instanceof PortalApiError && err.status === 429) {
        setError('Забагато спроб входу. Спробуйте трохи згодом.')
      } else {
        setError('Не вдалося зʼєднатися із сервером.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-navy flex items-center justify-center">
            <BookOpen size={20} className="text-amber-light" />
          </div>
          <span className="font-display text-2xl text-ink">Навчальний портал</span>
        </div>

        <h2 className="font-display text-2xl text-ink mb-2">Вхід</h2>
        <p className="text-ink-muted mb-8">
          Введіть логін і пароль, які надав ваш викладач.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="portal-login" className="block text-sm font-medium text-ink mb-1.5">
              Логін
            </label>
            <input
              id="portal-login"
              type="text"
              className="input"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="portal-password" className="block text-sm font-medium text-ink mb-1.5">
              Пароль
            </label>
            <input
              id="portal-password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-coral-pale text-coral text-sm">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !login.trim() || !password}
            className="btn-primary w-full btn-lg"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                Увійти
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
