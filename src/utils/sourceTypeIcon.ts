/** Map source_type to a human label and Lucide icon name. */
export function sourceTypeMeta(type: string) {
  switch (type) {
    case 'video':
      return { label: 'Відео', icon: 'Video', color: 'text-coral' }
    case 'presentation':
      return { label: 'Презентація', icon: 'FileImage', color: 'text-plum' }
    case 'text':
      return { label: 'Текст', icon: 'FileText', color: 'text-navy' }
    case 'web':
      return { label: 'Веб', icon: 'Globe', color: 'text-forest' }
    case 'audio':
      return { label: 'Аудіо', icon: 'AudioLines', color: 'text-amber' }
    case 'code':
      // Neutral (no 6th chromatic hue in the palette), but the STRONG neutral
      // ``text-ink`` (#1A1A2E) — noticeably darker than the unknown-default
      // ``text-ink-muted`` (#8A8A9A), so a deleted code material stays readable by
      // its icon alone (Р7 / step-Г visual pass Г8).
      return { label: 'Код', icon: 'FileCode', color: 'text-ink' }
    default:
      return { label: type, icon: 'File', color: 'text-ink-muted' }
  }
}
