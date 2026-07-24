// №21 A-UI-1: content + persistence for the file-role confirm screen's
// educational block. Kept out of the component file so the module exports only
// data/helpers (react-refresh: a component file exports only components) —
// mirrors the uploadConfirmMeta.ts ↔ UploadConfirmDialog.tsx split.
//
// ALL author-facing copy lives in ``ROLES_INTRO`` — a single place for point
// edits. Text is operator-approved and reproduced verbatim; the confirm screen
// renders it both as an acknowledge-gated first-visit modal and as a voluntary
// reopen via the permanent «Навіщо це?» link.
export const ROLES_INTRO = {
  title: 'Навіщо це?',
  paragraphs: [
    'Лише ви точно знаєте, які файли цього розділу є ключовими для навчання ' +
      'студента, а які — допоміжні: створюють робоче середовище або просто ' +
      'змушують проєкт працювати. Коли система зосереджена на ключових файлах, ' +
      'вона краще розуміє ваш задум: саме повні файли формують знання Ментора і ' +
      'перелік понять уроку.',
    'Чому не варто розширювати набір повних файлів без потреби? Окрім ' +
      'розмивання уваги системи, це прямі витрати — ваші або ваших студентів: ' +
      'що більше матеріалу системі доводиться опрацьовувати, то дорожчими ' +
      'стають і підготовка курсу, і перевірка домашніх робіт. Але це не заклик ' +
      'різати все — залишайте повним усе, що справді стосується теми цього ' +
      'заняття.',
  ],
  important:
    'Важливо: розмітка стосується лише внутрішнього уявлення системи про ' +
    'курс. Студент завантажує повний архів без жодних скорочень.',
  strategyHeading: 'Найкраща стратегія:',
  strategy: [
    'файли, що не пройшли перевірку безпеки, і вміст службових тек система ' +
      'вилучила ще під час розпакування — їх не можна ані побачити, ані повернути;',
    'у повному обсязі залишайте те, що розкриває основні ідеї цього розділу;',
    'як допоміжні позначайте файли, створені вами в межах проєкту, але не ' +
      'центральні для теми заняття: система знатиме, що вони другорядні — ' +
      'жодне їхнє поняття не стане основним поняттям уроку, а Ментор триматиме ' +
      'їх лише як довідковий фон;',
    'несуттєвими для теми позначайте автоматично сформовані файли, стандартні ' +
      'бібліотеки, тривіальні файли: система чудово розуміє їхню роль і вміст — ' +
      'у курсі залишиться лише згадка в дереві проєкту.',
  ],
  ackLabel: 'Прочитав, зрозуміло',
  closeLabel: 'Закрити',
} as const

// Persistence carrier for the "already seen" flag. localStorage is the ONLY
// option today: there is no backend profile/preferences store (confirmed by
// probe). NOTE — this carrier is temporary and PER-DEVICE: the flag does NOT
// sync across devices or browsers, and is lost when the user clears site
// storage. A durable cross-device flag would need a backend profile field
// (a separate, out-of-scope decision).
const SEEN_KEY = 'cs_roles_intro_seen'

export function hasSeenRolesIntro(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === '1'
  } catch {
    // Storage blocked (private mode) — treat as "not seen"; the modal reappears.
    return false
  }
}

export function markRolesIntroSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, '1')
  } catch {
    // Storage unavailable — acceptable: the informational block simply shows
    // again next visit.
  }
}
