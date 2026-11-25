import type { MessageKey } from '../../i18n/translate'
import type { SubmissionPresentation } from '../../types/api'

const PRESENTATION_KEYS: Record<string, MessageKey> = {
  in_progress: 'panel.studentWork.state.inProgress',
  awaiting_funds: 'panel.studentWork.state.awaitingFunds',
  not_opened: 'panel.studentWork.state.notOpened',
  not_an_attempt: 'panel.studentWork.state.notAnAttempt',
}

export function presentationStateKey(
  presentation: SubmissionPresentation,
): MessageKey | null {
  if (
    presentation.state === 'awaiting_funds' &&
    presentation.reason_code === 'awaiting_author_funds'
  ) {
    return 'panel.studentWork.state.awaitingAuthorFunds'
  }
  return PRESENTATION_KEYS[presentation.state] ?? null
}
