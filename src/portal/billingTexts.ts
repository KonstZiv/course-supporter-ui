import { SUPPORT_ADDRESS } from '../utils/contactAdmin'
import {
  NETWORK_FAILED,
  PACKAGE_NOT_FOUND,
  type ActionFailure,
} from '../utils/billingWords'

// What the portal's "Юніти" page says where the author's says something else.
// The portal has no letter to the administrator (the author's ContactAdmin
// writes on the author's behalf): wherever the student should write, the
// sentence names the support address, which the page shows as a mailto link
// (`SupportMailText`). The rest — statement lines, packages, the payment's
// states — are the shared words of `utils/billingWords` and the shared
// billing components.

const WRITE_TO_SUPPORT = `напишіть на ${SUPPORT_ADDRESS}.`

export const UNITS_SUBTITLE =
  'Юніти оплачують автоматичну перевірку ваших робіт. Юніт — не гроші й не платіжний засіб, а обсяг послуги платформи.'

export const PURCHASE_NOT_OPEN = `Купівля юнітів у порталі ще не відкрита. З питаннями пишіть на ${SUPPORT_ADDRESS}.`

export const LOAD_FAILED = `Не вдалося завантажити дані про юніти. Оновіть сторінку; якщо повториться, ${WRITE_TO_SUPPORT}`

export const PROVIDER_UNAVAILABLE = `Сторінка оплати зараз не відкрилася. Спробуйте ще раз за хвилину; якщо повториться, ${WRITE_TO_SUPPORT}`

export const ACTION_FAILED = `Не вдалося виконати дію. Спробуйте ще раз; якщо повториться, ${WRITE_TO_SUPPORT}`

/** The student's words for each failure of an action. */
export const ACTION_FAILURE_TEXT: Record<ActionFailure, string> = {
  package_not_found: PACKAGE_NOT_FOUND,
  provider_unavailable: PROVIDER_UNAVAILABLE,
  refused: ACTION_FAILED,
  unreachable: NETWORK_FAILED,
}

/** Ten minutes after the return, when the page no longer asks. */
export const PAYMENT_NOT_ARRIVED = `Якщо ви сплатили, а юніти не з'являться протягом години, ${WRITE_TO_SUPPORT}`

export const RETURN_TO_WORK = 'Повернутись до роботи'

/** When the tab could not be closed: where the student's work waits. */
export const RETURN_TO_TASK_TAB =
  'Якщо ви прийшли сюди зі сторінки завдання, поверніться на ту вкладку: обраний файл чекає там.'
