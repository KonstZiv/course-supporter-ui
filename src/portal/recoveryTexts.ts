// UK copy for the R3 password-recovery self-service flow.
//
// Mirrors the terminalStatus.ts pattern: named constants for fixed UI copy
// (titles, labels, success/state phrases) plus a keyed Record with a fallback
// accessor for the error phrases. UK-only MVP (ratified Q7); a future language
// dimension keys these by locale, same as the email dictionary on the backend.
//
// The error map is keyed by a SEMANTIC error name, not an HTTP status — a
// screen maps its status → key itself (a 422 means "weak password" on reset but
// "invalid email" on the recovery-email section, so the HTTP code alone is
// ambiguous across the flow). Raw backend detail is never surfaced (it may be
// English; the phrases here are the curated uk-facing "why").

// --- forgot-password screen ---
export const FORGOT_TITLE = 'Відновлення паролю'
export const FORGOT_DESCRIPTION =
  'Введіть свій логін. Якщо для нього налаштована й підтверджена ' +
  'резервна пошта, ми надішлемо на неї посилання для зміни паролю.'
export const FORGOT_LOGIN_LABEL = 'Логін'
export const FORGOT_SUBMIT = 'Надіслати посилання'
// Anti-enumeration: shown unconditionally on 202, whether or not the login
// exists or has a confirmed recovery email.
export const FORGOT_SUCCESS =
  'Якщо для цього логіна налаштована резервна пошта, ми надіслали на неї ' +
  'посилання для зміни паролю. Перевірте вхідні.'
export const FORGOT_BACK_TO_LOGIN = 'Повернутися до входу'

// --- reset-password screen ---
export const RESET_TITLE = 'Новий пароль'
export const RESET_DESCRIPTION = 'Придумайте новий пароль для входу в портал.'
export const RESET_PASSWORD_LABEL = 'Новий пароль'
export const RESET_SUBMIT = 'Зберегти пароль'
export const RESET_SUCCESS =
  'Пароль змінено. Тепер увійдіть із новим паролем.'
export const RESET_GO_TO_LOGIN = 'Перейти до входу'
export const RESET_REQUEST_NEW_LINK = 'Запросити нове посилання'
// FE pre-validation mirror of the backend minimum (RP6 minimal mirror).
export const PASSWORD_MIN_LENGTH = 10
export const RESET_TOO_SHORT = `Пароль має містити щонайменше ${PASSWORD_MIN_LENGTH} символів.`

// --- confirm-email landing ---
export const CONFIRM_TITLE = 'Підтвердження пошти'
export const CONFIRM_DESCRIPTION =
  'Натисніть кнопку, щоб підтвердити резервну пошту для відновлення паролю.'
export const CONFIRM_SUBMIT = 'Підтвердити email'
export const CONFIRM_SUCCESS = 'Резервну пошту підтверджено.'
export const CONFIRM_GO_TO_PORTAL = 'Перейти до порталу'
// 400 CTA hint on the confirm landing (no forgot link here — the fix is to
// re-request from inside the portal).
export const CONFIRM_INVALID_HINT =
  'Увійдіть у портал і надішліть лист із підтвердженням повторно.'

// --- recovery-email section (home) ---
export const SECTION_TITLE = 'Резервна пошта'
export const SECTION_DESCRIPTION =
  'Додайте резервну пошту, щоб мати змогу самостійно відновити пароль.'
export const SECTION_EMAIL_LABEL = 'Пошта'
export const SECTION_STATE_NONE = 'Резервну пошту не налаштовано.'
export const SECTION_STATE_PENDING =
  'Очікує підтвердження. Ми надіслали лист — перейдіть за посиланням у ньому.'
export const SECTION_STATE_CONFIRMED = 'Підтверджено.'
export const SECTION_ADD = 'Додати пошту'
export const SECTION_CHANGE = 'Змінити'
export const SECTION_SAVE = 'Зберегти'
export const SECTION_CANCEL = 'Скасувати'
export const SECTION_RESEND = 'Надіслати лист повторно'
export const SECTION_RESENT = 'Лист надіслано повторно.'
export const SECTION_LOAD_ERROR = 'Не вдалося завантажити стан резервної пошти.'

// --- keyed error phrases (semantic key → uk phrase, fallback accessor) ---
const FLOW_ERRORS: Record<string, string> = {
  rateLimited: 'Забагато спроб. Спробуйте трохи згодом.',
  invalidToken: 'Посилання недійсне або протерміноване.',
  invalidEmail: 'Вкажіть коректну адресу пошти.',
  weakPassword: RESET_TOO_SHORT,
  missingToken: 'Посилання неповне або пошкоджене.',
}

export function flowError(key: string): string {
  return FLOW_ERRORS[key] ?? 'Не вдалося зʼєднатися із сервером.'
}
