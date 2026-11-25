import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, Copy, Link2, Loader2 } from 'lucide-react'
import { enrollmentLinkApi } from '../../api/enrollment-link'
import { Modal } from '../ui/Modal'
import { enrollmentLinkErrorMessage } from './enrollmentLinkErrors'
import { useLanguage, useT } from '../../i18n/LanguageContext'
import type { EnrollmentLink } from '../../types/api'

type Confirm = 'rotate' | 'close' | null

// O-3: the author's switch for enrolment by the course link — the button for
// the top bar of the course page (with the state it is in) and the small window
// it opens. The link lives here, not in a store: the window is its only reader.
export function EnrollmentLinkControl({ courseId }: { courseId: string }) {
  const [link, setLink] = useState<EnrollmentLink | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<Confirm>(null)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const copyTimer = useRef<number | undefined>(undefined)

  const language = useLanguage()
  const t = useT()

  // A failed first read leaves the button without a state; opening the window
  // reads again.
  const load = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      setLink(await enrollmentLinkApi.get(courseId))
    } catch (err) {
      setError(enrollmentLinkErrorMessage(language, err))
    } finally {
      setBusy(false)
    }
  }, [courseId, language])

  useEffect(() => {
    let cancelled = false
    enrollmentLinkApi.get(courseId).then(
      (fresh) => {
        if (!cancelled) setLink(fresh)
      },
      () => {},
    )
    return () => {
      cancelled = true
    }
  }, [courseId])

  useEffect(() => () => window.clearTimeout(copyTimer.current), [])

  const openWindow = () => {
    setOpen(true)
    setError(null)
    setCopyState('idle')
    if (link === null) void load()
  }

  const closeWindow = () => {
    setOpen(false)
    setConfirm(null)
  }

  const run = async (call: (id: string) => Promise<EnrollmentLink>) => {
    setConfirm(null)
    setBusy(true)
    setError(null)
    setCopyState('idle')
    try {
      setLink(await call(courseId))
    } catch (err) {
      setError(enrollmentLinkErrorMessage(language, err))
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    if (!link?.url) return
    window.clearTimeout(copyTimer.current)
    try {
      await navigator.clipboard.writeText(link.url)
      setCopyState('copied')
      copyTimer.current = window.setTimeout(() => setCopyState('idle'), 2000)
    } catch {
      // No clipboard (insecure context, older browser): the link stays in the
      // read-only field, selected for copying by hand.
      setCopyState('failed')
    }
  }

  return (
    <>
      <button
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-canvas-dark text-sm text-ink"
        onClick={openWindow}
      >
        <Link2 size={14} className="text-ink-muted" />
        {t('panel.enrollmentLink.button')}
        {link && (
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              link.open ? 'bg-forest-pale text-forest' : 'bg-canvas-dark text-ink-muted'
            }`}
          >
            {link.open
              ? t('panel.enrollmentLink.state.open')
              : t('panel.enrollmentLink.state.closed')}
          </span>
        )}
      </button>

      <Modal open={open} onClose={closeWindow} title={t('panel.enrollmentLink.title')}>
        {error && (
          <div className="flex items-start gap-2 p-3 mb-3 rounded-xl bg-coral-pale text-coral text-sm">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {link === null ? (
          busy ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-ink-muted">
              <Loader2 size={16} className="animate-spin" />
              {t('panel.enrollmentLink.loading')}
            </div>
          ) : (
            <button className="btn-secondary btn-sm" onClick={() => void load()}>
              {t('panel.enrollmentLink.retry')}
            </button>
          )
        ) : confirm ? (
          <>
            <p className="text-sm text-ink-light mb-5">
              {confirm === 'rotate'
                ? t('panel.enrollmentLink.rotateQuestion')
                : t('panel.enrollmentLink.closeQuestion')}
            </p>
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setConfirm(null)}>
                {t('panel.enrollmentLink.cancel')}
              </button>
              {confirm === 'rotate' ? (
                <button
                  className="btn-primary"
                  onClick={() => void run(enrollmentLinkApi.rotate)}
                >
                  {t('panel.enrollmentLink.rotateConfirm')}
                </button>
              ) : (
                <button
                  className="btn-danger"
                  onClick={() => void run(enrollmentLinkApi.close)}
                >
                  {t('panel.enrollmentLink.closeConfirm')}
                </button>
              )}
            </div>
          </>
        ) : link.open && link.url ? (
          <>
            <p className="text-sm text-ink-light mb-4">
              {t('panel.enrollmentLink.openDescription')}
            </p>
            <label
              htmlFor="enrollment-link-url"
              className="block text-xs font-medium uppercase text-ink-muted mb-1"
            >
              {t('panel.enrollmentLink.linkLabel')}
            </label>
            <div className="flex gap-2 mb-1">
              <input
                id="enrollment-link-url"
                className="input font-mono text-sm"
                readOnly
                value={link.url}
                onFocus={(e) => e.currentTarget.select()}
              />
              <button
                className="btn-secondary shrink-0"
                disabled={busy}
                onClick={() => void copy()}
              >
                <Copy size={16} />
                {copyState === 'copied'
                  ? t('panel.enrollmentLink.copied')
                  : t('panel.enrollmentLink.copy')}
              </button>
            </div>
            {copyState === 'failed' && (
              <p className="text-sm text-ink-light mb-1">
                {t('panel.enrollmentLink.copyFailed')}
              </p>
            )}
            <div className="flex flex-wrap justify-between gap-2 mt-5">
              <button
                className="btn-ghost btn-sm"
                disabled={busy}
                onClick={() => setConfirm('rotate')}
              >
                {t('panel.enrollmentLink.rotate')}
              </button>
              <button
                className="btn-ghost btn-sm text-coral"
                disabled={busy}
                onClick={() => setConfirm('close')}
              >
                {t('panel.enrollmentLink.close')}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-ink-light mb-5">
              {t('panel.enrollmentLink.closedDescription')}
            </p>
            <div className="flex justify-end">
              <button
                className="btn-primary"
                disabled={busy}
                onClick={() => void run(enrollmentLinkApi.open)}
              >
                {busy && <Loader2 size={16} className="animate-spin" />}
                {t('panel.enrollmentLink.openAction')}
              </button>
            </div>
          </>
        )}
      </Modal>
    </>
  )
}
