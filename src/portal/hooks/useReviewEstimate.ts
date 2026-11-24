import { useCallback, useEffect, useRef, useState } from 'react'
import { doorRefusal, portalApi, PortalApiError } from '../api/portalClient'
import { useLanguage } from '../../i18n/LanguageContext'
import type { Language } from '../../i18n/languages'
import { submitErrorMessage } from '../submissionCodes'
import { shortfallEstimate, type EstimateOutcome } from '../reviewCost'
import type { PortalReviewEstimate, PortalUnitsShortfall } from '../types'

function failureOf(language: Language, err: unknown): EstimateOutcome {
  if (err instanceof PortalApiError && err.status === 401) return { status: 'silent' }
  // The doors refuse the file: the words the submission would get.
  if (err instanceof PortalApiError && err.status === 422 && doorRefusal(err) !== null) {
    return { status: 'refused', message: submitErrorMessage(language, err) }
  }
  return { status: 'failed' }
}

interface EstimateState {
  outcome: EstimateOutcome
  // The last estimate answered, whatever file it was for: who pays and
  // whether charging is on do not depend on the file.
  last: PortalReviewEstimate | null
}

/**
 * The price of a review of ``taskId`` before it is sent: asked when the form
 * opens (no file) and whenever the chosen file or review language changes
 * (that file and language; no file again when it is removed). Only the answer
 * to the LAST request counts — an older one that arrives later is dropped.
 *
 * ``askAgain`` asks once more with the same file and language, once the units
 * the panel waited for have come; ``refused`` takes the server's 402 in place
 * of the estimate.
 */
export function useReviewEstimate(
  taskId: string,
  file: File | null,
  responseLanguage: string | null,
) {
  const [state, setState] = useState<EstimateState>({
    outcome: { status: 'pending' },
    last: null,
  })
  // The number of the latest request; an answer to any other is stale.
  const latest = useRef(0)
  const language = useLanguage()

  const ask = useCallback(
    (sent: File | null, sentLanguage: string | null, afterWait: boolean) => {
      const asked = ++latest.current
      setState((s) => ({ ...s, outcome: { status: 'pending' } }))
      portalApi.estimateTask(taskId, sent, sentLanguage).then(
        (estimate) => {
          if (asked !== latest.current) return
          setState({ outcome: { status: 'ready', estimate, afterWait }, last: estimate })
        },
        (err: unknown) => {
          if (asked !== latest.current) return
          setState((s) => ({ ...s, outcome: failureOf(language, err) }))
        },
      )
    },
    [taskId, language],
  )

  useEffect(() => {
    const requests = latest
    ask(file, responseLanguage, false)
    return () => {
      requests.current++ // the form closed, or the file or language changed: drop the answer
    }
  }, [ask, file, responseLanguage])

  const askAgain = useCallback(
    () => ask(file, responseLanguage, true),
    [ask, file, responseLanguage],
  )

  const refused = useCallback((shortfall: PortalUnitsShortfall) => {
    latest.current++ // the server has answered: no estimate in flight is newer
    setState((s) => {
      const estimate = shortfallEstimate(shortfall, s.last?.basis ?? null)
      return { outcome: { status: 'ready', estimate, afterWait: false }, last: estimate }
    })
  }, [])

  return { outcome: state.outcome, last: state.last, askAgain, refused }
}
