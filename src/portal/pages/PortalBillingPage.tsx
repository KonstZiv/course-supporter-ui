import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { portalApi, PortalApiError } from '../api/portalClient'
import type {
  PortalBillingBalance,
  PortalBillingPackages,
  PortalBillingStatementItem,
} from '../types'
import { BalanceCard } from '../../components/billing/BalanceCard'
import { StatementList } from '../../components/billing/StatementList'
import { PortalHeader } from '../components/PortalHeader'
import { PortalFailure } from '../components/SupportMailText'
import { PortalCheckoutNotice } from '../components/billing/PortalCheckoutNotice'
import { PortalPackagesSection } from '../components/billing/PortalPackagesSection'
import { LOAD_FAILED, UNITS_SUBTITLE } from '../billingTexts'
import { useStudentOutlook } from '../hooks/useStudentOutlook'
import { UnitsReminders } from '../components/billing/UnitsReminders'
import { SITE_TEXT_LINK_CLASS } from '../../components/site/siteLinks'
import { BUY_UNITS, reviewsLeftLine } from '../unitsTexts'
import type { PortalBillingOutlook } from '../types'

// The address parameter that carries the checkout the student came back from
// (App's `billing/checkouts/:checkoutRef` route moves its number here).
const CHECKOUT_PARAM = 'checkout'

// Values of the parameter with nothing to ask about: the provider's cancel
// address (`?checkout=cancelled`), and the old form's success.
const NOTHING_TO_ASK = ['success', 'cancelled']

interface Statement {
  items: PortalBillingStatementItem[]
  nextCursor: string | null
}

// A 401 is handled inside the client (clear + sign-in); anything else is a
// failure this page says.
function isSessionEnd(err: unknown): boolean {
  return err instanceof PortalApiError && err.status === 401
}

// Where "Купити юніти" of a reminder takes the student on this page.
const PACKAGES_ID = 'units-packages'

function scrollToPackages() {
  const packages = document.getElementById(PACKAGES_ID)
  packages?.scrollIntoView?.({ block: 'start' })
  packages?.focus({ preventScroll: true })
}

/**
 * Under "Доступно": how many reviews the units cover, and the reminders —
 * only for a student who pays for their reviews.
 */
function OutlookLines({ outlook }: { outlook: PortalBillingOutlook | null }) {
  if (outlook?.paid_by !== 'self') return null
  return (
    <UnitsReminders
      outlook={outlook}
      lead={outlook.reviews_left === null ? null : reviewsLeftLine(outlook.reviews_left)}
      buy={
        <button type="button" className={SITE_TEXT_LINK_CLASS} onClick={scrollToPackages}>
          {BUY_UNITS}
        </button>
      }
    />
  )
}

function Loading() {
  return (
    <div className="flex justify-center py-6" aria-hidden>
      <Loader2 size={20} className="animate-spin text-ink-light" />
    </div>
  )
}

/**
 * The student's "Юніти": where their units stand, the packages on sale and
 * the purchase, the result of a payment they came back from, and the
 * movements of units. As the author's page, with the student's words.
 */
export function PortalBillingPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const checkout = params.get(CHECKOUT_PARAM)
  const checkoutRef =
    checkout && !NOTHING_TO_ASK.includes(checkout) ? checkout : null

  const [balance, setBalance] = useState<PortalBillingBalance | null>(null)
  const [packages, setPackages] = useState<PortalBillingPackages | null>(null)
  const [statement, setStatement] = useState<Statement | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [moreFailed, setMoreFailed] = useState(false)
  const { outlook, reload: reloadOutlook } = useStudentOutlook()

  const failed = useCallback((err: unknown) => {
    if (!isSessionEnd(err)) setLoadFailed(true)
  }, [])

  const loadBalance = useCallback(async (): Promise<number | null> => {
    try {
      const found = await portalApi.billingBalance()
      setBalance(found)
      return found.available
    } catch (err) {
      failed(err)
      return null
    }
  }, [failed])

  const loadPackages = useCallback(async () => {
    try {
      setPackages(await portalApi.billingPackages())
    } catch (err) {
      failed(err)
    }
  }, [failed])

  const loadStatement = useCallback(async () => {
    try {
      const page = await portalApi.billingStatement()
      setStatement({ items: page.items, nextCursor: page.next_cursor })
      setMoreFailed(false)
    } catch (err) {
      failed(err)
    }
  }, [failed])

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
      const page = await portalApi.billingStatement(statement.nextCursor)
      setStatement({
        items: [...statement.items, ...page.items],
        nextCursor: page.next_cursor,
      })
    } catch (err) {
      if (!isSessionEnd(err)) setMoreFailed(true)
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
    if (checkout !== null && NOTHING_TO_ASK.includes(checkout)) dropCheckout()
  }, [checkout, dropCheckout])

  const afterCredit = useCallback(async () => {
    const [available] = await Promise.all([
      loadBalance(),
      loadStatement(),
      reloadOutlook(),
    ])
    return available
  }, [loadBalance, loadStatement, reloadOutlook])

  return (
    <div className="min-h-screen bg-canvas">
      <PortalHeader current="units" />

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        <div>
          <h1 className="page-title">Юніти</h1>
          <p className="page-subtitle">{UNITS_SUBTITLE}</p>
        </div>

        {checkoutRef && (
          <PortalCheckoutNotice
            key={checkoutRef}
            checkoutRef={checkoutRef}
            onCredited={afterCredit}
            onDismiss={dropCheckout}
          />
        )}

        {loadFailed && (
          <div className="rounded-2xl bg-canvas-dark p-5 space-y-2">
            <PortalFailure text={LOAD_FAILED} />
          </div>
        )}

        {balance ? (
          <BalanceCard
            balance={balance}
            withDifference={false}
            reminders={<OutlookLines outlook={outlook} />}
          />
        ) : (
          !loadFailed && <Loading />
        )}

        <div id={PACKAGES_ID} tabIndex={-1} className="scroll-mt-6 focus:outline-none">
          {packages ? (
            <PortalPackagesSection
              packages={packages}
              onStale={() => void loadPackages()}
            />
          ) : (
            !loadFailed && <Loading />
          )}
        </div>

        {statement ? (
          <StatementList
            items={statement.items}
            hasMore={statement.nextCursor !== null}
            loadingMore={loadingMore}
            moreFailed={moreFailed}
            onMore={() => void loadMore()}
            moreFailedNote={<PortalFailure text={LOAD_FAILED} />}
          />
        ) : (
          !loadFailed && <Loading />
        )}
      </main>
    </div>
  )
}
