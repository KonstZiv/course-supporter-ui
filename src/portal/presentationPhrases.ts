// What the portal SAYS about an attempt, given what the server said about it
// (mentor-rebuild task 03).
//
// The server answers once — five states and a reason code — and the tree, the
// attempts list and the review detail all read that one answer. This module is
// the words for it. The portal no longer groups lifecycle statuses of its own
// (``statusBucket`` is gone): the rule lived in two repositories and they could
// drift, which is exactly what made "не схоже на спробу" reach a student as
// "Помилка" in the tree while the attempts list said the right thing.
//
// Three layers answer a refused attempt, in this order — unchanged from the
// doors pass, only the middle one is now keyed on the STATE rather than on the
// delivery status:
//   1. the article for the reason code (rejectionReasons.ts), when there is one
//   2. the phrase for the state, below
//   3. that module's own generic
// So a code this build has never heard of still gets a true sentence, and a
// state it has never heard of still gets one.

import type { PortalPresentation, PortalPresentationState } from './types'
import { articlePhrase, reasonArticle, UNKNOWN_REASON } from './rejectionReasons'

// The short label on a chip or a badge — a state, in as few words as fit.
const STATE_LABEL: Record<PortalPresentationState, string> = {
  not_opened: 'Не відкрито',
  not_an_attempt: 'Не схоже на спробу',
  awaiting_funds: 'Призупинено',
  in_progress: 'На перевірці',
  reviewed: 'Перевірено',
}

// The sentence, where a chip is not enough — the review panel, mostly.
//
// ``not_an_attempt`` keeps the wording ratified in the doors pass, word for
// word: it says more than any article keyed on the code could, which is why
// ``mismatch`` deliberately has no article.
const STATE_PHRASE: Record<PortalPresentationState, string> = {
  not_opened: 'Роботу не перевірено. Спробуйте надіслати ще раз.',
  not_an_attempt:
    'Надіслане не схоже на рішення цього завдання. ' +
    'Перевірте, що подаєте правильний файл.',
  awaiting_funds:
    'Перевірку призупинено — вона продовжиться автоматично, ' +
    'щойно ліміт поновлять. Надсилати роботу знову не потрібно.',
  in_progress: 'Рецензія зʼявиться, коли перевірка завершиться.',
  reviewed: 'Роботу перевірено.',
}

// Tone per state, so a chip in the tree and a chip in the list cannot drift
// apart either. ``reviewed`` carries no tone of its own — the verdict does.
const STATE_TONE: Record<PortalPresentationState, string> = {
  not_opened: 'bg-coral-pale text-coral',
  not_an_attempt: 'bg-amber-pale text-amber-dark',
  awaiting_funds: 'bg-amber-pale text-amber-dark',
  in_progress: 'bg-amber-pale text-amber-dark',
  reviewed: 'bg-forest-pale text-forest',
}

// Last resort for a state this build does not know: the server may be newer.
// Saying something true and useless beats saying nothing, and beats guessing.
const UNKNOWN_STATE_LABEL = 'Стан невідомий'

export function stateLabel(state: string): string {
  return STATE_LABEL[state as PortalPresentationState] ?? UNKNOWN_STATE_LABEL
}

export function stateTone(state: string): string {
  return STATE_TONE[state as PortalPresentationState] ?? 'bg-canvas-dark text-ink-muted'
}

// The full sentence for an attempt: the code's article if this build has one,
// else the state's phrase, else the generic. Never the backend's message — that
// is not on the contract and DD-6-D forbids it.
export function presentationPhrase(presentation: PortalPresentation): string {
  const { state, reason_code: code } = presentation
  const article = code ? reasonArticle(code) : null
  if (article) return articlePhrase(article)
  return STATE_PHRASE[state as PortalPresentationState] ?? articlePhrase(UNKNOWN_REASON)
}

// Does this state mean "there is a review to fetch"? The one question the
// review panel still has to ask about a state, and it asks it here rather than
// comparing strings at the call site.
export function isReviewed(state: string): boolean {
  return state === 'reviewed'
}
