// Human names for the encoding a submitted file was recovered from (§2.2).
//
// A fourth dictionary, kept out of `rejectionReasons.ts` on purpose: that
// module's own header names three axes, all of them "why did something not
// happen". This one is not a reason at all — it is a display name for a fact
// about a file that WAS read.
//
// Keys are what `charset_normalizer` names on the server. The set is short by
// design: a name is only worth having when it tells the student something
// their file explorer or editor also says. Everything else falls through to
// the raw token in parentheses, which is still an answer — "we read it as
// KOI8-R" is useful to someone who recognises it and harmless to someone who
// does not. Silence there would be worse: the student would read that the
// encoding was "recognised" and never learn as what.

const ENCODING_NAMES: Record<string, string> = {
  // The one that actually happens on this platform: files saved by Windows
  // editors in a Cyrillic locale, which is most of what Ukrainian- and
  // Russian-language courses receive.
  cp1251: 'Windows, кирилиця',
  windows_1251: 'Windows, кирилиця',
  'windows-1251': 'Windows, кирилиця',
  // Same bytes, different name in the library's table — the server merges
  // encodings that produce identical text, and which name wins depends on the
  // file. Naming both keeps one text from having two answers.
  kz1048: 'Windows, кирилиця',
  cp1252: 'Windows, західноєвропейська',
  'windows-1252': 'Windows, західноєвропейська',
  cp1250: 'Windows, центральноєвропейська',
  'windows-1250': 'Windows, центральноєвропейська',
  cp866: 'DOS, кирилиця',
  ibm866: 'DOS, кирилиця',
  'koi8-r': 'KOI8, кирилиця',
  'koi8-u': 'KOI8, українська',
  koi8_r: 'KOI8, кирилиця',
  koi8_u: 'KOI8, українська',
  'iso-8859-5': 'ISO, кирилиця',
  'iso-8859-1': 'ISO, західноєвропейська',
  'iso-8859-2': 'ISO, центральноєвропейська',
  mac_cyrillic: 'Mac, кирилиця',
  maccyrillic: 'Mac, кирилиця',
  'utf-16': 'UTF-16',
  'utf-16le': 'UTF-16',
  'utf-16be': 'UTF-16',
  'utf-8-sig': 'UTF-8 з міткою порядку байтів',
}

/**
 * Display name for a recovered encoding, or the raw token in parentheses.
 *
 * Lookup is case-insensitive because the token crosses the wire as whatever
 * the detector called it, and casing is the one difference that carries no
 * meaning.
 */
export function encodingDisplayName(encoding: string): string {
  return ENCODING_NAMES[encoding.toLowerCase()] ?? `(${encoding})`
}

/**
 * Whether the student needs told anything about how their file was read.
 *
 * `utf-8` means it decoded directly — the ordinary case, and saying so would
 * be noise on every single submission. `null` / empty means the question does
 * not apply: an archive recovers its members one at a time and a document
 * arrives already decoded, so neither has one answer to give. Only a third
 * value — a real encoding name — is worth a sentence.
 */
export function shouldReportEncoding(encoding: string | null): boolean {
  return encoding !== null && encoding !== '' && encoding.toLowerCase() !== 'utf-8'
}
