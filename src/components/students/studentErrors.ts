import { ApiError } from '../../api/client'

// Author-facing error phrases per (action + status), mirroring the backend's
// HTTPException codes (404 / 409 / 422 — only 422 is auto-declared in OpenAPI,
// the rest are raised in students.py). Client-side cross-field validation in
// the provision form removes the array-shape 422 (missing external_id /
// student_id), so a 422 reaching here is a server-side *string* detail
// (weak password / non-root course). `body.detail` is used only as a
// discriminator for the two-way 409/404 splits and as a last-resort fallback
// for an unknown code — never rendered raw except that fallback.
//
// NOTE: this is the 4th instance of the "FE mirrors backend codes" pattern
// (after c3b terminalStatus.ts et al.). If it recurs, it is a candidate for
// OpenAPI-driven codegen rather than another hand-written table.

export type StudentAction =
  | 'provision'
  | 'revoke'
  | 'restore'
  | 'bind'
  | 'unbind'

function detailOf(err: ApiError): string {
  const d = (err.body as { detail?: unknown } | null)?.detail
  return typeof d === 'string' ? d.toLowerCase() : ''
}

export function studentErrorMessage(action: StudentAction, err: unknown): string {
  if (!(err instanceof ApiError)) {
    return 'Не вдалося зв’язатися із сервером. Спробуйте ще раз.'
  }
  const detail = detailOf(err)
  const has = (s: string) => detail.includes(s)

  switch (action) {
    case 'provision':
      if (err.status === 409) {
        return has('credential')
          ? 'Цей студент уже має доступ до порталу.'
          : 'Логін або external ID уже використовується.'
      }
      if (err.status === 422) return 'Пароль не відповідає вимогам (замалий).'
      if (err.status === 404) return 'Студента з таким ID не знайдено.'
      break
    case 'revoke':
    case 'restore':
      if (err.status === 404) {
        return has('credential')
          ? 'У студента немає доступу до порталу.'
          : 'Студента не знайдено.'
      }
      break
    case 'bind':
      if (err.status === 409) return 'Студент уже зарахований на цей курс.'
      if (err.status === 422) return 'Це має бути кореневий курс.'
      if (err.status === 404) {
        return has('course') ? 'Курс не знайдено.' : 'Студента не знайдено.'
      }
      break
    case 'unbind':
      if (err.status === 404) return 'Зарахування не знайдено.'
      break
  }
  // Unknown code for this action — fall back to the server phrase, else generic.
  return detail || `Помилка (${err.status}).`
}
