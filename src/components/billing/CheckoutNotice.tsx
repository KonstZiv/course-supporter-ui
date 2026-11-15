import { useEffect, useRef, useState } from 'react'
import { clsx } from 'clsx'
import { useCheckoutWatch } from '../../hooks/useCheckoutWatch'
import { formatUnits } from '../../utils/units'
import { ContactAdmin } from '../ui/ContactAdmin'

interface CheckoutNoticeProps {
  checkoutRef: string
  /**
   * The checkout is credited: load the balance and the statement again.
   * Resolves to the units available now, or null when the balance did not load.
   */
  onCredited: () => Promise<number | null>
  /** Close the notice and drop the checkout from the address. */
  onDismiss: () => void
}

/**
 * The result of a payment, over the balance, when the author comes back from
 * the payment page with the checkout's number in the address.
 */
export function CheckoutNotice({
  checkoutRef,
  onCredited,
  onDismiss,
}: CheckoutNoticeProps) {
  const { watch, retry } = useCheckoutWatch(checkoutRef)
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
          {stage !== 'first-minute' && (
            <p>
              Оплата ще не надійшла. Якщо ви сплатили, юніти з'являться за
              кілька хвилин — сторінка перевіряє сама, її можна закрити.
            </p>
          )}
          {stage === 'stopped' && (
            <>
              <p>
                Якщо ви сплатили, а юніти не з'являться протягом години,
                напишіть адміністраторові платформи.
              </p>
              <ContactAdmin fallback="always" />
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
        <button type="button" className="btn-secondary btn-sm" onClick={onDismiss}>
          Зрозуміло
        </button>
      </div>
    </div>
  )
}
