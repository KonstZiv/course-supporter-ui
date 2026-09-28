import { ApiError } from '../api/client'
import { testRefusal } from '../api/tests'
import type {
  TestRefusal,
  TestRefusalPlace,
  WrittenTestIncompletePlace,
} from '../types/api'
import { ingestErrorMessage } from './ingestErrors'
import type { FieldProblem, TestDraft } from './testDraft'

/**
 * What the test editor and the upload dialog say to the author when a test
 * is refused or not finished (task 07c) — the texts of PRE-FLIGHT §21.1
 * («Незавершене») and §21.4 as vision-side proofread them, word for word.
 * A refusal's code picks the words; its ``details`` is English for the
 * developer and never reaches the author.
 */

/** What the author was doing when the server said no. */
export type TestAction =
  | 'save'
  | 'check'
  | 'publish'
  | 'export'
  | 'replace'
  | 'hide'

export const NOT_SAVED_SEE_BELOW =
  'Чернетку не збережено: виправте позначене нижче.'
export const BACK_TO_COURSES = 'До списку курсів'
export const POLLING_FAILED =
  'Не вдалося оновити стан перевірки. Оновіть сторінку.'
export const NO_NODE_FOR_NEW_TEST =
  'Не вдалося визначити розділ курсу для нового тесту. Поверніться до курсу й ' +
  'оберіть «Новий тест» у потрібному розділі.'

const NOT_FOUND = 'Тест не знайдено: можливо, його приховано.'
const NOT_A_TEST = 'Цей матеріал не є тестом, тож редактор його не відкриває.'
const NOT_OPENED =
  "Не вдалося відкрити тест. Перевірте з'єднання й оновіть сторінку."
const NOT_FINISHED =
  'Тест ще не завершено: доповніть позначені місця й спробуйте ще раз.'

// Each action's own sentence, and the one way on the author has when the
// server gave no reason: the connection, and another try.
const FAILED: Record<TestAction, string> = {
  save: 'Не вдалося зберегти чернетку.',
  check: 'Не вдалося замовити перевірку.',
  publish: 'Не вдалося опублікувати тест.',
  export: 'Не вдалося вивантажити тест.',
  replace: 'Не вдалося замінити чернетку.',
  hide: 'Не вдалося приховати тест.',
}
const TRY_AGAIN = "Перевірте з'єднання й спробуйте ще раз."

// A collision is the same 409 on both routes; what it stopped differs.
const COLLISION: Partial<Record<TestAction, string>> = {
  check:
    'Попередня перевірка цього тесту ще триває. Спробуйте за хвилину — нічого ' +
    'не змінено.',
  publish:
    'Попередня перевірка цього тесту ще триває, тож тест не опубліковано. ' +
    'Спробуйте за хвилину.',
}

// A refused save at a question or an option: the words there, under the
// banner that sends the author to them.
const SAVE_REFUSED_AT: Record<string, string> = {
  TEST_FIELD_INVALID:
    'Цей текст не вдалося зберегти: перевірте, чи він не задовгий.',
  TEST_OPTIONS_COUNT: 'У питанні більше 26 варіантів — приберіть зайві.',
}

// A refused save with no question to point at: the title or the pass mark,
// or the test's size.
const SAVE_REFUSED: Record<string, string> = {
  TEST_FIELD_INVALID: 'Не вдалося зберегти назву чи поріг: перевірте їх.',
  TEST_TOO_LARGE:
    'Тест завеликий, щоб зберегти його: скоротіть тексти або розділіть тест ' +
    'на два.',
}

