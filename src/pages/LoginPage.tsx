import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'
import { motion } from 'framer-motion'
import { BookOpen, ArrowRight, AlertCircle, Loader2 } from 'lucide-react'

export function LoginPage() {
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const setApiKey = useAuthStore((s) => s.setApiKey)
  const setConnected = useAuthStore((s) => s.setConnected)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!key.trim()) return

    setLoading(true)
    setError('')

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || ''
      const res = await fetch(`${baseUrl}/api/v1/nodes?limit=1`, {
        headers: { 'X-API-Key': key.trim() },
      })

      if (res.ok) {
        setApiKey(key.trim())
        setConnected(true)
        navigate('/')
      } else if (res.status === 401 || res.status === 403) {
        setError('Невірний API ключ. Перевірте та спробуйте ще раз.')
      } else {
        setError(`Помилка з\'єднання: ${res.status}`)
      }
    } catch {
      setError('Не вдалося з\'єднатися з сервером. Перевірте URL API.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-canvas flex">
      {/* Left — decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-navy via-navy-dark to-navy
                      items-center justify-center relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-[0.06]"
             style={{
               backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
               backgroundSize: '32px 32px',
             }}
        />
        {/* Content */}
        <motion.div
          className="relative z-10 max-w-md px-12"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-8">
            <BookOpen size={32} className="text-amber-light" />
          </div>
          <h1 className="font-display text-4xl text-white leading-tight mb-4">
            Course Supporter
          </h1>
          <p className="text-white/60 text-lg leading-relaxed">
            Інтелектуальна система структурування навчальних курсів
            на основі аналізу матеріалів.
          </p>
          <div className="mt-12 space-y-4">
            {[
              'Автоматична обробка відео, презентацій, текстів',
              'AI-генерація структури курсу',
              'Візуальне управління деревом матеріалів',
            ].map((text, i) => (
              <motion.div
                key={text}
                className="flex items-center gap-3 text-white/50"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.5 + i * 0.15 }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-amber-light shrink-0" />
                <span className="text-sm">{text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right — login form */}
      <div className="flex-1 flex items-center justify-center px-6">
        <motion.div
          className="w-full max-w-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-navy flex items-center justify-center">
              <BookOpen size={20} className="text-amber-light" />
            </div>
            <span className="font-display text-2xl text-ink">Course Supporter</span>
          </div>

          <h2 className="font-display text-2xl text-ink mb-2">Вхід</h2>
          <p className="text-ink-muted mb-8">
            Введіть API ключ для підключення до системи
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-ink mb-1.5">
                API ключ
              </label>
              <input
                id="apiKey"
                type="password"
                className="input font-mono text-sm"
                placeholder="cs_live_..."
                value={key}
                onChange={(e) => setKey(e.target.value)}
                autoFocus
              />
            </div>

            {error && (
              <motion.div
                className="flex items-start gap-2 p-3 rounded-xl bg-coral-pale text-coral text-sm"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading || !key.trim()}
              className="btn-primary w-full btn-lg"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  Підключитися
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <p className="text-ink-muted text-xs mt-6 text-center">
            Ключ зберігається локально у вашому браузері
          </p>
        </motion.div>
      </div>
    </div>
  )
}
