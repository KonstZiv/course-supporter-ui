import { formatDateTime } from './dateTime'

// The label shown IN PLACE OF a deleted material's name (ARC §7 Г3 / Р7). The
// server scrubs the name to a marker that embeds a machine timestamp; the show
// never reads that field — these functions take NO name, so the server signature
// has no path inside. The WORDS are fixed (Г3). The history page lays those same
// words out as TWO lines (Г9) — the FACT above, the AUTHOR + MOMENT below, smaller
// and dimmer — so the marker's natural width falls to a normal name's WITHOUT
// shortening the text. Distinct forms for distinct consumers, deliberately not one
// flag-driven function (a flag grows a third value over time):
//   * short       — the FACT: the activity strip (its row already carries its own
//                   moment) AND the history page's first line.
//   * author line — "автором <date>": the history page's second line only.
//   * full        — the two joined; the canonical verbatim the two-line split must
//                   equal (nothing renders it as one line anymore, but it stays the
//                   single source of the exact words).

/**
 * The FACT of deletion: "Матеріал видалено", no date. The strip form, and the
 * first of the history page's two lines.
 */
export function deletedMaterialLabelShort(): string {
  return 'Матеріал видалено'
}

/**
 * History line two — author + the exact deletion moment in the author's language:
 * "автором 8 серпня 2026, 14:30". Takes the moment only, never the scrubbed name.
 */
export function deletedMaterialAuthorLine(deletedAtIso: string): string {
  return `автором ${formatDateTime(deletedAtIso)}`
}

/**
 * The full one-line verbatim: "Матеріал видалено автором 8 серпня 2026, 14:30".
 * The canonical words — the history page renders these SAME words as two lines
 * (short + author line, Г9); this joined form stays the truth the split equals.
 */
export function deletedMaterialLabelFull(deletedAtIso: string): string {
  return `${deletedMaterialLabelShort()} ${deletedMaterialAuthorLine(deletedAtIso)}`
}
