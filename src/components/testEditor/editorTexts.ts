/**
 * The test editor's own words (task 07c) — PRE-FLIGHT §21.1–§21.3 as
 * vision-side proofread them, word for word, in one place. The words of
 * refusals and of unfinished places are ``utils/testRefusals.ts``.
 */

import type { Language } from '../../i18n/languages'
import { translate } from '../../i18n/translate'

export function editorTexts(language: Language) {
  return {
    newTest: translate(language, 'panel.testEditor.newTest'),
    back: translate(language, 'panel.testEditor.back'),

    published: translate(language, 'panel.testEditor.published'),
    publishedHint: translate(language, 'panel.testEditor.publishedHint'),
    notPublished: translate(language, 'panel.testEditor.notPublished'),
    unpublishedChanges: translate(language, 'panel.testEditor.unpublishedChanges'),
    unpublishedChangesHint: translate(
      language,
      'panel.testEditor.unpublishedChangesHint',
    ),

    notChecked: translate(language, 'panel.testEditor.notChecked'),
    checking: translate(language, 'panel.testEditor.checking'),
    checked: translate(language, 'panel.testEditor.checked'),
    checkFailed: translate(language, 'panel.testEditor.checkFailed'),

    unsaved: translate(language, 'panel.testEditor.unsaved'),
    saving: translate(language, 'panel.testEditor.saving'),
    allSaved: translate(language, 'panel.testEditor.allSaved'),

    save: translate(language, 'panel.testEditor.save'),
    nothingToSave: translate(language, 'panel.testEditor.nothingToSave'),
    check: translate(language, 'panel.testEditor.check'),
    ordering: translate(language, 'panel.testEditor.ordering'),
    publish: translate(language, 'panel.testEditor.publish'),
    publishing: translate(language, 'panel.testEditor.publishing'),

    saveTestFirst: translate(language, 'panel.testEditor.saveTestFirst'),
    saveChangesFirst: translate(language, 'panel.testEditor.saveChangesFirst'),
    finishFirst: translate(language, 'panel.testEditor.finishFirst'),
    alreadyChecked: translate(language, 'panel.testEditor.alreadyChecked'),
    nothingToPublish: translate(language, 'panel.testEditor.nothingToPublish'),

    editView: translate(language, 'panel.testEditor.editView'),
    studentView: translate(language, 'panel.testEditor.studentView'),

    exportYaml: translate(language, 'panel.testEditor.exportYaml'),
    replaceYaml: translate(language, 'panel.testEditor.replaceYaml'),
    hide: translate(language, 'panel.testEditor.hide'),

    title: translate(language, 'panel.testEditor.title'),
    titleHint: translate(language, 'panel.testEditor.titleHint'),
    passThreshold: translate(language, 'panel.testEditor.passThreshold'),
    passThresholdHint: translate(language, 'panel.testEditor.passThresholdHint'),

    questionText: translate(language, 'panel.testEditor.questionText'),
    options: translate(language, 'panel.testEditor.options'),
    correct: translate(language, 'panel.testEditor.correct'),
    addOption: translate(language, 'panel.testEditor.addOption'),
    addOwnExplanation: translate(language, 'panel.testEditor.addOwnExplanation'),
    ownExplanation: translate(language, 'panel.testEditor.ownExplanation'),
    removeOwnExplanation: translate(
      language,
      'panel.testEditor.removeOwnExplanation',
    ),
    ownExplanationHint: translate(
      language,
      'panel.testEditor.ownExplanationHint',
    ),

    tooManyOptions: translate(language, 'panel.testEditor.tooManyOptions'),
    tooManyQuestions: translate(language, 'panel.testEditor.tooManyQuestions'),

    noQuestions: translate(language, 'panel.testEditor.noQuestions'),
    noQuestionsHint: translate(language, 'panel.testEditor.noQuestionsHint'),
    addQuestion: translate(language, 'panel.testEditor.addQuestion'),
    noOptions: translate(language, 'panel.testEditor.noOptions'),

    modelExplanation: translate(language, 'panel.testEditor.modelExplanation'),
    takeModelText: translate(language, 'panel.testEditor.takeModelText'),
    doubt: translate(language, 'panel.testEditor.doubt'),
    doubtText: translate(language, 'panel.testEditor.doubtText'),
    changedSinceCheck: translate(
      language,
      'panel.testEditor.changedSinceCheck',
    ),

    studentViewIntro: translate(language, 'panel.testEditor.studentViewIntro'),
    studentViewEmpty: translate(language, 'panel.testEditor.studentViewEmpty'),

    leaveTitle: translate(language, 'panel.testEditor.leaveTitle'),
    leaveText: translate(language, 'panel.testEditor.leaveText'),
    stay: translate(language, 'panel.testEditor.stay'),
    leave: translate(language, 'panel.testEditor.leave'),

    publishTitle: translate(language, 'panel.testEditor.publishTitle'),
    cancel: translate(language, 'panel.testEditor.cancel'),
    firstPublication: translate(language, 'panel.testEditor.firstPublication'),
    newVersion: translate(language, 'panel.testEditor.newVersion'),
    publishChecked: translate(language, 'panel.testEditor.publishChecked'),
    publishUnchecked: translate(language, 'panel.testEditor.publishUnchecked'),
    publishChecking: translate(language, 'panel.testEditor.publishChecking'),
    publishCheckFailed: translate(
      language,
      'panel.testEditor.publishCheckFailed',
    ),

    replaceOwnTitle: translate(language, 'panel.testEditor.replaceOwnTitle'),
    replace: translate(language, 'panel.testEditor.replace'),

    replaceYamlTitle: translate(language, 'panel.testEditor.replaceYamlTitle'),
    replaceYamlUnsaved: translate(
      language,
      'panel.testEditor.replaceYamlUnsaved',
    ),

    hideTitle: translate(language, 'panel.testEditor.hideTitle'),
    hideConfirm: translate(language, 'panel.testEditor.hideConfirm'),

    created: translate(language, 'panel.testEditor.created'),
    saved: translate(language, 'panel.testEditor.saved'),
    checkOrdered: translate(language, 'panel.testEditor.checkOrdered'),
    checkAlreadyReady: translate(
      language,
      'panel.testEditor.checkAlreadyReady',
    ),
    checkReady: translate(language, 'panel.testEditor.checkReady'),
    checkReadyDoubts: translate(language, 'panel.testEditor.checkReadyDoubts'),
    checkFailedTryAgain: translate(
      language,
      'panel.testEditor.checkFailedTryAgain',
    ),
    publishedNow: translate(language, 'panel.testEditor.publishedNow'),
    explanationsComing: translate(
      language,
      'panel.testEditor.explanationsComing',
    ),
    alreadyPublished: translate(
      language,
      'panel.testEditor.alreadyPublished',
    ),
    replacedFromFile: translate(
      language,
      'panel.testEditor.replacedFromFile',
    ),
  }
}

