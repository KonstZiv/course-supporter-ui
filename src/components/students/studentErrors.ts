import { ApiError } from '../../api/client'
import type { Language } from '../../i18n/languages'
import { translate } from '../../i18n/translate'

export type StudentAction =
  | 'provision'
  | 'revoke'
  | 'restore'
  | 'bind'
  | 'unbind'
  | 'reset'

function detailOf(err: ApiError): string {
  const d = (err.body as { detail?: unknown } | null)?.detail
  return typeof d === 'string' ? d.toLowerCase() : ''
}

export function studentErrorMessage(language: Language, action: StudentAction, err: unknown): string {
  if (!(err instanceof ApiError)) {
    return translate(language, 'panel.students.error.network')
  }
  const detail = detailOf(err)
  const has = (s: string) => detail.includes(s)

  switch (action) {
    case 'provision':
      if (err.status === 409) {
        return has('credential')
          ? translate(language, 'panel.students.error.alreadyHasAccess')
          : translate(language, 'panel.students.error.loginOrExternalIdInUse')
      }
      if (err.status === 422) return translate(language, 'panel.students.error.passwordTooWeak')
      if (err.status === 404) return translate(language, 'panel.students.error.studentWithIdNotFound')
      break
    case 'revoke':
    case 'restore':
      if (err.status === 404) {
        return has('credential')
          ? translate(language, 'panel.students.error.noAccess')
          : translate(language, 'panel.students.error.studentNotFound')
      }
      break
    case 'bind':
      if (err.status === 409) return translate(language, 'panel.students.error.alreadyEnrolled')
      if (err.status === 422) return translate(language, 'panel.students.error.mustBeRootCourse')
      if (err.status === 404) {
        return has('course')
          ? translate(language, 'panel.students.error.courseNotFound')
          : translate(language, 'panel.students.error.studentNotFound')
      }
      break
    case 'unbind':
      if (err.status === 404) return translate(language, 'panel.students.error.enrollmentNotFound')
      break
    case 'reset':
      if (err.status === 422) return translate(language, 'panel.students.error.passwordTooWeak')
      if (err.status === 404) {
        return has('credential')
          ? translate(language, 'panel.students.error.noAccess')
          : translate(language, 'panel.students.error.studentNotFound')
      }
      break
  }
  // Unknown code for this action — fall back to the server phrase, else generic.
  return detail || translate(language, 'panel.students.error.generic', { status: err.status })
}
