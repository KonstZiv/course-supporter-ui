import { useEffect, useRef, useState } from 'react'
import { clsx } from 'clsx'
import {
  useCheckoutWatch,
  type CheckoutSource,
} from '../../hooks/useCheckoutWatch'
import { formatUnits } from '../../utils/units'

export interface PaymentResultProps {
  checkoutRef: string
  /** Where the checkout's state is asked: the author's client or the portal's. */
  source: CheckoutSource
  /**
   * The checkout is credited: load the balance and the statement again.
   * Resolves to the units available now, or null when the balance did not load.
   */
  onCredited: () => Promise<number | null>
  /** Close the notice and drop the checkout from the address. */
  onDismiss: () => void
  /**
   * Once the page no longer asks (ten minutes): what to do if the units do not
   * come — the line and the way to write, each app its own.
   */
  stoppedNote: React.ReactNode
  /** Beside "Зрозуміло" once the units are credited (the portal's way back). */
  creditedAction?: React.ReactNode
}

/**
 * The result of a payment, over the balance, when the holder comes back from
 * the payment page with the checkout's number in the address. Shared by the
 * author's notice (`CheckoutNotice`) and the student's (portal).
 */
export function PaymentResult({
  checkoutRef,
  source,
  onCredited,
  onDismiss,
  stoppedNote,
  creditedAction,
}: PaymentResultProps) {
  const { watch, retry } = useCheckoutWatch(checkoutRef, source)
  const [available, setAvailable] = useState<number | null>(null)

  // Callbacks of the page, read when the answer comes rather than tracked.
  const page = useRef({ onCredited, onDismiss })
  page.current = { onCredited, onDismiss }

  const credited = watch.status === 'credited' ? watch : null
  useEffect(() => {
    if (!credited) return
    let cancelled = false
    void page.current.onCredited().then((now) => {
      if (!cancelled) setAvailable(now ?? credited.balanceAfter ?? 0)
    })
    return () => {
      cancelled = true
    }
  }, [credited])

  useEffect(() => {
    if (watch.status === 'unknown') page.current.onDismiss()
  }, [watch.status])

  if (watch.status === 'checking' || watch.status === 'unknown') return null

  const done = credited !== null && available !== null
  const tone = done
    ? 'bg-forest-pale'
    : watch.status === 'failed'
      ? 'bg-coral-pale'
      : 'bg-canvas-dark'
  const stage = watch.status === 'pending' ? watch.stage : 'first-minute'

  return (
    <div role="status" className={clsx('rounded-2xl p-5 space-y-3 text-ink', tone)}>
      {done ? (
        <p className="font-semibold">
          Зараховано {formatUnits(credited.units)}. Тепер доступно{' '}
          {formatUnits(available)}.
        </p>
      ) : watch.status === 'failed' ? (
        <p className="font-semibold">
          Оплата не пройшла — юніти не зараховано. Можна обрати пакет ще раз.
        </p>
      ) : (
        <>
          <p className="font-semibold">Зараховуємо…</p>
          {stage === 'waiting' && (
            <p>
              Оплата ще не надійшла. Якщо ви сплатили, юніти з'являться за
              кілька хвилин — сторінка перевіряє сама, її можна закрити.
            </p>
          )}
          {/* The page no longer asks: the line no longer says it does. */}
          {stage === 'stopped' && (
            <>
              <p>Оплата ще не надійшла.</p>
              {stoppedNote}
            </>
          )}
        </>
      )}
      <div className="flex flex-wrap gap-2">
        {stage === 'stopped' && !credited && (
          <button type="button" className="btn-secondary btn-sm" onClick={retry}>
            Перевірити ще раз
          </button>
        )}
        {done && creditedAction}
        <button type="button" className="btn-secondary btn-sm" onClick={onDismiss}>
          Зрозуміло
        </button>
      </div>
    </div>
  )
}
