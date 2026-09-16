import { describe, expect, it } from 'vitest'
import {
  isReviewed,
  presentationPhrase,
  stateLabel,
  stateTone,
} from './presentationPhrases'
import type { PortalPresentation, PortalPresentationState } from './types'

const STATES: PortalPresentationState[] = [
  'not_opened',
  'not_an_attempt',
  'awaiting_funds',
  'in_progress',
  'reviewed',
]

const p = (
  state: string,
  reason_code: string | null = null,
): PortalPresentation => ({ state: state as PortalPresentationState, reason_code })

describe('the five states each get their own words', () => {
  it.each(STATES)('%s has a label of its own', (state) => {
    const others = STATES.filter((s) => s !== state).map(stateLabel)
    expect(others).not.toContain(stateLabel(state))
  })

  it.each(STATES)('%s has a phrase of its own', (state) => {
    const others = STATES.filter((s) => s !== state).map((s) =>
      presentationPhrase(p(s)),
    )
    expect(others).not.toContain(presentationPhrase(p(state)))
  })

  it.each(STATES)('%s says something, and not the generic', (state) => {
    const phrase = presentationPhrase(p(state))
    expect(phrase.length).toBeGreaterThan(10)
    expect(phrase).not.toMatch(/сталася помилка/)
  })

  it('no state is phrased as «Помилка» any more', () => {
    // The whole point of task 03 on this side: four different things used to
    // reach the student under one word.
    for (const state of STATES) {
      expect(stateLabel(state)).not.toBe('Помилка')
      expect(presentationPhrase(p(state))).not.toMatch(/^Помилка/)
    }
  })

  it('only «reviewed» means there is a review to fetch', () => {
    expect(isReviewed('reviewed')).toBe(true)
    for (const state of STATES.filter((s) => s !== 'reviewed')) {
      expect(isReviewed(state)).toBe(false)
    }
  })
})

describe('the wording the operator ratified', () => {
  it('«не схоже на спробу» answers the student instead of blaming the system', () => {
    expect(stateLabel('not_an_attempt')).toBe('Не схоже на спробу')
    expect(presentationPhrase(p('not_an_attempt'))).toMatch(
      /не схоже на рішення цього завдання/,
    )
    expect(presentationPhrase(p('not_an_attempt'))).toMatch(
      /Перевірте, що подаєте правильний файл/,
    )
  })

  it('a hold says it resumes by itself and asks for no resubmission', () => {
    // Who tops the limit up depends on how the course is sold (KD19) and the
    // wire does not say, so the sentence names no one — but it does name the
    // one action that holds either way, and that guards against a second
    // submission of the same work (DD-SP-AT).
    const phrase = presentationPhrase(p('awaiting_funds'))
    expect(phrase).toMatch(/продовжиться автоматично/)
    expect(phrase).toMatch(/Надсилати роботу знову не потрібно/)
    expect(phrase).not.toMatch(/викладач|поповн[іи]ть|баланс|кредит/)
  })

  it('a safety refusal keeps the sentence it was ratified with', () => {
    expect(presentationPhrase(p('not_opened', 'stage2_rejected'))).toMatch(
      /не пройшло перевірку безпеки/,
    )
  })

  it('a broken run says what to do about it', () => {
    const phrase = presentationPhrase(p('not_opened', 'processing_failed'))
    expect(phrase).toMatch(/Не вдалося перевірити роботу/)
    expect(phrase).toMatch(/Надішліть її ще раз/)
  })
})

describe('the three layers, in order', () => {
  it('layer 1: an article for the code wins over the phrase for the state', () => {
    const withArticle = presentationPhrase(p('not_opened', 'processing_failed'))
    const stateOnly = presentationPhrase(p('not_opened'))

    expect(withArticle).not.toBe(stateOnly)
    expect(withArticle).toMatch(/Не вдалося перевірити роботу/)
  })

  it('layer 2: a code this build has never seen falls to the state phrase', () => {
    // A server newer than the portal. The state is still known, so the student
    // gets a true sentence rather than a generic one.
    expect(presentationPhrase(p('not_an_attempt', 'code_from_the_future'))).toBe(
      presentationPhrase(p('not_an_attempt')),
    )
  })

  it('layer 3: an unknown state AND an unknown code still say something', () => {
    expect(
      presentationPhrase(p('state_from_the_future', 'code_from_the_future')),
    ).toMatch(/сталася помилка/)
  })

  it('an unknown state gets a label and a tone rather than nothing', () => {
    expect(stateLabel('state_from_the_future')).toBe('Стан невідомий')
    expect(stateTone('state_from_the_future')).toContain('ink-muted')
  })

  it('never returns an empty string, whatever it is handed', () => {
    for (const state of [...STATES, 'nonsense']) {
      for (const code of [null, 'processing_failed', 'nonsense']) {
        expect(presentationPhrase(p(state, code)).length).toBeGreaterThan(0)
      }
    }
  })
})
