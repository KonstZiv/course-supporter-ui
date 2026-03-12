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
    default:
      return { label: type, icon: 'File', color: 'text-ink-muted' }
  }
}
