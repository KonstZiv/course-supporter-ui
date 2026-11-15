import { useId } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { ContactAdmin } from '../ui/ContactAdmin'
import {
  CONSENT_LINES,
  REFUNDS_LINK_WORDS,
  TERMS_LINK_WORDS,
} from '../../utils/billingConsent'
import { SITE_REFUNDS_URL, SITE_TERMS_URL } from '../site/siteLinks'
import { NewTabLink } from './NewTabLink'

const [TITLE, CHECKBOX_LINE, SUMMARY_LINE, CHANGE_LINE] = CONSENT_LINES

const LINKS: Record<string, string> = {
  [TERMS_LINK_WORDS]: SITE_TERMS_URL,
  [REFUNDS_LINK_WORDS]: SITE_REFUNDS_URL,
}

// The checkbox line with its two phrases as links: the words stay exactly the
// consent text's, so what the author reads is what is fingerprinted.
const CHECKBOX_PARTS = CHECKBOX_LINE.split(
  new RegExp(`(${TERMS_LINK_WORDS}|${REFUNDS_LINK_WORDS})`),
)

export const TERMS_UPDATED =
  'Умови оновилися. Перегляньте чинну редакцію й підтвердьте її, щоб продовжити.'

interface ConsentDialogProps {
  open: boolean
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  /** The terms changed since the window opened: say so. */
  termsUpdated: boolean
  submitting: boolean
  error: string | null
  onConfirm: () => void
  onCancel: () => void
}

/** The one-time consent to the billing terms before a purchase. */
export function ConsentDialog({
  open,
  checked,
  onCheckedChange,
  termsUpdated,
  submitting,
  error,
  onConfirm,
  onCancel,
}: ConsentDialogProps) {
  const checkboxId = useId()
  return (
    <Modal open={open} onClose={onCancel} title={TITLE}>
      <div className="space-y-4 text-ink">
        {termsUpdated && (
          <p role="status" className="rounded-xl bg-navy-pale p-3 text-ink">
            {TERMS_UPDATED}
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
            {CHECKBOX_PARTS.map((part, i) =>
              LINKS[part] ? (
                <NewTabLink key={i} href={LINKS[part]}>
                  {part}
                </NewTabLink>
              ) : (
                part
              ),
            )}
          </label>
        </div>
        <p className="text-ink-light">{SUMMARY_LINE}</p>
        <p className="text-ink-light">{CHANGE_LINE}</p>
        {error && (
          <div className="space-y-2">
            <p role="alert" className="text-ink">
              {error}
            </p>
            <ContactAdmin message={error} fallback="after-click" />
          </div>
        )}
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Скасувати
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={!checked || submitting}
            onClick={onConfirm}
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            Підтвердити й перейти до оплати
          </button>
        </div>
      </div>
    </Modal>
  )
}
