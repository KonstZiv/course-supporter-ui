import { useId } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { CONSENT_LINES, type ConsentLines } from '../../utils/billingConsent'
import { useLanguage, useT } from '../../i18n/LanguageContext'
import { siteUrl } from '../site/siteLinks'
import { NewTabLink } from './NewTabLink'

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

interface ConsentDialogProps {
  open: boolean
  /** The consent text shown — and fingerprinted; the author's by default. */
  lines?: ConsentLines
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  /** The terms changed since the window opened: say so. */
  termsUpdated: boolean
  submitting: boolean
  error: string | null
  /** The error's sentence and the way to write about it, each app its own. */
  renderFailure: (text: string) => React.ReactNode
  onConfirm: () => void
  onCancel: () => void
}

/** The one-time consent to the billing terms before a purchase. */
export function ConsentDialog({
  open,
  lines = CONSENT_LINES,
  checked,
  onCheckedChange,
  termsUpdated,
  submitting,
  error,
  renderFailure,
  onConfirm,
  onCancel,
}: ConsentDialogProps) {
  const checkboxId = useId()
  const language = useLanguage()
  const t = useT()
  const [title, checkboxLine, summaryLine, changeLine] = lines
  // The checkbox line with its two phrases as links: the words stay exactly
  // the consent text's, so what the holder reads is what is fingerprinted.
  const links: Record<string, string> = {
    [t('shared.consent.termsLinkWords')]: siteUrl(language, 'terms'),
    [t('shared.consent.refundsLinkWords')]: siteUrl(language, 'refunds'),
  }
  const linkPhrases = new RegExp(`(${Object.keys(links).map(escapeRegExp).join('|')})`)
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <div className="space-y-4 text-ink">
        {termsUpdated && (
          <p role="status" className="rounded-xl bg-navy-pale p-3 text-ink">
            {t('shared.consent.termsUpdated')}
          </p>
        )}
        <div className="flex items-start gap-3">
          <input
            id={checkboxId}
            type="checkbox"
            className="mt-1.5 h-4 w-4 shrink-0 accent-navy"
            checked={checked}
            onChange={(e) => onCheckedChange(e.target.checked)}
          />
          <label htmlFor={checkboxId}>
            {checkboxLine.split(linkPhrases).map((part, i) =>
              links[part] ? (
                <NewTabLink key={i} href={links[part]}>
                  {part}
                </NewTabLink>
              ) : (
                part
              ),
            )}
          </label>
        </div>
        <p className="text-ink-light">{summaryLine}</p>
        <p className="text-ink-light">{changeLine}</p>
        {error && <div className="space-y-2">{renderFailure(error)}</div>}
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            {t('shared.consent.cancel')}
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={!checked || submitting}
            onClick={onConfirm}
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {t('shared.consent.confirm')}
          </button>
        </div>
      </div>
    </Modal>
  )
}
