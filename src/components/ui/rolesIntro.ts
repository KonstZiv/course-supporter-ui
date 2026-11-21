// №21 A-UI-1: content + persistence for the file-role confirm screen's
// educational block. Kept out of the component file so the module exports only
// data/helpers (react-refresh: a component file exports only components) —
// mirrors the uploadConfirmMeta.ts ↔ UploadConfirmDialog.tsx split.
//
// ALL author-facing copy lives in ``ROLES_INTRO`` — a single place for point
// edits. screenLead was approved separately on 2026-11-04.
// Text is operator-approved and reproduced verbatim; the confirm screen
// renders it both as an acknowledge-gated first-visit modal and as a voluntary
// reopen via the permanent «Навіщо це?» link.
import { STORAGE_KEYS } from '../../privacy/surface'
import type { Language } from '../../i18n/languages'
import { translate } from '../../i18n/translate'

export function rolesIntro(language: Language) {
  return {
    screenLead: [
      translate(language, 'panel.rolesIntro.screenLead1'),
      translate(language, 'panel.rolesIntro.screenLead2'),
    ],
    title: translate(language, 'panel.rolesIntro.title'),
    paragraphs: [
      translate(language, 'panel.rolesIntro.paragraph1'),
      translate(language, 'panel.rolesIntro.paragraph2'),
    ],
    important: translate(language, 'panel.rolesIntro.important'),
    strategyHeading: translate(language, 'panel.rolesIntro.strategyHeading'),
    strategy: [
      translate(language, 'panel.rolesIntro.strategy1'),
      translate(language, 'panel.rolesIntro.strategy2'),
      translate(language, 'panel.rolesIntro.strategy3'),
      translate(language, 'panel.rolesIntro.strategy4'),
    ],
    ackLabel: translate(language, 'panel.rolesIntro.ackLabel'),
    closeLabel: translate(language, 'panel.rolesIntro.closeLabel'),
  }
}

// Persistence carrier for the "already seen" flag. localStorage is the ONLY
// option today: there is no backend profile/preferences store (confirmed by
// probe). NOTE — this carrier is temporary and PER-DEVICE: the flag does NOT
// sync across devices or browsers, and is lost when the user clears site
// storage. A durable cross-device flag would need a backend profile field
// (a separate, out-of-scope decision).
const SEEN_KEY = STORAGE_KEYS.rolesIntroSeen

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
