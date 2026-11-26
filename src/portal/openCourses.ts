// Open courses (O-1): what the enrollment pages share — the words of a
// refusal, the names of a course's languages, the addresses of the pages. The
// pages pick their words by the refusal's ``code``; the server's ``details`` is
// never shown, nor read.

import type { Language } from '../i18n/languages'
import { localeOf } from '../i18n/languages'
import { translate } from '../i18n/translate'
import { PortalApiError } from './api/portalClient'
import { flowError } from './recoveryTexts'

/** Seconds before the email may be sent again — the server's own pause per request. */
export const RESEND_PAUSE_SECONDS = 60

/** What the "confirm your email" page is handed with the signup's answer. */
export interface JoinSentState {
  emailMasked: string
}

/** A 429's wait, in whole minutes rounded up; null for any other failure or without ``Retry-After``. */
export function retryMinutes(err: unknown): number | null {
  if (!(err instanceof PortalApiError) || err.status !== 429) return null
  if (err.retryAfter === null) return null
  return Math.max(1, Math.ceil(err.retryAfter / 60))
}

/** The sentence of a 429: with the minutes to wait when the server named them. */
export function rateLimitedText(language: Language, err: unknown): string {
  const minutes = retryMinutes(err)
  return minutes === null
    ? flowError(language, 'rateLimited')
    : translate(language, 'portal.common.rateLimited', { minutes })
}

/** Whether a failure is a 429. */
export function isRateLimited(err: unknown): boolean {
  return err instanceof PortalApiError && err.status === 429
}

/** What went wrong in a signup's form, by the field the server named in its 422. */
export type SignupFieldFailure = 'weakPassword' | 'invalidEmail' | 'invalidForm'

/**
 * A signup's 422, by its field: a weak password is a plain-string ``detail``;
 * a request the schema refused lists the fields (``loc``) without the values.
 */
export function signupFieldFailure(err: unknown): SignupFieldFailure | null {
  if (!(err instanceof PortalApiError) || err.status !== 422) return null
  const detail = (err.body as { detail?: unknown } | null)?.detail
  if (typeof detail === 'string') return 'weakPassword'
  if (!Array.isArray(detail)) return 'invalidForm'
  const fields = detail.flatMap((e) =>
    Array.isArray((e as { loc?: unknown })?.loc) ? (e as { loc: unknown[] }).loc : [],
  )
  if (fields.includes('password')) return 'weakPassword'
  if (fields.includes('email')) return 'invalidEmail'
  return 'invalidForm'
}

/** The course's languages (ISO 639-3), named in the language of the pages. */
export function courseLanguageNames(language: Language, codes: readonly string[]): string {
  let names: Intl.DisplayNames | null = null
  try {
    names = new Intl.DisplayNames([localeOf(language)], { type: 'language' })
  } catch {
    // An engine without display names shows the codes.
  }
  return codes
    .map((code) => {
      try {
        return names?.of(code) ?? code
      } catch {
        return code
      }
    })
    .join(', ')
}

/** Where a course of the portal opens. */
export function courseAddress(tenantId: string, courseId: string): string {
  return `/${tenantId}/courses/${courseId}`
}

/** The enrollment page of a course link. */
export function joinAddress(tenantId: string, key: string): string {
  return `/${tenantId}/join/${encodeURIComponent(key)}`
}

/** The "confirm your email" page of a signup: the request travels in the address. */
export function joinSentAddress(tenantId: string, key: string, signupId: string): string {
  return `${joinAddress(tenantId, key)}/sent?signup=${encodeURIComponent(signupId)}`
}

/** The shared sign-in by email, with the way back (``next``) when there is one. */
export function emailLoginAddress(next?: string | null): string {
  return next ? `/login?next=${encodeURIComponent(next)}` : '/login'
}

const SOURCE_TAG_PARAM = 'src'
const SOURCE_TAG_RE = /^[a-z0-9_-]{1,40}$/

/**
 * Campaign source tag from the join page's query (`?src=<tag>`),
 * returned only when it matches the billing contract (`^[a-z0-9_-]{1,40}$`).
 */
export function sourceTagFrom(search: string | URLSearchParams): string | undefined {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search
  const value = params.get(SOURCE_TAG_PARAM)
  return value !== null && SOURCE_TAG_RE.test(value) ? value : undefined
}
