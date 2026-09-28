/**
 * The test editor's own words (task 07c) — PRE-FLIGHT §21.1–§21.3 as
 * vision-side proofread them, word for word, in one place. The words of
 * refusals and of unfinished places are ``utils/testRefusals.ts``.
 */

export const TEXTS = {
  newTest: 'Новий тест',
  back: 'До курсу',

  published: 'Опубліковано',
  publishedHint: 'Студенти бачать цю версію тесту',
  notPublished: 'Не опубліковано',
  unpublishedChanges: 'Є неопубліковані зміни',
  unpublishedChangesHint:
    'Чернетка відрізняється від версії, яку бачать студенти',

  notChecked: 'Не перевірено моделлю',
  checking: 'Перевірка йде…',
  checked: 'Перевірено моделлю',
  checkFailed: 'Перевірка не вдалася',

  unsaved: 'Є незбережені зміни',
  saving: 'Зберігаю…',
  allSaved: 'Усі зміни збережено',

  save: 'Зберегти чернетку',
  nothingToSave: 'Немає змін',
  check: 'Перевірити моделлю',
  ordering: 'Замовляю перевірку…',
  publish: 'Опублікувати',
  publishing: 'Публікую…',

  saveTestFirst: 'Спершу збережіть тест.',
  saveChangesFirst: 'Спершу збережіть зміни.',
  finishFirst:
    'Щоб перевірити чи опублікувати тест, завершіть позначені місця.',
  alreadyChecked: 'Чернетку вже перевірено.',
  nothingToPublish: 'Змін після публікації немає.',

  editView: 'Правка',
  studentView: 'Як бачить студент',

  exportYaml: 'Вивантажити YAML',
  replaceYaml: 'Замінити з YAML…',
  hide: 'Приховати тест',

  title: 'Назва тесту',
  titleHint:
    'Під цією назвою студенти побачать тест у курсі. Нова назва діє одразу ' +
    'після збереження, без публікації.',
  passThreshold: 'Поріг заліку, %',
  passThresholdHint:
    "Необов'язково. Якщо задати, студент побачить «зараховано» чи «не " +
    'зараховано»; без порогу — лише бал.',

  questionText: 'Текст питання',
  options: 'Варіанти відповіді',
  correct: 'правильна',
  addOption: 'Додати варіант',
  addOwnExplanation: 'Додати власне пояснення',
  ownExplanation: 'Власне пояснення',
  removeOwnExplanation: 'Прибрати власне пояснення',
  ownExplanationHint:
    'Студент побачить його замість пояснення моделі — навіть коли модель ' +
    'сумнівається.',

  tooManyOptions: 'У питанні може бути не більше 26 варіантів.',
  tooManyQuestions: 'У тесті може бути не більше 200 питань.',

  noQuestions: 'Питань ще немає',
  noQuestionsHint:
    'Додайте перше питання: текст, варіанти відповіді й позначку правильних.',
  addQuestion: 'Додати питання',
  noOptions: 'Варіантів ще немає. Додайте щонайменше два й позначте правильний.',

  modelExplanation: 'Пояснення моделі',
  takeModelText: 'Взяти текст моделі за основу',
  doubt: 'Сумнів моделі',
  doubtText:
    'Модель сумнівається в позначках правильних відповідей до цього питання. ' +
    'Перевірте їх: якщо змінити позначки й перевірити знову, модель оцінить їх ' +
    'наново. Якщо позначки правильні, напишіть власне пояснення — студент ' +
    'побачить саме його, бо пояснення моделі до питання із сумнівом студентові ' +
    'не показується.',
  changedSinceCheck:
    'Ви змінили питання, варіанти чи позначки — після збереження тест треба ' +
    'буде перевірити знову.',

  studentViewIntro:
    'Так студенти побачать тест після публікації: без позначок правильних ' +
    'варіантів і без пояснень.',
  studentViewEmpty: 'У тесті ще немає питань.',

  // §21.2 — windows.
  leaveTitle: 'Піти без збереження?',
  leaveText: 'Зміни в тесті не збережено — їх буде втрачено.',
  stay: 'Лишитися',
  leave: 'Піти без збереження',

  publishTitle: 'Опублікувати тест?',
  cancel: 'Скасувати',
  firstPublication: 'Тест побачать студенти курсу.',
  newVersion:
    'Студенти побачать нову версію тесту. Спроби, які вже зроблено, лишаться ' +
    'з тими оцінками, які отримали.',
  publishChecked: 'Пояснення моделі вже готові.',
  publishUnchecked:
    'Чернетку не перевірено моделлю: ви ще не бачили її пояснень і сумнівів. ' +
    "Пояснення з'являться за кілька хвилин після публікації; хто пройде тест " +
    'раніше, отримає оцінку без них.',
  publishChecking:
    "Перевірка ще триває. Пояснення з'являться за кілька хвилин; хто пройде " +
    'тест раніше, отримає оцінку без них.',
  publishCheckFailed:
    'Перевірка моделлю не вдалася. Публікація замовить пояснення ще раз; хто ' +
    'пройде тест до того, отримає оцінку без них.',

  replaceOwnTitle: 'Замінити власне пояснення?',
  replace: 'Замінити',

  replaceYamlTitle: 'Замінити чернетку файлом?',
  replaceYamlUnsaved: 'Незбережені зміни теж буде втрачено.',

  hideTitle: 'Приховати тест?',
  hideConfirm: 'Приховати',

  // §21.3 — what an action did.
  created:
    'Тест створено. Студенти не побачать його, доки ви його не опублікуєте.',
  saved: 'Чернетку збережено.',
  checkOrdered:
    "Перевірку замовлено: пояснення й сумніви моделі з'являться біля питань " +
    'за хвилину-дві.',
  checkAlreadyReady: 'Чернетку вже перевірено: пояснення моделі — біля питань.',
  checkReady: 'Пояснення моделі готові: їх показано біля питань.',
  checkReadyDoubts: 'Щодо деяких питань модель має сумнів — їх позначено.',
  checkFailedTryAgain: 'Перевірка не вдалася. Спробуйте перевірити ще раз.',
  publishedNow: 'Опубліковано: студенти бачать цю версію тесту.',
  explanationsComing: "Пояснення моделі з'являться за кілька хвилин.",
  alreadyPublished: 'Ця чернетка вже опублікована — нічого не змінилося.',
  replacedFromFile: 'Чернетку замінено вмістом файла.',
} as const

