import { useMemo, useRef, useState } from 'react'
import { Copy, Mail } from 'lucide-react'
import {
  asksToWriteToAdmin,
  type LetterContext,
  supportLetter,
} from '../../utils/contactAdmin'
import { useLanguage, useT } from '../../i18n/LanguageContext'

interface ContactAdminProps {
  message?: string | null
  context?: LetterContext
  fallback: 'always' | 'after-click'
  compact?: boolean
}

export function ContactAdmin({
  message,
  context,
  fallback,
  compact = false,
}: ContactAdminProps) {
  const language = useLanguage()
  const t = useT()

  const [showFallback, setShowFallback] = useState(fallback === 'always')
  const [copyAddressState, setCopyAddressState] = useState<'idle' | 'copied'>(
    'idle',
  )
  const [copyBodyState, setCopyBodyState] = useState<'idle' | 'copied'>('idle')
  const [copyFailed, setCopyFailed] = useState(false)

  const addressTimeoutRef = useRef<number | null>(null)
  const bodyTimeoutRef = useRef<number | null>(null)

  const [page] = useState(() =>
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : '',
  )
  const [now] = useState(() => new Date())

  const letter = useMemo(
    () => supportLetter(language, { message, context, page, now }),
    [language, message, context, page, now],
  )

  if (message !== undefined && !asksToWriteToAdmin(language, message)) {
    return null
  }

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(letter.address)
      setCopyAddressState('copied')
      if (addressTimeoutRef.current !== null) {
        window.clearTimeout(addressTimeoutRef.current)
      }
      addressTimeoutRef.current = window.setTimeout(
        () => setCopyAddressState('idle'),
        2000,
      )
    } catch {
      setCopyFailed(true)
    }
  }

  const copyBody = async () => {
    try {
      await navigator.clipboard.writeText(letter.body)
      setCopyBodyState('copied')
      if (bodyTimeoutRef.current !== null) {
        window.clearTimeout(bodyTimeoutRef.current)
      }
      bodyTimeoutRef.current = window.setTimeout(
        () => setCopyBodyState('idle'),
        2000,
      )
    } catch {
      setCopyFailed(true)
    }
  }

  return (
    <div className={compact ? 'mt-1' : 'space-y-2'}>
      <a
        href={letter.href}
        onClick={() => {
          if (fallback === 'after-click') {
            setShowFallback(true)
          }
        }}
        className={
          compact
            ? 'inline-flex items-center gap-1 text-xs font-medium text-navy underline underline-offset-2 hover:text-navy-light'
            : 'btn-secondary btn-sm inline-flex items-center gap-1.5'
        }
      >
        <Mail size={compact ? 12 : 14} />
        {t('panel.contactAdmin.button')}
      </a>

      {showFallback && (
        <div className="text-xs text-ink-light space-y-2 pt-1">
          <div>
            {t('panel.contactAdmin.notOpenedNote')}{' '}
            <span className="select-all font-mono font-medium text-ink">
              {letter.address}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => void copyAddress()}
            >
              <Copy size={14} />
              {copyAddressState === 'copied'
                ? t('panel.contactAdmin.copied')
                : t('panel.contactAdmin.copyAddress')}
            </button>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => void copyBody()}
            >
              <Copy size={14} />
              {copyBodyState === 'copied'
                ? t('panel.contactAdmin.copied')
                : t('panel.contactAdmin.copyBody')}
            </button>
          </div>
          {copyFailed && (
            <div className="space-y-1 pt-1">
              <p className="text-xs text-ink-light">
                {t('panel.contactAdmin.copyFailed')}
              </p>
              <label
                htmlFor="contact-admin-body-textarea"
                className="block text-xs font-medium text-ink-light"
              >
                {t('panel.contactAdmin.bodyTitle')}
              </label>
              <textarea
                id="contact-admin-body-textarea"
                readOnly
                value={letter.body}
                aria-label={t('panel.contactAdmin.bodyTitle')}
                rows={5}
                className="w-full text-xs font-mono p-2 border border-canvas-dark rounded-lg text-ink bg-canvas select-all"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
