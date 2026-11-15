import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import {
  getBalance,
  getPackages,
  getStatement,
} from '../api/billing'
import type {
  BillingBalanceResponse,
  BillingPackagesResponse,
  BillingStatementItem,
} from '../types/api'
import { BalanceCard } from '../components/billing/BalanceCard'
import { CheckoutNotice } from '../components/billing/CheckoutNotice'
import { PackagesSection } from '../components/billing/PackagesSection'
import { StatementSection } from '../components/billing/StatementSection'
import { ContactAdmin } from '../components/ui/ContactAdmin'
import { LOAD_FAILED } from '../utils/billingWords'

// The address parameter that carries the checkout the author came back from
// (App's `billing/checkouts/:checkoutRef` route moves its number here).
const CHECKOUT_PARAM = 'checkout'

// Values of the parameter in the address's old form: nothing to ask about.
const OLD_FORM = ['success', 'cancelled']

interface Statement {
  items: BillingStatementItem[]
  nextCursor: string | null
}

function Loading() {
  return (
    <div className="flex justify-center py-6" aria-hidden>
      <Loader2 size={20} className="animate-spin text-ink-light" />
    </div>
  )
}

/**
 * "Юніти": where the author's units stand, the packages on sale and the
 * purchase, the result of a payment the author came back from, and the
 * movements of units.
 */
export function BillingPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const checkout = params.get(CHECKOUT_PARAM)
  const checkoutRef = checkout && !OLD_FORM.includes(checkout) ? checkout : null

  const [balance, setBalance] = useState<BillingBalanceResponse | null>(null)
  const [packages, setPackages] = useState<BillingPackagesResponse | null>(null)
  const [statement, setStatement] = useState<Statement | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [moreFailed, setMoreFailed] = useState(false)

  const loadBalance = useCallback(async (): Promise<number | null> => {
    try {
      const found = await getBalance()
      setBalance(found)
      return found.available
    } catch {
      setLoadFailed(true)
      return null
    }
  }, [])

  const loadPackages = useCallback(async () => {
    try {
      setPackages(await getPackages())
    } catch {
      setLoadFailed(true)
    }
  }, [])

  const loadStatement = useCallback(async () => {
    try {
      const page = await getStatement()
      setStatement({ items: page.items, nextCursor: page.next_cursor })
      setMoreFailed(false)
    } catch {
      setLoadFailed(true)
    }
  }, [])

  useEffect(() => {
    void loadBalance()
    void loadPackages()
    void loadStatement()
  }, [loadBalance, loadPackages, loadStatement])

  const loadMore = async () => {
    if (!statement?.nextCursor || loadingMore) return
    setLoadingMore(true)
    setMoreFailed(false)
    try {
      const page = await getStatement(statement.nextCursor)
      setStatement({
        items: [...statement.items, ...page.items],
        nextCursor: page.next_cursor,
      })
    } catch {
      setMoreFailed(true)
    } finally {
      setLoadingMore(false)
    }
  }

  // The checkout leaves the address once its result is seen (or there is none
  // to see); the history entry is replaced, so Back does not bring it again.
  const dropCheckout = useCallback(() => {
    const rest = new URLSearchParams(params)
    rest.delete(CHECKOUT_PARAM)
    const search = rest.toString()
    navigate({ search: search ? `?${search}` : '' }, { replace: true })
  }, [params, navigate])

  useEffect(() => {
    if (checkout !== null && OLD_FORM.includes(checkout)) dropCheckout()
  }, [checkout, dropCheckout])

  const afterCredit = useCallback(async () => {
    const [available] = await Promise.all([loadBalance(), loadStatement()])
    return available
  }, [loadBalance, loadStatement])

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8 space-y-8">
      <div>
        <h1 className="page-title">Юніти</h1>
        <p className="page-subtitle">
          Юніти оплачують обробку матеріалів ваших курсів. Юніт — не гроші й не
          платіжний засіб, а обсяг послуги платформи.
        </p>
      </div>

      {checkoutRef && (
        <CheckoutNotice
          key={checkoutRef}
          checkoutRef={checkoutRef}
          onCredited={afterCredit}
          onDismiss={dropCheckout}
        />
      )}

      {loadFailed && (
        <div className="rounded-2xl bg-canvas-dark p-5 space-y-2">
          <p role="alert" className="text-ink">
            {LOAD_FAILED}
          </p>
          <ContactAdmin message={LOAD_FAILED} fallback="after-click" />
        </div>
      )}

      {balance ? <BalanceCard balance={balance} /> : !loadFailed && <Loading />}

      {packages ? (
        <PackagesSection packages={packages} onStale={() => void loadPackages()} />
      ) : (
        !loadFailed && <Loading />
      )}

      {statement ? (
        <StatementSection
          items={statement.items}
          hasMore={statement.nextCursor !== null}
          loadingMore={loadingMore}
          moreFailed={moreFailed}
          onMore={() => void loadMore()}
        />
      ) : (
        !loadFailed && <Loading />
      )}
    </div>
  )
}
