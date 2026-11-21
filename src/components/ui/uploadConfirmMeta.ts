// Shared non-component exports of the «Тип документа» dialog (kept out of
// UploadConfirmDialog.tsx so react-refresh sees a components-only file).

import type { Language } from '../../i18n/languages'
import { translate } from '../../i18n/translate'
import type { AssignmentType } from '../../types/api'

export function taskTypeOptions(language: Language): {
  value: AssignmentType
  label: string
  hint: string
}[] {
  return [
    {
      value: 'test',
      label: translate(language, 'panel.upload.taskType.test.label'),
      hint: translate(language, 'panel.upload.taskType.test.hint'),
    },
    {
      value: 'short_task',
      label: translate(language, 'panel.upload.taskType.shortTask.label'),
      hint: translate(language, 'panel.upload.taskType.shortTask.hint'),
    },
    {
      value: 'task',
      label: translate(language, 'panel.upload.taskType.task.label'),
      hint: translate(language, 'panel.upload.taskType.task.hint'),
    },
    {
      value: 'project',
      label: translate(language, 'panel.upload.taskType.project.label'),
      hint: translate(language, 'panel.upload.taskType.project.hint'),
    },
  ]
}

export function formatAudioDuration(seconds: number): string {
  const total = Math.floor(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => n.toString().padStart(2, '0')
  return h > 0 ? `[${h}:${pad(m)}:${pad(s)}]` : `[${pad(m)}:${pad(s)}]`
}