export function questionHeading(number: number): string {
  return `Питання ${number}`
}

export function moveQuestionLabel(number: number, up: boolean): string {
  return `Перемістити питання ${number} ${up ? 'вище' : 'нижче'}`
}

export function removeQuestionLabel(number: number): string {
  return `Прибрати питання ${number}`
}

export function optionTextLabel(letter: string): string {
  return `Текст варіанта ${letter}`
}

export function correctLabel(letter: string): string {
  return `Варіант ${letter} — правильна відповідь`
}

export function moveOptionLabel(letter: string, up: boolean): string {
  return `Перемістити варіант ${letter} ${up ? 'вище' : 'нижче'}`
}

export function removeOptionLabel(letter: string): string {
  return `Прибрати варіант ${letter}`
}

export function replaceOwnText(number: number): string {
  return (
    `Текст моделі замінить ваше власне пояснення до питання ${number}. Зміну ` +
    'буде збережено разом із чернеткою.'
  )
}

export function replaceYamlText(fileName: string): string {
  return (
    'Питання, варіанти, позначки, поріг і власні пояснення буде замінено ' +
    `вмістом файла «${fileName}». Якщо у файлі є назва, тест отримає її. ` +
    'Опублікована версія не зміниться, доки ви не опублікуєте тест знову.'
  )
}

export function hideText(title: string): string {
  return (
    `Студенти більше не побачать тест «${title}» у курсі. Спроби, які вже ` +
    'зроблено, збережуться. Скасувати приховування в програмі автора не можна.'
  )
}
