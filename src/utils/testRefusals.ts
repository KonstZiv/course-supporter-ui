import { ApiError } from '../api/client'
import { testRefusal } from '../api/tests'
import type {
  TestRefusal,
  TestRefusalPlace,
  WrittenTestIncompletePlace,
} from '../types/api'
import type { Language } from '../i18n/languages'
import { translate } from '../i18n/translate'
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

export function notSavedSeeBelow(language: Language): string {
  return translate(language, 'panel.testRefusals.notSavedSeeBelow')
}

export function backToCourses(language: Language): string {
  return translate(language, 'panel.testRefusals.backToCourses')
}

export function pollingFailed(language: Language): string {
  return translate(language, 'panel.testRefusals.pollingFailed')
}

export function noNodeForNewTest(language: Language): string {
  return translate(language, 'panel.testRefusals.noNodeForNewTest')
}

export const NOT_SAVED_SEE_BELOW = notSavedSeeBelow('uk')
export const BACK_TO_COURSES = backToCourses('uk')
export const POLLING_FAILED = pollingFailed('uk')
export const NO_NODE_FOR_NEW_TEST = noNodeForNewTest('uk')

const FAILED_KEY: Record<
  TestAction,
  | 'panel.testRefusals.failed.save'
  | 'panel.testRefusals.failed.check'
  | 'panel.testRefusals.failed.publish'
  | 'panel.testRefusals.failed.export'
  | 'panel.testRefusals.failed.replace'
  | 'panel.testRefusals.failed.hide'
> = {
  save: 'panel.testRefusals.failed.save',
  check: 'panel.testRefusals.failed.check',
  publish: 'panel.testRefusals.failed.publish',
  export: 'panel.testRefusals.failed.export',
  replace: 'panel.testRefusals.failed.replace',
  hide: 'panel.testRefusals.failed.hide',
}

const COLLISION_KEY: Partial<
  Record<
    TestAction,
    | 'panel.testRefusals.collision.check'
    | 'panel.testRefusals.collision.publish'
  >
> = {
  check: 'panel.testRefusals.collision.check',
  publish: 'panel.testRefusals.collision.publish',
}

const SAVE_REFUSED_AT_KEY: Record<
  string,
  | 'panel.testRefusals.saveRefusedAt.fieldInvalid'
  | 'panel.testRefusals.saveRefusedAt.optionsCount'
> = {
  TEST_FIELD_INVALID: 'panel.testRefusals.saveRefusedAt.fieldInvalid',
  TEST_OPTIONS_COUNT: 'panel.testRefusals.saveRefusedAt.optionsCount',
}

const SAVE_REFUSED_KEY: Record<
  string,
  | 'panel.testRefusals.saveRefused.fieldInvalid'
  | 'panel.testRefusals.saveRefused.tooLarge'
> = {
  TEST_FIELD_INVALID: 'panel.testRefusals.saveRefused.fieldInvalid',
  TEST_TOO_LARGE: 'panel.testRefusals.saveRefused.tooLarge',
}

const SCREENED_TEXT_KEY: Record<
  string,
  | 'panel.testRefusals.screenedText.suspiciousUnicode'
  | 'panel.testRefusals.screenedText.promptInjection'
> = {
  suspicious_unicode: 'panel.testRefusals.screenedText.suspiciousUnicode',
  prompt_injection: 'panel.testRefusals.screenedText.promptInjection',
}

const FILE_REASONS_KEY: Record<
  string,
  | 'panel.testRefusals.fileReason.yamlUnreadable'
  | 'panel.testRefusals.fileReason.yamlDuplicateKey'
  | 'panel.testRefusals.fileReason.yamlAlias'
  | 'panel.testRefusals.fileReason.fieldInvalid'
  | 'panel.testRefusals.fileReason.optionsCount'
  | 'panel.testRefusals.fileReason.tooLarge'
  | 'panel.testRefusals.fileReason.notYaml'
> = {
  TEST_YAML_UNREADABLE: 'panel.testRefusals.fileReason.yamlUnreadable',
  TEST_YAML_DUPLICATE_KEY: 'panel.testRefusals.fileReason.yamlDuplicateKey',
  TEST_YAML_ALIAS: 'panel.testRefusals.fileReason.yamlAlias',
  TEST_FIELD_INVALID: 'panel.testRefusals.fileReason.fieldInvalid',
  TEST_OPTIONS_COUNT: 'panel.testRefusals.fileReason.optionsCount',
  TEST_TOO_LARGE: 'panel.testRefusals.fileReason.tooLarge',
  TEST_FILE_NOT_YAML: 'panel.testRefusals.fileReason.notYaml',
}

/** The words at an unfinished place (§21.1 «Незавершене»). */
export function incompleteWords(
  language: Language,
  place: WrittenTestIncompletePlace,
): string {
  switch (place.code) {
    case 'TEST_NO_QUESTIONS':
      return translate(language, 'panel.testRefusals.incomplete.noQuestions')
    case 'TEST_TEXT_EMPTY':
      return place.option === null
        ? translate(language, 'panel.testRefusals.incomplete.questionTextEmpty')
        : translate(language, 'panel.testRefusals.incomplete.optionTextEmpty')
    case 'TEST_OPTIONS_COUNT':
      return translate(language, 'panel.testRefusals.incomplete.optionsCount')
    case 'TEST_NO_CORRECT_OPTION':
      return translate(language, 'panel.testRefusals.incomplete.noCorrectOption')
    default:
      return translate(language, 'panel.testRefusals.notFinished')
  }
}