export function questionHeading(language: Language, number: number): string {
  return translate(language, 'panel.testEditor.questionHeading', { number })
}

export function moveQuestionLabel(
  language: Language,
  number: number,
  up: boolean,
): string {
  return translate(language, 'panel.testEditor.moveQuestion', {
    number,
    direction: up ? 'up' : 'down',
  })
}

export function removeQuestionLabel(
  language: Language,
  number: number,
): string {
  return translate(language, 'panel.testEditor.removeQuestion', { number })
}

export function optionTextLabel(language: Language, letter: string): string {
  return translate(language, 'panel.testEditor.optionText', { letter })
}

export function correctLabel(language: Language, letter: string): string {
  return translate(language, 'panel.testEditor.correctOption', { letter })
}

export function moveOptionLabel(
  language: Language,
  letter: string,
  up: boolean,
): string {
  return translate(language, 'panel.testEditor.moveOption', {
    letter,
    direction: up ? 'up' : 'down',
  })
}

export function removeOptionLabel(language: Language, letter: string): string {
  return translate(language, 'panel.testEditor.removeOption', { letter })
}

export function replaceOwnText(language: Language, number: number): string {
  return translate(language, 'panel.testEditor.replaceOwnText', { number })
}

export function replaceYamlText(language: Language, fileName: string): string {
  return translate(language, 'panel.testEditor.replaceYamlText', { fileName })
}

export function hideText(language: Language, title: string): string {
  return translate(language, 'panel.testEditor.hideText', { title })
}