// A saved body's texts a Stage 1 screen refused, by the screen's category.
const SCREENED_TEXT: Record<string, string> = {
  suspicious_unicode:
    'У текстах тесту є невидимі службові символи — найчастіше вони потрапляють ' +
    'під час копіювання з вебсторінки. Передрукуйте такий текст або вставте ' +
    'його як простий текст і збережіть знову.',
  prompt_injection:
    'Текст тесту не пройшов перевірку безпеки. Якщо ви впевнені, що з ним усе ' +
    'гаразд, напишіть нам — ми перевіримо.',
}
const SCREENED_TEXT_OTHER =
  'Текст тесту не пройшов перевірку безпеки. Перевірте тексти й спробуйте ще ' +
  'раз; якщо повториться, напишіть нам.'

// Why a YAML file was not read, by its refusal's code — the format's codes
// (backend ``DraftRefusalCode``) and the upload route's TEST_FILE_NOT_YAML.
const FILE_REASONS: Record<string, string> = {
  TEST_YAML_UNREADABLE:
    'файл не читається як YAML — перевірте відступи, двокрапки й лапки',
  TEST_YAML_DUPLICATE_KEY: 'одне поле записано двічі — лишіть один запис',
  TEST_YAML_ALIAS:
    'у файлі є якір чи посилання (& чи *) — запишіть текст повністю',
  TEST_FIELD_INVALID:
    'поле записано неправильно — перевірте назву поля, його вид і довжину за ' +
    'сторінкою «Для авторів»',
  TEST_OPTIONS_COUNT: 'у питанні більше 26 варіантів — приберіть зайві',
  TEST_TOO_LARGE:
    'файл завеликий: тест може мати до 256 КБ — скоротіть тексти чи розділіть ' +
    'тест',
  TEST_FILE_NOT_YAML: 'тест завантажується лише файлом YAML (.yaml чи .yml)',
}

/** The words at an unfinished place (§21.1 «Незавершене»). */
export function incompleteWords(place: WrittenTestIncompletePlace): string {
  switch (place.code) {
    case 'TEST_NO_QUESTIONS':
      return 'Додайте хоча б одне питання.'
    case 'TEST_TEXT_EMPTY':
      return place.option === null
        ? 'Впишіть текст питання.'
        : 'Впишіть текст варіанта.'
    case 'TEST_OPTIONS_COUNT':
      return 'Додайте варіанти: потрібно щонайменше два.'
    case 'TEST_NO_CORRECT_OPTION':
      return 'Позначте хоча б один правильний варіант.'
    // A code newer than this program: the banner's words still hold.
    default:
      return NOT_FINISHED
  }
}

/** The words at a field a check before the request found wrong. */
export function fieldProblemWords(problem: FieldProblem): string {
  switch (problem.field) {
    case 'title':
      return problem.kind === 'empty'
        ? 'Впишіть назву тесту.'
        : 'Назва задовга: до 200 знаків.'
    case 'pass_threshold':
      return 'Поріг — ціле число від 1 до 100.'
    case 'question':
      return 'Текст питання задовгий: до 2 000 знаків.'
    case 'option':
      return 'Текст варіанта задовгий: до 500 знаків.'
    case 'explanation':
      return 'Пояснення задовге: до 2 000 знаків.'
  }
}

/** Why a file cannot replace the draft, found before it is sent. */
export function yamlFileProblemWords(
  problem: 'not_yaml' | 'too_large',
): string {
  return problem === 'not_yaml'
    ? 'Оберіть файл YAML (.yaml чи .yml).'
    : 'Файл завеликий: тест може мати до 256 КБ.'
}

/**
 * The words of a YAML file's refusal, with its line and column and its
 * question and option when the refusal names them: «Файл не прочитано: …» in
 * the editor, «{file}: тест не прочитано — …» in the upload dialog, which
 * names the file. Null for a refusal that is not about the file.
 */
export function yamlFileRefusalWords(
  refusal: TestRefusal,
  fileName?: string,
): string | null {
  const reason = FILE_REASONS[refusal.code]
  if (reason === undefined) return null
  const words = `${reason}${placeWords(refusal.place)}`
  return fileName === undefined
    ? `Файл не прочитано: ${words}`
    : `${fileName}: тест не прочитано — ${words}`
}