/** The words at a field a check before the request found wrong. */
export function fieldProblemWords(
  language: Language,
  problem: FieldProblem,
): string {
  switch (problem.field) {
    case 'title':
      return problem.kind === 'empty'
        ? translate(language, 'panel.testRefusals.problem.titleEmpty')
        : translate(language, 'panel.testRefusals.problem.titleTooLong')
    case 'pass_threshold':
      return translate(language, 'panel.testRefusals.problem.passThreshold')
    case 'question':
      return translate(language, 'panel.testRefusals.problem.questionTooLong')
    case 'option':
      return translate(language, 'panel.testRefusals.problem.optionTooLong')
    case 'explanation':
      return translate(
        language,
        'panel.testRefusals.problem.explanationTooLong',
      )
  }
}

/** Why a file cannot replace the draft, found before it is sent. */
export function yamlFileProblemWords(
  language: Language,
  problem: 'not_yaml' | 'too_large',
): string {
  return problem === 'not_yaml'
    ? translate(language, 'panel.testRefusals.problem.notYamlFile')
    : translate(language, 'panel.testRefusals.problem.fileTooLarge')
}

/**
 * The words of a YAML file's refusal, with its line and column and its
 * question and option when the refusal names them: «Файл не прочитано: …» in
 * the editor, «{file}: тест не прочитано — …» in the upload dialog, which
 * names the file. Null for a refusal that is not about the file.
 */
export function yamlFileRefusalWords(
  language: Language,
  refusal: TestRefusal,
  fileName?: string,
): string | null {
  const reasonKey = FILE_REASONS_KEY[refusal.code]
  if (reasonKey === undefined) return null
  const reason = translate(language, reasonKey)
  const words = `${reason}${placeWords(language, refusal.place)}`
  return fileName === undefined
    ? translate(language, 'panel.testRefusals.fileRefusal', { reason: words })
    : translate(language, 'panel.testRefusals.fileRefusalNamed', {
        fileName,
        reason: words,
      })
}

function placeWords(language: Language, place: TestRefusalPlace | null): string {
  if (place === null) return ''
  let words = ''
  if (place.line !== null) {
    if (place.column !== null) {
      words += translate(language, 'panel.testRefusals.place.lineAndColumn', {
        line: place.line,
        column: place.column,
      })
    } else {
      words += translate(language, 'panel.testRefusals.place.line', {
        line: place.line,
      })
    }
  }
  if (place.question !== null) {
    if (place.option !== null) {
      words += translate(
        language,
        'panel.testRefusals.place.questionAndOption',
        {
          question: place.question,
          option: place.option,
        },
      )
    } else {
      words += translate(language, 'panel.testRefusals.place.question', {
        question: place.question,
      })
    }
  }
  return words
}

/** What a failed action shows. */
export interface ActionFailure {
  banner: string
  at: { question: number; option: number | null; words: string } | null
  incomplete: WrittenTestIncompletePlace[] | null
}

function only(banner: string): ActionFailure {
  return { banner, at: null, incomplete: null }
}

export function actionFailure(
  language: Language,
  action: TestAction,
  error: unknown,
): ActionFailure {
  const refusal = error instanceof ApiError ? testRefusal(error.body) : null
  if (refusal !== null) {
    const collisionKey = COLLISION_KEY[action]
    if (refusal.code === 'GENERATION_IN_PROGRESS' && collisionKey !== undefined) {
      return only(translate(language, collisionKey))
    }
    if (refusal.code === 'TEST_DRAFT_INCOMPLETE') {
      return {
        banner: translate(language, 'panel.testRefusals.notFinished'),
        at: null,
        incomplete: refusal.incomplete,
      }
    }
    if (action === 'replace') {
      if (refusal.code === 'SECURITY_REJECTED') {
        return only(ingestErrorMessage(language, refusal.category))
      }
      const words = yamlFileRefusalWords(language, refusal)
      if (words !== null) return only(words)
    }
    if (action === 'save') {
      const failure = saveRefusal(language, refusal)
      if (failure !== null) return failure
    }
  }
  if (error instanceof ApiError && error.status === 404) {
    return only(translate(language, 'panel.testRefusals.notFound'))
  }
  return only(translate(language, FAILED_KEY[action]))
}

function saveRefusal(
  language: Language,
  refusal: TestRefusal,
): ActionFailure | null {
  const question = refusal.place?.question ?? null
  const atWordsKey = SAVE_REFUSED_AT_KEY[refusal.code]
  if (question !== null && atWordsKey !== undefined) {
    const option = refusal.place?.option ?? null
    return {
      banner: translate(language, 'panel.testRefusals.notSavedSeeBelow'),
      at: { question, option, words: translate(language, atWordsKey) },
      incomplete: null,
    }
  }
  if (refusal.code === 'SECURITY_REJECTED') {
    const key =
      SCREENED_TEXT_KEY[refusal.category ?? ''] ??
      'panel.testRefusals.screenedText.other'
    return only(translate(language, key))
  }
  const bannerKey = SAVE_REFUSED_KEY[refusal.code]
  return bannerKey === undefined ? null : only(translate(language, bannerKey))
}

export function openingFailure(language: Language, error: unknown): string {
  if (!(error instanceof ApiError)) {
    return translate(language, 'panel.testRefusals.notOpened')
  }
  if (error.status === 404) {
    return translate(language, 'panel.testRefusals.notFound')
  }
  return testRefusal(error.body)?.code === 'NOT_A_TEST_OBJECT'
    ? translate(language, 'panel.testRefusals.notATest')
    : translate(language, 'panel.testRefusals.notOpened')
}

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
