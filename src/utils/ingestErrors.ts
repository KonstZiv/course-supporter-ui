// Async ingestion error map (task-code-materials commit 7, F4 / DD-2.3-AH).
//
// Async failures live on the DOCUMENT/JOB rows (error_category +
// error_message), not in an HTTP 4xx body — so baseErrors.ts /
// submissionCodes.ts (sync detail.code readers) deliberately do NOT
// transfer here. The category values mirror the backend security
// ErrorCategory (.value strings) persisted by the failure callback;
// unknown/NULL categories fall back to the raw backend error_message.

const INGEST_ERROR_MESSAGES: Record<string, string> = {
  empty_document:
    'Документ не містить видобувного вмісту — не знайдено жодного ' +
    'текстового блоку чи файлу коду для обробки.',
  presentation_empty_segment:
    'Частина слайдів не містить видобувного тексту (лише зображення) — ' +
    'презентацію не вдалося сегментувати.',
  stage2_rejected:
    'Матеріал відхилено перевіркою безпеки вмісту.',
  archive_violation:
    'Архів порушує структурні обмеження (розмір розпакування, вкладеність ' +
    'або пошкоджена структура).',
}

/**
 * Resolve the author-facing message for an async ingestion failure.
 * Category-first (stable code → stable text), raw error_message as the
 * fallback so an uncategorised legacy failure is never blank.
 */
export function ingestErrorMessage(
  errorCategory: string | null | undefined,
  errorMessage: string | null | undefined,
): string {
  if (errorCategory && INGEST_ERROR_MESSAGES[errorCategory]) {
    return INGEST_ERROR_MESSAGES[errorCategory]
  }
  return errorMessage || 'Обробка завершилася помилкою.'
}