function placeWords(place: TestRefusalPlace | null): string {
  if (place === null) return ''
  let words = ''
  if (place.line !== null) {
    words += ` — рядок ${place.line}`
    if (place.column !== null) words += `, стовпчик ${place.column}`
  }
  if (place.question !== null) {
    words += ` (питання ${place.question}`
    if (place.option !== null) words += `, варіант ${place.option}`
    words += ')'
  }
  return words
}

/** What a failed action shows. */
export interface ActionFailure {
  /** The words at the top of the page. */
  banner: string
  /**
   * The words at the question — and the option, when named — a refused save
   * points at, positions from 1 in the body sent (``placeInDraft`` finds the
   * card); null when it points at none.
   */
  at: { question: number; option: number | null; words: string } | null
  /** The unfinished places a refused check or publication lists, or null. */
  incomplete: WrittenTestIncompletePlace[] | null
}

function only(banner: string): ActionFailure {
  return { banner, at: null, incomplete: null }
}

/**
 * The words for an action the server refused, or that never reached it. A
 * failure with no reason of its own — the network, the server — is the
 * action's sentence and "check the connection"; a test gone meanwhile is
 * "not found".
 */
export function actionFailure(action: TestAction, error: unknown): ActionFailure {
  const refusal = error instanceof ApiError ? testRefusal(error.body) : null
  if (refusal !== null) {
    const collision = COLLISION[action]
    if (refusal.code === 'GENERATION_IN_PROGRESS' && collision !== undefined) {
      return only(collision)
    }
    if (refusal.code === 'TEST_DRAFT_INCOMPLETE') {
      return { banner: NOT_FINISHED, at: null, incomplete: refusal.incomplete }
    }
    if (action === 'replace') {
      if (refusal.code === 'SECURITY_REJECTED') {
        return only(ingestErrorMessage(refusal.category))
      }
      const words = yamlFileRefusalWords(refusal)
      if (words !== null) return only(words)
    }
    if (action === 'save') {
      const failure = saveRefusal(refusal)
      if (failure !== null) return failure
    }
  }
  if (error instanceof ApiError && error.status === 404) return only(NOT_FOUND)
  return only(`${FAILED[action]} ${TRY_AGAIN}`)
}

function saveRefusal(refusal: TestRefusal): ActionFailure | null {
  const question = refusal.place?.question ?? null
  const atWords = SAVE_REFUSED_AT[refusal.code]
  if (question !== null && atWords !== undefined) {
    const option = refusal.place?.option ?? null
    return {
      banner: NOT_SAVED_SEE_BELOW,
      at: { question, option, words: atWords },
      incomplete: null,
    }
  }
  if (refusal.code === 'SECURITY_REJECTED') {
    return only(SCREENED_TEXT[refusal.category ?? ''] ?? SCREENED_TEXT_OTHER)
  }
  const banner = SAVE_REFUSED[refusal.code]
  return banner === undefined ? null : only(banner)
}

/** The words for a test the editor could not open. */
export function openingFailure(error: unknown): string {
  if (!(error instanceof ApiError)) return NOT_OPENED
  if (error.status === 404) return NOT_FOUND
  return testRefusal(error.body)?.code === 'NOT_A_TEST_OBJECT'
    ? NOT_A_TEST
    : NOT_OPENED
}

/**
 * The card and the option a place names — positions from 1 in ``sent``, the
 * draft whose body the server read — or null when it names none of its
 * questions.
 */
export function placeInDraft(
  sent: TestDraft,
  place: { question: number | null; option: number | null },
): { questionKey: string; optionKey: string | null } | null {
  if (place.question === null) return null
  const question = sent.questions[place.question - 1]
  if (question === undefined) return null
  const option =
    place.option === null ? undefined : question.options[place.option - 1]
  return { questionKey: question.key, optionKey: option?.key ?? null }
}
