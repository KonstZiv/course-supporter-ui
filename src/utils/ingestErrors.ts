// Author-facing ingestion / upload error dictionary (DD-SP-D, task-code-materials F4).
//
// ONE map keyed by the backend security ErrorCategory ``.value`` string, serving
// BOTH surfaces (DD-SP-D "one dictionary, two surfaces"):
//   * async failures on the DOCUMENT/JOB rows (error_category), shown in the
//     material card;
//   * synchronous upload rejections (HTTP 400 detail.category) at the upload
//     door (wired through apiError in the follow-up UI commit).
// Texts are product-language (Ukrainian); the course language is deliberately
// NOT used — this is author-facing chrome, not model content.
//
// Fallback rule (DD-SP-D): an unknown or absent category NO LONGER shows the
// raw backend text — it degrades to the generic pipeline_failure phrase, so a
// category the map does not yet cover is still a human sentence, never a raw
// string. This is the structural guard against the two stores drifting apart
// (a cross-store test is not technically possible).

const PIPELINE_FAILURE_MESSAGE =
  'Не вдалося обробити цей матеріал. Спробуйте додати його ще раз; ' +
  'якщо повториться — напишіть нам, ми розберемося.'

const INGEST_ERROR_MESSAGES: Record<string, string> = {
  // ── async ingestion classes ──
  empty_document:
    'Документ не містить видобувного вмісту — не знайдено жодного ' +
    'текстового блоку чи файлу коду для обробки.',
  presentation_empty_segment:
    'Частина слайдів не містить видобувного тексту (лише зображення) — ' +
    'презентацію не вдалося сегментувати.',
  stage2_rejected: 'Матеріал не пройшов перевірку безпеки вмісту.',
  external_source_unavailable:
    'Не вдалося отримати матеріал за посиланням: джерело недоступне або ' +
    'закрите для завантаження. Перевірте посилання й спробуйте ще раз.',
  pipeline_failure: PIPELINE_FAILURE_MESSAGE,
  // ── synchronous upload-rejection classes (author sync door) ──
  suspicious_unicode:
    'У тексті знайдено невидимі службові символи. Найчастіше вони ' +
    'потрапляють при копіюванні з вебсторінки — збережіть файл заново у ' +
    'звичайному текстовому редакторі й спробуйте ще раз.',
  size_limit: 'Файл завеликий. Зменште його або розділіть на частини.',
  forbidden_type: 'Такий тип файлу поки не підтримується.',
  // ── DRAFT texts — awaiting operator ratification (step-v SERVER-CHECKPOINT).
  // Neutral, no accusation: false positives are likely on agentic-Python
  // course materials that legitimately contain example model instructions, so
  // this must never read as "we found a manipulation attempt in your file".
  prompt_injection:
    'Матеріал не пройшов перевірку безпеки вмісту. Якщо ви впевнені, ' +
    'що з матеріалом усе гаразд, напишіть нам — ми перевіримо.',
  magic_mismatch:
    'Вміст файлу не збігається з його розширенням. Перевірте, що файл не ' +
    'пошкоджений, і збережіть його у правильному форматі.',
  // Archives / symbolic links — no technical detail for the author:
  archive_violation:
    'Не вдалося прочитати архів. Можливо, він пошкоджений — ' +
    'спробуйте створити його заново.',
  archive_bomb:
    'Архів завеликий у розпакованому вигляді. Зменште його й спробуйте ще раз.',
  symlink_violation:
    'Архів містить символьні посилання, які не підтримуються. Приберіть їх ' +
    'і спробуйте ще раз.',
  slide_count_limit:
    'У презентації забагато слайдів. Розділіть її на частини й завантажте ' +
    'кожну окремо.',
}

/**
 * Resolve the author-facing message for an ingestion / upload failure category.
 *
 * Category-first (stable code → stable text); an unknown or absent category
 * degrades to the generic pipeline_failure phrase — never a raw backend string
 * (DD-SP-D fallback rule).
 */
export function ingestErrorMessage(
  errorCategory: string | null | undefined,
): string {
  if (errorCategory && INGEST_ERROR_MESSAGES[errorCategory]) {
    return INGEST_ERROR_MESSAGES[errorCategory]
  }
  return PIPELINE_FAILURE_MESSAGE
}
