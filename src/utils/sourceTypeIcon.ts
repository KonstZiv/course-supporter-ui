import type { Language } from '../i18n/languages'
import { translate } from '../i18n/translate'

/** Map source_type to a human label and Lucide icon name. */
export function sourceTypeMeta(language: Language, type: string) {
  switch (type) {
    case 'video':
      return { label: translate(language, 'panel.sourceType.video'), icon: 'Video', color: 'text-coral' }
    case 'presentation':
      return { label: translate(language, 'panel.sourceType.presentation'), icon: 'FileImage', color: 'text-plum' }
    case 'text':
      return { label: translate(language, 'panel.sourceType.text'), icon: 'FileText', color: 'text-navy' }
    case 'web':
      return { label: translate(language, 'panel.sourceType.web'), icon: 'Globe', color: 'text-forest' }
    case 'audio':
      return { label: translate(language, 'panel.sourceType.audio'), icon: 'AudioLines', color: 'text-amber' }
    case 'code':
      // Neutral (no 6th chromatic hue in the palette), but the STRONG neutral
      // ``text-ink`` (#1A1A2E) — noticeably darker than the unknown-default
      // ``text-ink-muted`` (#62627A), so a deleted code material stays readable by
      // its icon alone (Р7 / step-Г visual pass Г8).
      return { label: translate(language, 'panel.sourceType.code'), icon: 'FileCode', color: 'text-ink' }
    case 'test_object':
      // The same strong neutral as code: the palette has no chromatic hue
      // left for a seventh kind (task 07c).
      return { label: translate(language, 'panel.sourceType.testObject'), icon: 'ListChecks', color: 'text-ink' }
    default:
      return { label: type, icon: 'File', color: 'text-ink-muted' }
  }
}
