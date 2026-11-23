import { ApiError } from '../../api/client'
import type { Language } from '../../i18n/languages'
import { translate } from '../../i18n/translate'

// Author-facing phrase for a failed call on the enrolment link: 404 (the
// course is gone), a status the server answered with, or no answer at all.
export function enrollmentLinkErrorMessage(language: Language, err: unknown): string {
  if (!(err instanceof ApiError)) {
    return translate(language, 'panel.enrollmentLink.error.network')
  }
  if (err.status === 404) {
    return translate(language, 'panel.enrollmentLink.error.notFound')
  }
  return translate(language, 'panel.enrollmentLink.error.generic', { status: err.status })
}
