// A student's comment on a submission (hotfix 6).
//
// The server refuses a comment longer than this with STUDENT_NOTE_TOO_LONG. No
// route serves the number, so it is written here by hand: it mirrors
// ``STUDENT_NOTE_MAX_CHARS`` in the backend's ``homework/submission_core.py``.
export const STUDENT_NOTE_MAX_CHARS = 2000

// The length the server will count: code points of the trimmed text. An emoji
// is one, where ``.length`` counts two UTF-16 units; a line break is one — a
// textarea holds it as "\n", and the server counts the "\r\n" a multipart form
// turns it into as one as well. The form sends exactly this trimmed text.
export function noteLength(note: string): number {
  return [...note.trim()].length
}

// "2 000": thousands grouped with a no-break space, so a number never breaks
// across two lines. Written out rather than left to ``toLocaleString``, whose
// separator depends on the ICU data of the browser.
export function formatCount(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0')
}
