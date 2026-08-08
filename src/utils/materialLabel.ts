import { formatDateTime } from './dateTime'

// The label shown IN PLACE OF a deleted material's name (ARC §7 Г3 / Р7). The
// server scrubs the name to a marker that embeds a machine timestamp; the show
// never reads that field — these functions take NO name, so the server signature
// has no path inside. Two DISTINCT forms for two consumers, deliberately not one
// flag-driven function (a flag grows a third value over time):
//   * full  — the history page, where the row IS the material: adds the exact
//             deletion moment in the author's language.
//   * short — the activity strip, where the row already carries its own moment
//             (when the work ran); a second date beside it would read as one.

/**
 * History form: "Матеріал видалено автором 8 серпня 2026, 14:30".
 * Takes the deletion moment only — never the scrubbed name.
 */
export function deletedMaterialLabelFull(deletedAtIso: string): string {
  return `Матеріал видалено автором ${formatDateTime(deletedAtIso)}`
}

/** Strip form: "Матеріал видалено", no date. */
export function deletedMaterialLabelShort(): string {
  return 'Матеріал видалено'
}
